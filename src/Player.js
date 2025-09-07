// Player.js - Player character logic and physics

import { GAME_CONFIG } from "./GameConfig.js";

export class Player {
  constructor() {
    this.sprite = null;
    this.cursors = null;
    this.keysAD = null;
    this.spaceKey = null;
    this._wasGrounded = false;
    this._lastAirVX = 0;
    this._lockedAirVX = 0;
    this._lastPlatformX = null;
    this._lastPlatformY = null;
    this._iceSlideTimer = 0;
    this._iceSlideDirection = 0;
    
    // Manual animation control
    this._animationTimer = 0;
    this._currentFrame = 0;
    this._frameDelay = 60; // frames between animation changes (60 = 1 second at 60fps)
    this._currentSpriteState = 'idle'; // Track current animation state (changed from 'stand')
    this._groundedBuffer = 0; // Buffer to stabilize grounded detection for animations
  }

  initialize(scene, startX, startY) {
    // Create player sprite using the standing sprite
    this.sprite = scene.physics.add.sprite(startX, startY, "stand");
    this.sprite.name = "player"; // Add name for easy finding

    // Physics body sized to exact bigger rectangle
    // Force the physics body to be bigger for easier collision detection
    this.sprite.body.setSize(120, 400); // Doubled height from 200 to 400
    this.sprite.body.setOffset(
      (this.sprite.width - 120) / 2,  // Center horizontally
      this.sprite.height - 400        // Align bottom
    );
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDragX(GAME_CONFIG.GROUND_DRAG_X);
    this.sprite.setMaxVelocity(GAME_CONFIG.MAX_SPEED_X, 2500);

    // Scale ONLY the visual display to fit within the physics body rectangle
    // This doesn't affect physics at all, just how the image looks
    const targetWidth = 40;  // Smaller image (was 60)
    const targetHeight = 50; // Smaller image (was 80)
    this.sprite.setDisplaySize(targetWidth, targetHeight);

    // Create animations if they don't exist
    this.createAnimations(scene);

    // Enable debug rendering for the physics body (green hitbox)
    // this.sprite.body.debugShowBody = true;
    // this.sprite.body.debugBodyColor = 0x00ff00; // Green color

    // Input setup
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keysAD = scene.input.keyboard.addKeys({ left: "A", right: "D" });
    this.spaceKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Initial upward velocity
    this.sprite.setVelocityY(-480);

    return this.sprite;
  }

  createAnimations(scene) {
    // Create walking left animation with multiple frames
    if (!scene.anims.exists('walk-left')) {
      scene.anims.create({
        key: 'walk-left',
        frames: [
          { key: 'left1' },
          { key: 'left2' }
        ],
        frameRate: 8, // Faster animation for smoother walking
        repeat: -1
      });
    }

    // Create walking right animation with multiple frames
    if (!scene.anims.exists('walk-right')) {
      scene.anims.create({
        key: 'walk-right',
        frames: [
          { key: 'right1' },
          { key: 'right2' }
        ],
        frameRate: 8, // Faster animation for smoother walking
        repeat: -1
      });
    }

    // Create idle/standing animation (just one frame)
    if (!scene.anims.exists('idle')) {
      scene.anims.create({
        key: 'idle',
        frames: [{ key: 'stand' }],
        frameRate: 1,
        repeat: 0
      });
    }
  }

  update(audioSystem = null) {
    if (!this.sprite) return;

    const leftPressed = this.cursors.left.isDown || this.keysAD.left.isDown;
    const rightPressed = this.cursors.right.isDown || this.keysAD.right.isDown;
    const grounded = this.sprite.body.blocked.down;

    // Track last air horizontal velocity
    if (!grounded) {
      this._lastAirVX = this.sprite.body.velocity.x;
    }


    // Custom friction and speed scaling: if grounded, check platform under player
    let friction = 1.0;
    let speedScale = 1.0;
    let onLowFriction = false;
    let currentPlatform = null;
    
    if (grounded) {
      const scene = this.sprite.scene;
      // Use the same platform detection method as ScoringSystem
      if (scene && scene.scoringSystem) {
        const platformInfo = scene.scoringSystem.getCurrentPlatform(this, scene);
        friction = platformInfo.friction;
        currentPlatform = platformInfo.platform;
        
        // Apply friction-based speed and max speed scaling for all platform types
        if (friction < 0.7) {
          // Ice platforms: slippery, moderate speed increase, harder to control (reduced speed boost)
          speedScale = 1.3 + (0.7 - friction) * 0.8; // Further reduced from 1.6 + 1.2 multiplier
          onLowFriction = true;
        } else if (friction > 1.2) {
          // Dirt platforms: high friction, significantly reduced speed for realism
          speedScale = Math.max(0.3, 1.5 - friction); // Much slower on high friction (0.3x at friction 1.2, even slower at higher friction)
        } else {
          // Stone platforms: medium friction, moderately reduced speed
          speedScale = Math.max(0.5, 1.2 - friction * 0.4); // Moderate reduction based on friction
        }
        
        // Debug logging
        if (Math.random() < 0.01) { // Log occasionally to avoid spam
          console.log(`Platform detected: friction=${friction.toFixed(2)}, speedScale=${speedScale.toFixed(2)}, type=${platformInfo.platformType || 'unknown'}`);
        }
      }
      // Apply more aggressive drag on high friction platforms
      if (friction > 1.2) {
        this.sprite.setDragX(GAME_CONFIG.GROUND_DRAG_X * friction * 2.0); // Double the drag effect for high friction
      } else if (friction < 0.7) {
        // Ice platforms: much lower drag to allow sliding
        this.sprite.setDragX(GAME_CONFIG.GROUND_DRAG_X * friction * 0.1); // Reduce drag significantly for ice
      } else {
        this.sprite.setDragX(GAME_CONFIG.GROUND_DRAG_X * friction);
      }
    } else {
      this.sprite.setDragX(GAME_CONFIG.AIR_DRAG_X * 0.5); // Reduce air drag for better control
    }

    // Ground movement with friction-based speed scaling
    const baseSpeed = GAME_CONFIG.MOVE_SPEED * 0.8; // Base speed multiplier
    const moveSpeed = baseSpeed * speedScale; // Apply friction-based scaling
    
    // Debug logging for speed calculation
    if (grounded && (leftPressed || rightPressed) && Math.random() < 0.05) {
      console.log(`Speed calc: baseSpeed=${baseSpeed.toFixed(1)}, speedScale=${speedScale.toFixed(2)}, moveSpeed=${moveSpeed.toFixed(1)}, friction=${friction.toFixed(2)}`);
    }
    
    // Max speed is significantly affected by friction
    let maxSpeedMultiplier;
    if (friction < 0.7) {
      // Ice: higher max speed but more controlled (reduced multiplier)
      maxSpeedMultiplier = speedScale * 0.65; // Reduced from 0.8 to make ice less wild
    } else if (friction > 1.2) {
      // Dirt: dramatically reduced max speed - high friction makes you very slow
      maxSpeedMultiplier = Math.max(0.2, 0.8 - (friction - 1.0)); // Very low max speed on high friction
    } else {
      // Stone: moderate max speed reduction
      maxSpeedMultiplier = Math.max(0.4, 0.9 - friction * 0.3);
    }
    
    const maxSpeedX = GAME_CONFIG.MAX_SPEED_X * maxSpeedMultiplier;
    this.sprite.setMaxVelocity(maxSpeedX, 2500);

    // Immediately clamp current velocity to the new max speed if grounded
    if (grounded) {
      const currentVX = this.sprite.body.velocity.x;
      if (Math.abs(currentVX) > maxSpeedX) {
        this.sprite.setVelocityX(Math.sign(currentVX) * maxSpeedX);
      }
    }

    if (grounded) {
      if (leftPressed || rightPressed) {
        // Reset ice sliding when player provides input
        this._iceSlideTimer = 0;
        
        if (leftPressed) {
          const clampedSpeed = Math.min(moveSpeed, maxSpeedX);
          this.sprite.setVelocityX(-clampedSpeed);
          this._lockedAirVX = -clampedSpeed * 0.8; // Reduce initial air velocity for better control
          
          // Debug: log actual velocity being set - always log for left movement
          console.log(`Setting LEFT velocity: ${-clampedSpeed.toFixed(1)} (moveSpeed=${moveSpeed.toFixed(1)}, maxSpeedX=${maxSpeedX.toFixed(1)}) - Actual velocity after set: ${this.sprite.body.velocity.x.toFixed(1)}`);
        } else if (rightPressed) {
          const clampedSpeed = Math.min(moveSpeed, maxSpeedX);
          this.sprite.setVelocityX(clampedSpeed);
          this._lockedAirVX = clampedSpeed * 0.8; // Reduce initial air velocity for better control
          
          // Debug: log actual velocity being set  
          if (Math.random() < 0.05) {
            console.log(`Setting RIGHT velocity: ${clampedSpeed.toFixed(1)} (moveSpeed=${moveSpeed.toFixed(1)}, maxSpeedX=${maxSpeedX.toFixed(1)})`);
          }
        }
      } else {
        // Handle ice sliding behavior (independent of platform detection)
        if (this._iceSlideTimer > 0) {
          // Stop sliding if player starts falling or makes any input
          const isFalling = this.sprite.body.velocity.y > 5; // Small threshold to avoid micro-movements
          const hasInput = leftPressed || rightPressed;
          
          if (isFalling || hasInput) {
            this._iceSlideTimer = 0;
            if (hasInput) {
              console.log(`Ice sliding stopped due to player input`);
            } else if (isFalling) {
              console.log(`Ice sliding stopped due to falling (vy=${this.sprite.body.velocity.y.toFixed(1)})`);
            }
          } else {
            this._iceSlideTimer--;
            const slideForce = (moveSpeed * GAME_CONFIG.ICE_SLIDE_FORCE) * this._iceSlideDirection;
            let currentVX = this.sprite.body.velocity.x;
            
            // Debug logging for slide force
            if (Math.random() < 0.02) {
              console.log(`Applying ice slide: force=${slideForce.toFixed(2)}, currentVX=${currentVX.toFixed(2)}, timer=${this._iceSlideTimer}`);
            }
            
            currentVX += slideForce;
            // Clamp to max speed
            currentVX = Phaser.Math.Clamp(currentVX, -maxSpeedX, maxSpeedX);
            this.sprite.setVelocityX(currentVX);
            
            // Occasionally change slide direction (if enabled)
            if (Math.random() < GAME_CONFIG.ICE_DIRECTION_CHANGE_CHANCE) {
              this._iceSlideDirection *= -1;
              this._iceSlideTimer = Math.random() * 120 + 30; // Reset timer
            }
          }
        }
        
        // Platform-specific behavior when no input and no active sliding
        if (onLowFriction && this._iceSlideTimer === 0) {
          if (!this._wasGrounded) {
            // Just landed on ice: check if we have boot protection
            const scene = this.sprite.scene;
            let shouldSlide = true;
            
            if (scene && scene.scoringSystem && scene.scoringSystem.hasBootSlipPrevention() && currentPlatform) {
              // Use boot to modify ice platform properties to be like dirt
              if (scene.scoringSystem.useBootSlipPrevention()) {
                // Temporarily change ice platform properties to dirt-like
                currentPlatform.friction = 1.2; // Same as dirt
                currentPlatform.damageMultiplier = 0.7; // Same as dirt
                currentPlatform.bootModified = true; // Mark as modified by boot
                
                // Update platform detection for this frame
                friction = 1.2;
                speedScale = Math.max(0.5, 1.2 - friction * 0.4); // Same calculation as dirt
                onLowFriction = false; // No longer low friction
                
                shouldSlide = false;
                
                console.log(`Boot used! Ice platform converted to dirt-like properties. Remaining boots: ${scene.scoringSystem.bootSlipPrevention}`);
                
                // Show ice boot comment when successfully preventing slip on ice
                scene.scoringSystem.showIceBootComment(scene, this.sprite.x, this.sprite.y);
                
                // Show visual feedback for boot protection
                if (scene.cameras && scene.cameras.main) {
                  scene.cameras.main.flash(80, 139, 69, 19, false); // Brown flash for boot protection
                }
              }
            }
            
            if (shouldSlide) {
              // Show slip comment when starting to slide on ice
              const scene = this.sprite.scene;
              if (scene && scene.scoringSystem) {
                scene.scoringSystem.showSlipComment(scene, this.sprite.x, this.sprite.y);
              }
              
              // Slide in direction from previous platform (reduced speed for better control)
              let slideSpeed = Math.min(moveSpeed * 0.2, maxSpeedX * 0.6); // Much lower speed multiplier for landing slide
              let dir = 0;
              if (this._lastPlatformX !== null && currentPlatform) {
                dir = Math.sign(currentPlatform.x - this._lastPlatformX);
                if (dir === 0) dir = 1; // Default to right if perfectly vertical
              } else {
                dir = Math.sign(this._lastAirVX) || 1;
              }
              this.sprite.setVelocityX(slideSpeed * dir);
              this._lockedAirVX = slideSpeed * dir;
              
              // Start random sliding timer (shorter duration)
              this._iceSlideTimer = Math.random() * 120 + 30; // 0.5-2.5 seconds at 60fps (reduced from 1-4 seconds)
              this._iceSlideDirection = Math.random() < 0.5 ? -1 : 1;
            }
          } else {
            // Already on ice platform - check if boots can prevent random sliding
            const scene = this.sprite.scene;
            let canStartRandomSlide = true;
            
            if (scene && scene.scoringSystem && scene.scoringSystem.hasBootSlipPrevention() && currentPlatform && !currentPlatform.bootModified) {
              // Use boot to modify ice platform properties to prevent random sliding
              if (scene.scoringSystem.useBootSlipPrevention()) {
                currentPlatform.friction = 1.2; // Same as dirt
                currentPlatform.damageMultiplier = 0.7; // Same as dirt
                currentPlatform.bootModified = true; // Mark as modified by boot
                
                // Update platform detection for this frame
                friction = 1.2;
                speedScale = Math.max(0.5, 1.2 - friction * 0.4); // Same calculation as dirt
                onLowFriction = false; // No longer low friction
                
                canStartRandomSlide = false;
                
                console.log(`Boot used to prevent random sliding! Ice platform converted to dirt-like properties. Remaining boots: ${scene.scoringSystem.bootSlipPrevention}`);
                
                // Show ice boot comment when successfully preventing random sliding on ice
                scene.scoringSystem.showIceBootComment(scene, this.sprite.x, this.sprite.y);
                
                // Show visual feedback for boot protection
                if (scene.cameras && scene.cameras.main) {
                  scene.cameras.main.flash(80, 139, 69, 19, false); // Brown flash for boot protection
                }
              }
            }
            
            if (canStartRandomSlide) {
              // Start new random slide period only if player is not moving horizontally
              const currentVX = this.sprite.body.velocity.x;
              const isNearlyStationary = Math.abs(currentVX) < moveSpeed * 0.3; // Increased threshold from 0.2 to 0.3
              
              // Debug logging
              if (Math.random() < 0.1) { // Log occasionally
                console.log(`Ice check: currentVX=${currentVX.toFixed(2)}, threshold=${(moveSpeed * 0.3).toFixed(2)}, stationary=${isNearlyStationary}, slideChance=${GAME_CONFIG.ICE_SLIDE_CHANCE}`);
              }
              
              if (isNearlyStationary && Math.random() < GAME_CONFIG.ICE_SLIDE_CHANCE) {
                // Show slip comment when starting random sliding
                const scene = this.sprite.scene;
                if (scene && scene.scoringSystem) {
                  scene.scoringSystem.showSlipComment(scene, this.sprite.x, this.sprite.y);
                }
                
                this._iceSlideTimer = Math.random() * 120 + 60;
                this._iceSlideDirection = Math.random() < 0.5 ? -1 : 1;
                console.log(`Starting ice slide! Timer=${this._iceSlideTimer}, direction=${this._iceSlideDirection}`);
              }
            }
          }
        }
        
        // Handle platform-specific momentum behavior (when not actively sliding)
        if (this._iceSlideTimer === 0) {
          if (onLowFriction) {
            // On ice platforms, maintain more momentum but with better control
            const currentVX = this.sprite.body.velocity.x;
            if (Math.abs(currentVX) > moveSpeed * 0.1) {
              // Reduce velocity more aggressively on ice to prevent excessive sliding
              let newVX = currentVX * 0.8; // Increased from 0.15 to reduce sliding
              newVX = Phaser.Math.Clamp(newVX, -maxSpeedX, maxSpeedX);
              this.sprite.setVelocityX(newVX);
            }
          } else if (friction > 1.0) {
            // High friction platforms (dirt): stop very quickly when no input
            const currentVX = this.sprite.body.velocity.x;
            // More aggressive stopping on higher friction
            const stopFactor = Math.min(0.7, friction - 0.8); // Higher friction = more aggressive stopping
            this.sprite.setVelocityX(currentVX * stopFactor);
            this._lockedAirVX = 0;
          }
        }
      }
      // Track last platform position for next jump
      if (currentPlatform) {
        this._lastPlatformX = currentPlatform.x;
        this._lastPlatformY = currentPlatform.y;
        
        // Reset ice platform tracking if we're not on an ice platform
        if (!onLowFriction) {
          this._lastIcePlatformId = null;
        }
      }
      
      // Final velocity clamp to ensure we never exceed max speed on ground
      const finalVX = this.sprite.body.velocity.x;
      if (Math.abs(finalVX) > maxSpeedX) {
        this.sprite.setVelocityX(Math.sign(finalVX) * maxSpeedX);
      }
    } else {
      // Reset ice sliding when airborne
      this._iceSlideTimer = 0;
      
      // Reset ice platform tracking when leaving ground
      this._lastIcePlatformId = null;
      
      // Improved air control system
      const airMaxSpeed = GAME_CONFIG.MAX_SPEED_X * GAME_CONFIG.AIR_MAX_SPEED_MULT;
      let currentVX = this.sprite.body.velocity.x;
      const deltaTime = this.sprite.scene.game.loop.delta / 1000; // Convert to seconds
      
      if (leftPressed) {
        // If moving right but pressing left, apply extra deceleration for quick direction change
        if (currentVX > 0) {
          currentVX *= 0.85; // Quick direction change
        }
        // Apply leftward acceleration
        currentVX -= GAME_CONFIG.AIR_ACCELERATION * deltaTime;
        currentVX = Math.max(currentVX, -airMaxSpeed);
      } else if (rightPressed) {
        // If moving left but pressing right, apply extra deceleration for quick direction change
        if (currentVX < 0) {
          currentVX *= 0.85; // Quick direction change
        }
        // Apply rightward acceleration
        currentVX += GAME_CONFIG.AIR_ACCELERATION * deltaTime;
        currentVX = Math.min(currentVX, airMaxSpeed);
      } else {
        // Apply air deceleration when no keys are pressed
        currentVX *= Math.pow(GAME_CONFIG.AIR_DECELERATION, deltaTime * 60); // Frame-rate independent decay
        // Stop very small velocities to prevent infinite drift
        if (Math.abs(currentVX) < 5) {
          currentVX = 0;
        }
      }
      
      this.sprite.setVelocityX(currentVX);
      this._lockedAirVX = currentVX; // Keep for landing momentum
    }

  // Track grounded state for next frame
  this._wasGrounded = grounded;

    // Handle sprite animations based on velocity direction with stable grounded detection
    const currentVX = this.sprite.body.velocity.x;
    
    // Use a constant buffer to stabilize grounded detection for animations
    if (grounded) {
      this._groundedBuffer = 8; // Set to full buffer when grounded
    } else {
      this._groundedBuffer = Math.max(0, this._groundedBuffer - 1); // Reduce buffer when airborne
    }
    
    // Consider "stable grounded" if buffer is above threshold
    const stableGrounded = this._groundedBuffer >= 4;
    
    let desiredAnimation;
    if (!stableGrounded) {
      desiredAnimation = 'idle'; // In air, show idle
    } else if (currentVX < 0) {
      desiredAnimation = 'walk-left'; // Moving left (any negative velocity)
    } else if (currentVX > 0) {
      desiredAnimation = 'walk-right'; // Moving right (any positive velocity)
    } else {
      desiredAnimation = 'idle'; // Exactly zero velocity
    }

    // Only change animation if the desired animation is different from current
    if (this._currentSpriteState !== desiredAnimation) {
      this._currentSpriteState = desiredAnimation;
      this.sprite.play(desiredAnimation);
      console.log(`Animation changed to: ${desiredAnimation} (velocity: ${currentVX.toFixed(1)}, grounded: ${grounded}, stable: ${stableGrounded}, buffer: ${this._groundedBuffer})`); // Debug log
    }

    // Jump with run-up trade-off
    const jumpPressed =
      this.cursors.up.isDown || Phaser.Input.Keyboard.JustDown(this.spaceKey);

    if (jumpPressed && grounded) {
      const vxBefore = this.sprite.body.velocity.x;
      const runFrac = Phaser.Math.Clamp(
        Math.abs(vxBefore) / GAME_CONFIG.MOVE_SPEED,
        0,
        1
      );
  // Run-up increases jump height, but even less dramatically
  const vyMag = GAME_CONFIG.BASE_JUMP_V * (1 + 0.12 * GAME_CONFIG.HEIGHT_REDUCTION_FRAC * runFrac);
      this.sprite.setVelocityY(-vyMag);

      const dir = Math.sign(
        vxBefore || (rightPressed ? 1 : leftPressed ? -1 : 0)
      );
      if (dir !== 0) {
        const impulse = GAME_CONFIG.SIDE_IMPULSE_MAX * runFrac * dir * 1.2; // Increase jump impulse
        const newVx = Phaser.Math.Clamp(
          vxBefore + impulse,
          -GAME_CONFIG.MAX_SPEED_X * 1.1, // Allow slightly higher speed from jump
          GAME_CONFIG.MAX_SPEED_X * 1.1
        );
        this.sprite.setVelocityX(newVx);
        this._lockedAirVX = newVx * 0.9; // Set initial air velocity
      } else {
        this._lockedAirVX = vxBefore * 0.7; // Preserve some momentum even with no direction
      }

      if (audioSystem) {
        audioSystem.sfxJump(runFrac);
      }
    }

    // Pixel-perfect: snap grounded Y to integer row to avoid sub-pixel gaps
    if (grounded) {
      this.sprite.y = Math.round(this.sprite.y);
    }

    return {
      grounded,
      falling: !grounded && this.sprite.body.velocity.y > 20,
      position: { x: this.sprite.x, y: this.sprite.y },
      velocity: {
        x: this.sprite.body.velocity.x,
        y: this.sprite.body.velocity.y,
      },
    };
  }

  getSprite() {
    return this.sprite;
  }

  getPosition() {
    return this.sprite
      ? { x: this.sprite.x, y: this.sprite.y }
      : { x: 0, y: 0 };
  }

  addColliderWith(group) {
    if (this.sprite && group) {
      return this.sprite.scene.physics.add.collider(this.sprite, group);
    }
    return null;
  }

  addOverlapWith(group, callback, context = null) {
    if (this.sprite && group) {
      return this.sprite.scene.physics.add.overlap(
        this.sprite,
        group,
        callback,
        null,
        context
      );
    }
    return null;
  }
}
