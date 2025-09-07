// HealthPackSystem.js - Manages health pack spawning and collection

import { GAME_CONFIG } from "./GameConfig.js";

export class HealthPackSystem {
  constructor() {
    this.healthPacksGroup = null;
  }

  initialize(scene) {
    this.healthPacksGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });

    return this.healthPacksGroup;
  }

  spawnHealthPack(fromX, fromY, toX, toY, gap, reach) {
    // Don't spawn health packs if the group isn't initialized yet
    if (!this.healthPacksGroup) return;

    // Health packs are rarer than coins - only spawn if player might need healing
    if (Math.random() > GAME_CONFIG.HEALTH_PACK_SPAWN_CHANCE) return;

    // Check if there's already a health pack too close vertically
    let tooClose = false;
    this.healthPacksGroup.children.iterate((existingPack) => {
      if (existingPack && existingPack.active) {
        const verticalDistance = Math.abs(existingPack.y - (fromY - gap * 0.6));
        if (verticalDistance < 200) {
          // Minimum 200px vertical separation (more than coins)
          tooClose = true;
        }
      }
    });

    if (tooClose) return;

    // Position health pack in a safe, reachable location
    const strategies = [
      // Strategy 1: Safe spot near platform edge
      () => {
        const sideOffset =
          (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.Between(30, 60);
        return {
          x: fromX + sideOffset,
          y: fromY - gap * Phaser.Math.FloatBetween(0.3, 0.5),
        };
      },

      // Strategy 2: Between platforms but easily reachable
      () => {
        const midX = (fromX + toX) / 2;
        const horizontalJitter = Phaser.Math.Between(-20, 20);
        return {
          x: midX + horizontalJitter,
          y: fromY - gap * Phaser.Math.FloatBetween(0.2, 0.4),
        };
      },

      // Strategy 3: On the destination platform side
      () => {
        const direction = toX > fromX ? 1 : -1;
        const lateralOffset = direction * Phaser.Math.Between(20, 50);
        return {
          x: toX + lateralOffset,
          y: toY - 40, // Just above the destination platform
        };
      },
    ];

    // Randomly select a positioning strategy
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    const position = strategy();

    // Ensure health pack is within screen bounds
    const finalX = Phaser.Math.Clamp(
      position.x,
      GAME_CONFIG.MARGIN_X + 20,
      GAME_CONFIG.WIDTH - GAME_CONFIG.MARGIN_X - 20
    );
    const finalY = Math.max(position.y, fromY - gap * 0.7); // Don't go too high

    this.spawnHealthPackAt(finalX, finalY);
  }

  spawnHealthPackAt(x, y) {
    // Don't spawn health packs if the group isn't initialized yet
    if (!this.healthPacksGroup) return;

    // Use medi1 as the base sprite (will be animated)
    const healthPack = this.healthPacksGroup.create(x, y, "medi1");
    if (!healthPack) return;

    console.log(
      `Health pack created at (${Math.floor(x)}, ${Math.floor(
        y
      )}), total health packs: ${this.healthPacksGroup.children.size}`
    );

    healthPack.setDepth(4); // Above coins and debris
    
    // Scale the sprite to match the original HEALTH_PACK_SIZE (24px)
    const targetSize = GAME_CONFIG.HEALTH_PACK_SIZE;
    healthPack.setDisplaySize(targetSize, targetSize);
    
    healthPack.body.setSize(20, 20, true); // Good hitbox for collection
    
    // Start the health pack pulsing animation
    if (healthPack.scene.anims.exists('healthpack_pulse')) {
      healthPack.play('healthpack_pulse');
    } else {
      // If animation doesn't exist yet, try to create it
      console.warn('healthpack_pulse animation not found, attempting to create...');
      if (healthPack.scene.textures.exists('medi1') && healthPack.scene.textures.exists('medi2') && healthPack.scene.textures.exists('medi3')) {
        healthPack.scene.anims.create({
          key: 'healthpack_pulse',
          frames: [
            { key: 'medi1' },
            { key: 'medi2' },
            { key: 'medi3' },
            { key: 'medi2' }
          ],
          frameRate: 6,
          repeat: -1
        });
        healthPack.play('healthpack_pulse');
      }
    }

    // Add gentle floating animation (no scaling)
    const scene = healthPack.scene;
    if (scene && scene.tweens) {
      // Add slight vertical bob
      scene.tweens.add({
        targets: healthPack,
        y: y - 8,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  onPlayerCollectsHealthPack(
    player,
    healthPack,
    scoringSystem,
    audioSystem,
    scene
  ) {
    if (!healthPack.active) return;

    // Check if player can actually collect health
    if (scoringSystem && scoringSystem.health >= GAME_CONFIG.MAX_HEALTH) {
      return; // Don't collect if at full health
    }

    if (scoringSystem) {
      // Get player position for floating text
      const playerX = player.x || (player.body ? player.body.x + player.body.width/2 : 0);
      const playerY = player.y || (player.body ? player.body.y : 0);
      scoringSystem.collectHealthPack(audioSystem, scene, playerX, playerY);
    }

    healthPack.destroy();
  }

  update(scene) {
    // Clean up off-screen health packs
    const scrollY = scene.cameras.main.scrollY;
    const camBottom = scrollY + GAME_CONFIG.HEIGHT;

    this.healthPacksGroup.children.iterate((pack) => {
      if (!pack || !pack.active) return;
      if (pack.y > camBottom + 240 || pack.y < scrollY - 2000) pack.destroy();
    });
  }

  setupCollisions(player, scoringSystem, audioSystem, scene) {
    scene.physics.add.overlap(
      player.getSprite(),
      this.healthPacksGroup,
      (playerSprite, healthPack) => {
        this.onPlayerCollectsHealthPack(
          playerSprite,
          healthPack,
          scoringSystem,
          audioSystem,
          scene
        );
      },
      null,
      scene
    );
  }

  reset() {
    // Clear all health packs
    if (this.healthPacksGroup) {
      this.healthPacksGroup.clear(true, true);
    }

    console.log("HealthPackSystem reset complete");
  }
}
