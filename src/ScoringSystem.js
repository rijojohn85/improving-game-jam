// ScoringSystem.js - Handles scoring, health, and UI updates

import { GAME_CONFIG } from "./GameConfig.js";
import { SaveSystem } from "./SaveSystem.js";

export class ScoringSystem {
  constructor() {
    this.health = GAME_CONFIG.MAX_HEALTH;
    this.bestHeight = 0;
    this.score = 0;
    this.lastHeight = 0;
    this.falling = false;
    this.fallStartY = 0;

    // Lives and checkpoint system
    this.lives = GAME_CONFIG.MAX_LIVES;
    this.currentCheckpoint = null;
    this.checkpointData = null;

    // Boot system
    this.bootSlipPrevention = 0; // Number of slip preventions remaining

    // Coin system
    this.coinsCollected = 0; // Total coins collected
    this.lastCoinMilestone = 0; // Last 100-coin milestone reached

    // UI elements (now canvas-based)
    this.heightText = null;
    this.healthText = null;
    this.healthBar = null;
    this.healthBarBorder = null;
    this.healthBarFill = null;
    this.healthBarShine = null;
    this.scoreText = null;
    this.livesText = null;
    this.heartSprites = [];
    this.bootText = null;
    this.coinText = null;

    // Save system
    this.saveSystem = new SaveSystem();
    
    // Slip comment debounce
    this.lastSlipCommentTime = 0;
    
    // Checkpoint comment debounce
    this.lastCheckpointCommentTime = 0;
    
    // Boot comment debounce
    this.lastBootCommentTime = 0;
    
    // Ice boot comment debounce
    this.lastIceBootCommentTime = 0;
    
    // Idle comment system
    this.lastIdleCommentTime = 0;
    this.lastPlayerPosition = { x: 0, y: 0 };
    this.stationaryTime = 0; // Time player has been stationary (in milliseconds)
  }

  initialize(scene) {
    // Store reference to scene for creating UI elements
    this.scene = scene;
    
    // Create canvas-based UI elements
    this.createCanvasUI(scene);
    
    this.setHealth(GAME_CONFIG.MAX_HEALTH);
    this.resetScore();
    this.updateLivesDisplay();
    this.updateBootDisplay();
    this.updateCoinDisplay();

    // Initialize save system
    this.saveSystem.initialize();
  }

  createCanvasUI(scene) {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    
    // Create UI container for all HUD elements
    const uiContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    
    // First line: Height (left) and Score (right) - BIGGER TEXT
    this.heightText = scene.add.text(10, 10, 'Height: 0m', {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: '"Press Start 2P"',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 3, y: 2 }
    }).setScrollFactor(0).setDepth(1001);
    
    this.scoreText = scene.add.text(WIDTH - 10, 10, 'Score: 0', {
      fontSize: '12px',
      fill: '#fbbf24',
      fontFamily: '"Press Start 2P"',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 3, y: 2 }
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
    
    // Second line: Health bar LEFT ALIGNED with health text after it
    const healthBarStartX = 10;
    
    // Health bar background with border (left aligned)
    this.healthBarBorder = scene.add.rectangle(healthBarStartX, 35, 122, 14, 0x222222)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(1001);
    
    this.healthBar = scene.add.rectangle(healthBarStartX + 1, 35, 120, 12, 0x444444)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(1002);
    
    // Health bar fill with gradient effect (left aligned)
    this.healthBarFill = scene.add.rectangle(healthBarStartX + 1, 35, 120, 12, 0x00ff44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(1003);
    
    // Health bar shine effect (left aligned)
    this.healthBarShine = scene.add.rectangle(healthBarStartX + 1, 31, 120, 4, 0xffffff, 0.3)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(1004);
    
    // Health text (positioned after health bar) - BIGGER SIZE
    this.healthText = scene.add.text(healthBarStartX + 135, 35, '100', {
      fontSize: '16px',
      fill: '#00ff44',
      fontFamily: '"Press Start 2P"',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 4, y: 3 }
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1001);
    
    // Third line: Lives (left) and Boots (right) - BIGGER TEXT
    this.livesText = scene.add.text(10, 60, 'Lives:', {
      fontSize: '12px',
      fill: '#ef4444',
      fontFamily: '"Press Start 2P"',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 3, y: 2 }
    }).setScrollFactor(0).setDepth(1001);
    
    // Create heart sprites for lives display
    this.heartSprites = [];
    for (let i = 0; i < GAME_CONFIG.MAX_LIVES; i++) {
      const heart = scene.add.image(100 + (i * 22), 68, 'heart')
        .setDisplaySize(20, 20)
        .setScrollFactor(0)
        .setDepth(1001);
      this.heartSprites.push(heart);
    }
    
    this.bootText = scene.add.text(WIDTH - 10, 60, 'Boots: 0/15', {
      fontSize: '12px',
      fill: '#D2B48C',
      fontFamily: '"Press Start 2P"',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 3, y: 2 }
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
    
    // Fourth line: Coins counter (right aligned)
    this.coinText = scene.add.text(WIDTH - 10, 85, 'Coins: 0', {
      fontSize: '12px',
      fill: '#FFD700',
      fontFamily: '"Press Start 2P"',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 3, y: 2 }
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
  }

  setHealth(newValue) {
    this.health = Phaser.Math.Clamp(newValue, 0, GAME_CONFIG.MAX_HEALTH);
    
    const healthPercent = this.health / GAME_CONFIG.MAX_HEALTH;
    
    // Determine colors based on health level
    let fillColor, textColor;
    if (healthPercent > 0.6) {
      fillColor = 0x00ff44; // Bright green
      textColor = '#00ff44';
    } else if (healthPercent > 0.3) {
      fillColor = 0xffaa00; // Orange
      textColor = '#ffaa00';
    } else {
      fillColor = 0xff2244; // Bright red
      textColor = '#ff2244';
    }
    
    // Update health text with color and pulsing effect for low health
    if (this.healthText) {
      this.healthText.setText(`${this.health}`);
      this.healthText.setStyle({ 
        fill: textColor, 
        fontFamily: '"Press Start 2P"',
        fontSize: '16px'
      });
      
      // Add pulsing effect for critical health
      if (healthPercent <= 0.2) {
        this.healthText.scene.tweens.add({
          targets: this.healthText,
          alpha: 0.4,
          duration: 300,
          yoyo: true,
          repeat: -1
        });
      } else {
        // Stop pulsing if health is above critical
        this.healthText.scene.tweens.killTweensOf(this.healthText);
        this.healthText.setAlpha(1);
      }
    }
    
    // Update health bar fill (left aligned positioning)
    if (this.healthBarFill) {
      const healthBarStartX = 10;
      this.healthBarFill.setScale(healthPercent, 1);
      this.healthBarFill.setFillStyle(fillColor);
      // Keep it left-aligned, no need to adjust position
    }
    
    // Update health bar shine effect (left aligned positioning)
    if (this.healthBarShine) {
      this.healthBarShine.setScale(healthPercent, 1);
      // Make shine more prominent on higher health
      this.healthBarShine.setAlpha(0.2 + (healthPercent * 0.3));
      // Keep it left-aligned, no need to adjust position
    }
    
    return this.health <= 0; // Return true if player should die
  }

  addScore(points) {
    if (points <= 0) return;
    this.score += points;
    this.updateScoreDisplay();
  }

  resetScore() {
    this.score = 0;
    this.lastHeight = 0;
    this.bestHeight = 0;
    this.updateScoreDisplay();
  }

  updateScoreDisplay() {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score.toLocaleString()}`);
    }
  }

  updateLivesDisplay() {
    // Update heart sprites visibility based on current lives
    if (this.heartSprites && this.heartSprites.length > 0) {
      for (let i = 0; i < this.heartSprites.length; i++) {
        if (i < this.lives) {
          // Show heart if player has this many lives
          this.heartSprites[i].setVisible(true);
          this.heartSprites[i].setAlpha(1);
        } else {
          // Hide or gray out heart if player doesn't have this life
          this.heartSprites[i].setVisible(true);
          this.heartSprites[i].setAlpha(0.3); // Make it semi-transparent
          this.heartSprites[i].setTint(0x444444); // Gray it out
        }
      }
    }
  }

  updateBootDisplay() {
    if (this.bootText) {
      this.bootText.setText(`Boots: ${this.bootSlipPrevention}/${GAME_CONFIG.BOOT_MAX_STACK}`);
    }
  }

  updateCoinDisplay() {
    if (this.coinText) {
      this.coinText.setText(`Coins: ${this.coinsCollected}`);
    }
  }

  showFloatingText(scene, x, y, text, color = '#ffffff') {
    if (!scene) return;

    // Handle multi-line text by splitting on \n
    const lines = Array.isArray(text) ? text : text.split('\n');
    
    if (lines.length === 1) {
      // Single line - use original behavior
      const floatingText = scene.add.text(x, y, text, {
        fontSize: '14px',
        fill: color,
        fontFamily: '"Press Start 2P"',
        stroke: '#000000',
        strokeThickness: 2
      });
      
      floatingText.setOrigin(0.5);
      floatingText.setDepth(1500); // Above UI
      
      // Animate the text floating up and fading out
      scene.tweens.add({
        targets: floatingText,
        y: y - 60,
        alpha: 0,
        duration: 3000, // Increased from 1500 to 2500ms for better readability
        ease: 'Power2.easeOut',
        onComplete: () => {
          floatingText.destroy();
        }
      });

      // Add a slight sideways drift for variety
      scene.tweens.add({
        targets: floatingText,
        x: x + Phaser.Math.Between(-20, 20),
        duration: 3000, // Increased to match the main animation
        ease: 'Sine.easeInOut'
      });
    } else {
      // Multi-line - create separate text objects for each line
      lines.forEach((line, index) => {
        if (!line.trim()) return; // Skip empty lines
        
        const lineY = y + (index * 18); // Space lines 18 pixels apart
        const floatingText = scene.add.text(x, lineY, line.trim(), {
          fontSize: '14px',
          fill: color,
          fontFamily: '"Press Start 2P"',
          stroke: '#000000',
          strokeThickness: 2
        });
        
        floatingText.setOrigin(0.5);
        floatingText.setDepth(1500); // Above UI
        
        // Animate the text floating up and fading out
        scene.tweens.add({
          targets: floatingText,
          y: lineY - 60,
          alpha: 0,
          duration: 2500,
          ease: 'Power2.easeOut',
          onComplete: () => {
            floatingText.destroy();
          }
        });

        // Add a slight sideways drift for variety
        scene.tweens.add({
          targets: floatingText,
          x: x + Phaser.Math.Between(-20, 20),
          duration: 2500,
          ease: 'Sine.easeInOut'
        });
      });
    }
  }

  showSlipComment(scene, playerX, playerY) {
    if (!scene) return;

    // Debounce slip comments - only show one every 2 seconds
    const currentTime = scene.time.now;
    const SLIP_COMMENT_COOLDOWN = 2500; // 2 seconds in milliseconds
    
    if (currentTime - this.lastSlipCommentTime < SLIP_COMMENT_COOLDOWN) {
      return; // Still in cooldown period, don't show comment
    }
    
    this.lastSlipCommentTime = currentTime;

    // Random slip comments to show when player starts slipping
    const slipComments = ['Whoa!', 'Slipping!', "Can't hold on!", 'Too icy!', 'Yikes!', 'Not good…', 'Ahh!', 'Steady… steady…'];
    const randomComment = slipComments[Math.floor(Math.random() * slipComments.length)];
    
    // Show the slip comment above the player
    this.showFloatingText(scene, playerX, playerY - 40, randomComment, '#87CEEB');
  }

  showCheckpointComment(scene, playerX, playerY) {
    if (!scene) return;

    // Debounce checkpoint comments - only show one every 3 seconds
    const currentTime = scene.time.now;
    const CHECKPOINT_COMMENT_COOLDOWN = 3000; // 3 seconds in milliseconds
    
    if (currentTime - this.lastCheckpointCommentTime < CHECKPOINT_COMMENT_COOLDOWN) {
      return; // Still in cooldown period, don't show comment
    }
    
    this.lastCheckpointCommentTime = currentTime;

    // Random checkpoint comments to show when player reaches a checkpoint
    const checkpointComments = [
      'Finally… took you\nlong enough.',
      'Wow, a flag.\nSo impressive.',
      'Another checkpoint?\nGroundbreaking.',
      'Can I rest now?\nNo? Figures.',
      'Oh great, more\nclimbing ahead.',
      'Yay… safety.\nFor now.',
      'This better come\nwith a medal.',
      'Checkpoint reached…\nstill miserable.'
    ];
    const randomComment = checkpointComments[Math.floor(Math.random() * checkpointComments.length)];
    
    // Show the checkpoint comment above the player (green color)
    this.showFloatingText(scene, playerX, playerY - 50, randomComment, '#00FF00');
  }

  showBootComment(scene, playerX, playerY) {
    if (!scene) return;

    // Debounce boot comments - only show one every 2 seconds
    const currentTime = scene.time.now;
    const BOOT_COMMENT_COOLDOWN = 2000; // 2 seconds in milliseconds
    
    if (currentTime - this.lastBootCommentTime < BOOT_COMMENT_COOLDOWN) {
      return; // Still in cooldown period, don't show comment
    }
    
    this.lastBootCommentTime = currentTime;

    // Random boot comments to show when player collects boots
    const bootComments = [
      'Shiny boots…\nfinally some grip!',
      'No more\nbanana-peel physics!',
      'About time, my socks\nwere useless.',
      'Slips? Never\nheard of \'em.',
      'These better be\nnon-refundable.',
      'Steel toes and\nstyle points.',
      'Watch me moonwalk\nup this mountain.',
      'Grip level:\nmaximum!'
    ];
    const randomComment = bootComments[Math.floor(Math.random() * bootComments.length)];
    
    // Show the boot comment above the player (brown color)
    this.showFloatingText(scene, playerX, playerY - 50, randomComment, '#8B4513');
  }

  showIceBootComment(scene, playerX, playerY) {
    if (!scene) return;

    // Debounce ice boot comments - only show one every 5 seconds
    const currentTime = scene.time.now;
    const ICE_BOOT_COMMENT_COOLDOWN = 5000; // 5 seconds in milliseconds
    
    if (currentTime - this.lastIceBootCommentTime < ICE_BOOT_COMMENT_COOLDOWN) {
      return; // Still in cooldown period, don't show comment
    }
    
    this.lastIceBootCommentTime = currentTime;

    // Random ice boot comments to show when player lands on ice with boots
    const iceBootComments = [
      'Ha! Not slipping\nthis time!',
      'Boots > Ice.\nSimple math.',
      'Stay frosty…\nbut steady.',
      'Who\'s laughing now,\nslippery floor?',
      'Ice rink? More like\ndance floor.',
      'Traction\nunlocked!',
      'Sorry ice, no\nfree falls today.',
      'These soles stick\nbetter than glue.'
    ];
    const randomComment = iceBootComments[Math.floor(Math.random() * iceBootComments.length)];
    
    // Show the ice boot comment above the player (brown color)
    this.showFloatingText(scene, playerX, playerY - 50, randomComment, '#8B4513');
  }

  showIdleComment(scene, playerX, playerY, isStationary = false) {
    if (!scene) return;

    // Idle comments every 30 seconds
    const currentTime = scene.time.now;
    const IDLE_COMMENT_COOLDOWN = 30000; // 30 seconds
    
    if (currentTime - this.lastIdleCommentTime < IDLE_COMMENT_COOLDOWN) {
      return; // Still in cooldown period, don't show comment
    }
    
    this.lastIdleCommentTime = currentTime;

    let idleComments;
    let commentColor = '#ffffff'; // Sky blue for idle comments
    
    if (isStationary) {
      // Comments for when player is stationary
      idleComments = [
        'Oh, we\'re just…\nhanging out now?',
        'Don\'t mind me,\nI\'ll freeze here.',
        'Any day now,\nboss.',
        'Should I order pizza\nwhile we wait?',
        'Great, now I can\ncount snowflakes.',
        'Peak climbing speed\nright here.',
        'Resting? I thought\nthis was a game.',
        'Fine, I\'ll do the heavy\nbreathing myself.',
        'Guess I\'ll practice my\nslipping in place.',
        'Can we call this the summit\nand go home?'
      ];
    } else {
      // General idle comments for when player is moving
      idleComments = [
        'Another rock…\nhow original.',
        'Sure, let\'s keep going\nup forever.',
        'My arms love this,\nreally.',
        'So… no elevators\non this mountain?',
        'Peak fitness? More like\npeak nonsense.',
        'Hope the view\'s worth\nthe back pain.',
        'Grip, slip, repeat.\nWhat a hobby.',
        'Because walking on flat ground\nwas too easy.',
        'Oh joy, more ice.\nMy favorite.',
        'Is gravity always\nthis clingy?'
      ];
    }
    
    const randomComment = idleComments[Math.floor(Math.random() * idleComments.length)];
    
    // Show idle comment in the middle of the screen below the player
    const screenCenterX = scene.cameras.main.scrollX + GAME_CONFIG.WIDTH / 2;
    this.showFloatingText(scene, screenCenterX, playerY + 80, randomComment, commentColor);
  }

  saveCheckpoint(checkpoint) {
    this.currentCheckpoint = checkpoint;
    this.checkpointData = {
      x: checkpoint.spawnX,
      y: checkpoint.spawnY - 100, // Store a position well above the checkpoint for safe respawning (checkpoint is 30px above platform, so this puts player 130px above platform)
      heightMeters: checkpoint.heightMeters,
      score: this.score,
      bestHeight: this.bestHeight,
    };

    console.log(`Game saved at checkpoint: ${checkpoint.heightMeters}m - Respawn position: (${Math.floor(checkpoint.spawnX)}, ${Math.floor(checkpoint.spawnY - 100)})`);
  }

  loseLife() {
    this.lives--;
    
    // Add a dramatic effect when losing a life
    if (this.heartSprites && this.heartSprites[this.lives]) {
      const lostHeart = this.heartSprites[this.lives];
      
      // Animate the heart being lost
      if (lostHeart.scene && lostHeart.scene.tweens) {
        lostHeart.scene.tweens.add({
          targets: lostHeart,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0.3,
          duration: 300,
          ease: 'Power2.easeOut',
          onComplete: () => {
            lostHeart.setScale(1);
            lostHeart.setTint(0x444444);
          }
        });
      }
    }
    
    this.updateLivesDisplay();
    return this.lives <= 0; // Return true if no lives left
  }

  respawnAtCheckpoint() {
    if (this.checkpointData) {
      return {
        x: this.checkpointData.x,
        y: this.checkpointData.y, // Now using the pre-calculated safe spawn position
        heightMeters: this.checkpointData.heightMeters,
      };
    }
    // Default spawn if no checkpoint
    return {
      x: GAME_CONFIG.WIDTH / 2,
      y: GAME_CONFIG.BASE_Y - 60,
      heightMeters: 0,
    };
  }

  checkHeightProgress(playerY) {
    const currentHeight = Math.max(
      0,
      Math.floor((-playerY + GAME_CONFIG.BASE_Y) / 10)
    );
    if (currentHeight > this.lastHeight) {
      const heightGained = currentHeight - this.lastHeight;
      const points = heightGained * GAME_CONFIG.POINTS_PER_METER;
      this.addScore(points);
      this.lastHeight = currentHeight;
    }
  }

  updateHeightDisplay(playerY) {
    const climbed = Math.max(0, Math.floor((-playerY + 700) / 10));
    if (climbed > this.bestHeight) this.bestHeight = climbed;
    if (this.heightText) {
      this.heightText.setText(`Height: ${this.bestHeight}m`);
    }
  }

  applyFallDamage(dropPx, audioSystem, scene, player = null) {
    const excess = Math.max(0, dropPx - GAME_CONFIG.SAFE_DROP_PX);
    let baseDmg = (excess / 50) * GAME_CONFIG.DMG_PER_50PX;
    
    // Get platform type and damage multiplier using helper function
    const platformInfo = this.getCurrentPlatform(player, scene);
    const dmgMultiplier = platformInfo.damageMultiplier;
    const platformType = platformInfo.platformType;
    const friction = platformInfo.friction;

    const finalDmg = Math.round(baseDmg * dmgMultiplier);

    // Store debug info for display
    this.lastDamageDebug = {
      drop: dropPx,
      excess: excess,
      baseDmg: baseDmg,
      dmgMultiplier: dmgMultiplier,
      finalDmg: finalDmg,
      platformType: platformType,
      friction: friction
    };

    if (audioSystem) {
      audioSystem.sfxLand(dropPx, finalDmg, GAME_CONFIG.SAFE_DROP_PX);
    }

    if (finalDmg > 0) {
      // Show floating text for health loss if player position is available
      if (scene && player) {
        const playerSprite = player.getSprite ? player.getSprite() : player;
        if (playerSprite) {
          const playerX = playerSprite.x || (playerSprite.body ? playerSprite.body.x + playerSprite.body.width/2 : 0);
          const playerY = playerSprite.y || (playerSprite.body ? playerSprite.body.y : 0);
          
          // Show damage amount
          this.showFloatingText(scene, playerX, playerY - 30, `-${finalDmg} Health`, '#FF0000');
          
          // Show random damage comment on the left side
          const damageComments = ['Ouch!',  'Oof!', 'That hurt!', 'Not again…', 'Yikes!', 'Careful!', 'Whoa!', 'Stay sharp!'];
          const randomComment = damageComments[Math.floor(Math.random() * damageComments.length)];
          this.showFloatingText(scene, playerX - 60, playerY - 20, randomComment, '#FF0000');
        }
      }
      
      if (scene) {
        scene.cameras.main.flash(120, 255, 64, 64);
      }
      const isDead = this.setHealth(this.health - finalDmg);
      return { damage: finalDmg, isDead };
    }

    return { damage: 0, isDead: false };
  }

  collectCoin(audioSystem, scene, playerX = null, playerY = null) {
    if (audioSystem) {
      audioSystem.sfxCoinCollect();
    }

    // Show floating text if player position is available
    if (scene && playerX !== null && playerY !== null) {
      this.showFloatingText(scene, playerX, playerY - 30, '+1 Coin', '#FFD700');
    }

    // Increment coin counter
    this.coinsCollected++;
    this.updateCoinDisplay();

    // Add regular coin points
    this.addScore(GAME_CONFIG.COIN_POINTS);

    // Check for 100-coin milestone bonus
    const currentMilestone = Math.floor(this.coinsCollected / 100);
    if (currentMilestone > this.lastCoinMilestone) {
      this.lastCoinMilestone = currentMilestone;
      const bonusPoints = GAME_CONFIG.COIN_MILESTONE_BONUS; // Bonus points for every 100 coins
      this.addScore(bonusPoints);
      
      console.log(`Coin milestone reached! ${this.coinsCollected} coins collected. Bonus: ${bonusPoints} points`);
      
      // Special visual effect for milestone
      if (scene) {
        scene.cameras.main.flash(200, 255, 215, 0, false); // Golden flash
        scene.cameras.main.shake(100, 0.005); // Small celebratory shake
      }
    }

    if (scene) {
      scene.cameras.main.flash(100, 255, 255, 100, false);
    }
  }

  collectHealthPack(audioSystem, scene, playerX = null, playerY = null) {
    // Only collect if player is not at full health
    if (this.health >= GAME_CONFIG.MAX_HEALTH) {
      // Show "Health is Full" message if player position is available
      if (scene && playerX !== null && playerY !== null) {
        this.showFloatingText(scene, playerX, playerY - 30, 'Health is Full', '#FFFF00');
      }
      return;
    }

    if (audioSystem) {
      audioSystem.sfxHealthPackCollect();
    }

    // Show floating text if player position is available
    if (scene && playerX !== null && playerY !== null) {
      this.showFloatingText(scene, playerX, playerY - 30, `+${GAME_CONFIG.HEALTH_PACK_HEAL_AMOUNT} Health`, '#00FF00');
    }

    // Heal the player
    const oldHealth = this.health;
    this.setHealth(this.health + GAME_CONFIG.HEALTH_PACK_HEAL_AMOUNT);
    const actualHealing = this.health - oldHealth;

    // Add some score for collecting health pack
    this.addScore(GAME_CONFIG.HEALTH_PACK_HEAL_AMOUNT);

    if (scene) {
      // Green flash to indicate healing
      scene.cameras.main.flash(120, 100, 255, 100, false);
    }

    console.log(
      `Health pack collected! Healed ${actualHealing} HP. Current health: ${this.health}`
    );
  }

  collectBoot(audioSystem, scene, playerX = null, playerY = null) {
    // Check if we're already at max boot capacity
    if (this.bootSlipPrevention >= GAME_CONFIG.BOOT_MAX_STACK) {
      return; // Don't collect if at max capacity
    }

    if (audioSystem) {
      audioSystem.sfxCoinCollect(); // Reuse coin sound for now
    }

    // Show floating text if player position is available
    if (scene && playerX !== null && playerY !== null) {
      this.showFloatingText(scene, playerX, playerY - 30, '+10 Boots', '#D2B48C');
      // Show boot collection comment
      this.showBootComment(scene, playerX, playerY);
    }

    // Add boot slip prevention uses, but cap at maximum
    const newBootCount = this.bootSlipPrevention + GAME_CONFIG.BOOT_SLIP_PREVENTION_USES;
    this.bootSlipPrevention = Math.min(newBootCount, GAME_CONFIG.BOOT_MAX_STACK);
    this.updateBootDisplay();

    // Add some score for collecting boot
    this.addScore(100); // Higher score than health pack

    if (scene) {
      // Orange flash to indicate boot collection
      scene.cameras.main.flash(120, 255, 165, 0, false);
    }

    console.log(
      `Boot collected! Boot count: ${this.bootSlipPrevention}/${GAME_CONFIG.BOOT_MAX_STACK}`
    );
  }

  useBootSlipPrevention() {
    if (this.bootSlipPrevention > 0) {
      this.bootSlipPrevention--;
      this.updateBootDisplay();
      console.log(`Boot slip prevention used! Remaining: ${this.bootSlipPrevention}`);
      return true;
    }
    return false;
  }

  hasBootSlipPrevention() {
    return this.bootSlipPrevention > 0;
  }

  updateIdleComments(scene, playerX, playerY, deltaTime) {
    if (!scene) return;
    
    // Check if player has moved significantly
    const movementThreshold = 5; // pixels
    const distanceMoved = Math.sqrt(
      Math.pow(playerX - this.lastPlayerPosition.x, 2) + 
      Math.pow(playerY - this.lastPlayerPosition.y, 2)
    );
    
    if (distanceMoved > movementThreshold) {
      // Player is moving, reset stationary timer
      this.stationaryTime = 0;
      this.lastPlayerPosition = { x: playerX, y: playerY };
      
      // Show general idle comments
      this.showIdleComment(scene, playerX, playerY, false);
    } else {
      // Player is stationary, accumulate time
      this.stationaryTime += deltaTime;
      
      // After 3 seconds of being stationary, start showing stationary comments
      if (this.stationaryTime > 3000) {
        this.showIdleComment(scene, playerX, playerY, true);
      } else {
        // Still show general idle comments if not stationary long enough
        this.showIdleComment(scene, playerX, playerY, false);
      }
    }
  }

  // Fall detection methods
  startFall(playerY) {
    if (!this.falling) {
      this.falling = true;
      this.fallStartY = playerY;
    }
  }

  endFall(playerY, audioSystem, scene, player = null) {
    if (this.falling) {
      const drop = Math.max(0, playerY - this.fallStartY);
      const result = this.applyFallDamage(drop, audioSystem, scene, player);
      this.falling = false;
      return result;
    }
    return { damage: 0, isDead: false };
  }

  gameOver(scene) {
    if (scene) {
      scene.cameras.main.shake(200, 0.01);

      const gameOverUI = this.createGameOverScreen(scene);

      scene.time.delayedCall(220, () => {
        const isGameOver = this.loseLife();

        if (isGameOver) {
          // Show final game over screen
          this.showFinalGameOverScreen(scene);
        } else {
          // Respawn at checkpoint
          this.respawnPlayer(scene);
        }
      });
    }
  }

  getDamageDebugInfo() {
    if (!this.lastDamageDebug) return "";
    
    const d = this.lastDamageDebug;
    return `drop: ${d.drop.toFixed(1)}px excess: ${d.excess.toFixed(1)}px` +
           `\ndmg: (${d.excess.toFixed(1)}/50)*${GAME_CONFIG.DMG_PER_50PX}*${d.dmgMultiplier.toFixed(1)} = ${d.finalDmg}` +
           `\nplatform: ${d.platformType} friction: ${d.friction.toFixed(2)}`;
  }

  // Helper function to detect current platform under player
  getCurrentPlatform(player, scene) {
    if (!player || !scene || !scene.worldSystem || !scene.worldSystem.platforms) {
      return { platformType: "unknown", friction: 1.0, damageMultiplier: 1.0, platform: null };
    }

    const playerSprite = player.getSprite();
    if (!playerSprite) {
      return { platformType: "unknown", friction: 1.0, damageMultiplier: 1.0, platform: null };
    }

    const px = playerSprite.x;
    // Use the center bottom of the player's physics body
    const py = playerSprite.y + playerSprite.body.height / 2 + playerSprite.body.height / 2;

    // Find the platform the player is standing on or very close to
    let closestPlatform = null;
    let minDistance = Infinity;

    for (let p of scene.worldSystem.platforms.getChildren()) {
      if (!p.active) continue;

      // Check if player is horizontally within platform bounds (with larger tolerance for ice platforms)
      const platformWidth = p.platformWidth || 120;
      const isIcePlatform = p.platformType === "ice" || (p.friction !== undefined && p.friction < 0.7);
      const tolerance = isIcePlatform ? 15 : 5; // Larger tolerance for ice platforms where sliding is expected
      
      const platformLeft = p.x - platformWidth / 2 - tolerance;
      const platformRight = p.x + platformWidth / 2 + tolerance;
      
      if (px >= platformLeft && px <= platformRight) {
        // Check vertical distance (player should be above or very close to platform top)
        const distance = Math.abs(p.y - py);
        if (distance < minDistance && distance < 20) { // Within 20 pixels vertically
          minDistance = distance;
          closestPlatform = p;
        }
      }
    }

    if (closestPlatform) {
      return {
        platformType: closestPlatform.platformType || "dirt",
        friction: closestPlatform.friction !== undefined ? closestPlatform.friction : 1.0,
        damageMultiplier: closestPlatform.damageMultiplier !== undefined ? closestPlatform.damageMultiplier : 1.0,
        platform: closestPlatform
      };
    }

    return { platformType: "unknown", friction: 1.0, damageMultiplier: 1.0, platform: null };
  }

  createGameOverScreen(scene) {
    // Create a semi-transparent overlay
    const overlay = scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0x000000,
      0.7
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(100);

    // "You Died" text
    const deathText = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 - 50,
      "YOU DIED!",
      {
        fontSize: "24px",
        fill: "#ff0000",
        fontFamily: '"Press Start 2P"',
        stroke: "#000000",
        strokeThickness: 2,
      }
    );
    deathText.setOrigin(0.5);
    deathText.setScrollFactor(0);
    deathText.setDepth(101);

    // Lives remaining text
    const livesText = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 10,
      `Lives Remaining: ${this.lives - 1}`,
      {
        fontSize: "12px",
        fill: "#ffffff",
        fontFamily: '"Press Start 2P"',
      }
    );
    livesText.setOrigin(0.5);
    livesText.setScrollFactor(0);
    livesText.setDepth(101);

    // Remove after 2 seconds
    scene.time.delayedCall(2000, () => {
      overlay.destroy();
      deathText.destroy();
      livesText.destroy();
    });

    return { overlay, deathText, livesText };
  }

  showFinalGameOverScreen(scene) {
    // Save the score when the game ends
    this.saveSystem.onGameEnd(this.score, this.bestHeight);

    // Create permanent game over screen
    const overlay = scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0x000000,
      0.9
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    // Game Over title
    const gameOverText = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      120,
      "GAME OVER",
      {
        fontSize: "28px",
        fill: "#ff0000",
        fontFamily: '"Press Start 2P"',
        stroke: "#000000",
        strokeThickness: 3,
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setScrollFactor(0);
    gameOverText.setDepth(1001);

    // Final score
    const finalScoreText = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      180,
      `Final Score: ${this.score.toLocaleString()}`,
      {
        fontSize: "14px",
        fill: "#ffffff",
        fontFamily: '"Press Start 2P"',
      }
    );
    finalScoreText.setOrigin(0.5);
    finalScoreText.setScrollFactor(0);
    finalScoreText.setDepth(1001);

    // Final height
    const finalHeightText = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      210,
      `Max Height: ${this.bestHeight}m`,
      {
        fontSize: "14px",
        fill: "#ffffff",
        fontFamily: '"Press Start 2P"',
      }
    );
    finalHeightText.setOrigin(0.5);
    finalHeightText.setScrollFactor(0);
    finalHeightText.setDepth(1001);

    // Leaderboard button
    const leaderboardButton = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      280,
      "VIEW LEADERBOARD",
      {
        fontSize: "12px",
        fill: "#44aaff",
        fontFamily: '"Press Start 2P"',
        backgroundColor: "#002244",
        padding: { x: 15, y: 8 },
      }
    );
    leaderboardButton.setOrigin(0.5);
    leaderboardButton.setScrollFactor(0);
    leaderboardButton.setDepth(1001);
    leaderboardButton.setInteractive({ useHandCursor: true });
    leaderboardButton.on("pointerdown", () => {
      this.saveSystem.displayLeaderboard(scene);
    });
    leaderboardButton.on("pointerover", () => {
      leaderboardButton.setStyle({ fill: "#ffffff", backgroundColor: "#004488" });
    });
    leaderboardButton.on("pointerout", () => {
      leaderboardButton.setStyle({ fill: "#44aaff", backgroundColor: "#002244" });
    });

    // Restart button
    const restartButton = scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      350,
      "RESTART GAME",
      {
        fontSize: "14px",
        fill: "#00ff00",
        fontFamily: '"Press Start 2P"',
        backgroundColor: "#004400",
        padding: { x: 10, y: 5 },
      }
    );
    restartButton.setOrigin(0.5);
    restartButton.setScrollFactor(0);
    restartButton.setDepth(1001);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on("pointerdown", () => {
      console.log("Restart button clicked!");

      // Simply reload the page to restart everything cleanly
      window.location.reload();
    });
    restartButton.on("pointerover", () => {
      restartButton.setStyle({ fill: "#ffffff", backgroundColor: "#006600" });
    });
    restartButton.on("pointerout", () => {
      restartButton.setStyle({ fill: "#00ff00", backgroundColor: "#004400" });
    });

    // Exit button
    const exitButton = scene.add.text(GAME_CONFIG.WIDTH / 2, 420, "EXIT GAME", {
      fontSize: "14px",
      fill: "#ff4444",
      fontFamily: '"Press Start 2P"',
      backgroundColor: "#440000",
      padding: { x: 10, y: 5 },
    });
    exitButton.setOrigin(0.5);
    exitButton.setScrollFactor(0);
    exitButton.setDepth(1001);
    exitButton.setInteractive({ useHandCursor: true });
    exitButton.on("pointerdown", () => {
      // Close the Electron app
      if (window.require) {
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send("quit-app");
      } else {
        window.close();
      }
    });
    exitButton.on("pointerover", () => {
      exitButton.setStyle({ fill: "#ffffff", backgroundColor: "#660000" });
    });
    exitButton.on("pointerout", () => {
      exitButton.setStyle({ fill: "#ff4444", backgroundColor: "#440000" });
    });
  }

  respawnPlayer(scene) {
    // Reset health
    this.setHealth(GAME_CONFIG.MAX_HEALTH);

    // Get respawn position
    const respawnPos = this.respawnAtCheckpoint();

    // Respawn player at checkpoint
    const player = scene.children.getByName("player");
    if (player) {
      // First disable physics temporarily to ensure clean positioning
      player.body.enable = false;
      player.setPosition(respawnPos.x, respawnPos.y);
      
      // Re-enable physics and set velocity
      player.body.enable = true;
      player.setVelocity(0, -200); // Strong upward velocity to ensure player doesn't fall through platform

      // Move camera to respawn location
      scene.cameras.main.setScroll(0, respawnPos.y - GAME_CONFIG.HEIGHT / 2);
    }

    console.log(`Player respawned at checkpoint: ${respawnPos.heightMeters}m at position (${Math.floor(respawnPos.x)}, ${Math.floor(respawnPos.y)})`);
  }

  resetGame() {
    this.lives = GAME_CONFIG.MAX_LIVES;
    this.health = GAME_CONFIG.MAX_HEALTH;
    this.score = 0;
    this.bestHeight = 0;
    this.lastHeight = 0;
    this.currentCheckpoint = null;
    this.checkpointData = null;
    this.falling = false;
    this.fallStartY = 0;
    this.bootSlipPrevention = 0;
    this.coinsCollected = 0;
    this.lastCoinMilestone = 0;
    
    // Reset slip comment debounce
    this.lastSlipCommentTime = 0;
    
    // Reset checkpoint comment debounce
    this.lastCheckpointCommentTime = 0;
    
    // Reset boot comment debounce
    this.lastBootCommentTime = 0;
    
    // Reset ice boot comment debounce
    this.lastIceBootCommentTime = 0;
    
    // Reset idle comment system
    this.lastIdleCommentTime = 0;
    this.lastPlayerPosition = { x: 0, y: 0 };
    this.stationaryTime = 0;
    
    this.updateLivesDisplay();
    
    // Reset heart sprites to full visibility
    if (this.heartSprites && this.heartSprites.length > 0) {
      for (let i = 0; i < this.heartSprites.length; i++) {
        this.heartSprites[i].setVisible(true);
        this.heartSprites[i].setAlpha(1);
        this.heartSprites[i].clearTint();
      }
    }
    
    this.updateBootDisplay();
    this.updateCoinDisplay();
    this.updateScoreDisplay();
    this.updateHeightDisplay(GAME_CONFIG.BASE_Y);
    this.setHealth(GAME_CONFIG.MAX_HEALTH);
  }
}
