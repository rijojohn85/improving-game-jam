// BootSystem.js - Manages boot spawning and collection

import { GAME_CONFIG } from "./GameConfig.js";

export class BootSystem {
  constructor() {
    this.bootsGroup = null;
  }

  initialize(scene) {
    this.bootsGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });

    return this.bootsGroup;
  }

  spawnBoot(fromX, fromY, toX, toY, gap, reach) {
    // Don't spawn boots if the group isn't initialized yet
    if (!this.bootsGroup) return;

    // Boots are rarer than health packs - only spawn occasionally
    if (Math.random() > GAME_CONFIG.BOOT_SPAWN_CHANCE) return;

    // Check if there's already a boot too close vertically
    let tooClose = false;
    this.bootsGroup.children.iterate((existingBoot) => {
      if (existingBoot && existingBoot.active) {
        const verticalDistance = Math.abs(existingBoot.y - (fromY - gap * 0.6));
        if (verticalDistance < 300) {
          // Minimum 300px vertical separation (more than health packs)
          tooClose = true;
        }
      }
    });

    if (tooClose) return;

    // Position boot in a safe, reachable location
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

    // Ensure boot is within screen bounds
    const finalX = Phaser.Math.Clamp(
      position.x,
      GAME_CONFIG.MARGIN_X + 20,
      GAME_CONFIG.WIDTH - GAME_CONFIG.MARGIN_X - 20
    );
    const finalY = Math.max(position.y, fromY - gap * 0.7); // Don't go too high

    this.spawnBootAt(finalX, finalY);
  }

  spawnBootAt(x, y) {
    // Don't spawn boots if the group isn't initialized yet
    if (!this.bootsGroup) return;

    // Use boot1 as the base sprite (will be animated)
    const boot = this.bootsGroup.create(x, y, "boot1");
    if (!boot) return;

    boot.setDepth(4); // Above coins and debris

    // Scale the sprite to match the original BOOT_SIZE (24px)
    const targetSize = GAME_CONFIG.BOOT_SIZE;
    boot.setDisplaySize(targetSize, targetSize);

    boot.body.setSize(20, 20, true); // Good hitbox for collection

    // Start the boot shining animation
    if (boot.scene.anims.exists("boot_shine")) {
      boot.play("boot_shine");
    } else {
      // If animation doesn't exist yet, try to create it
      console.warn("boot_shine animation not found, attempting to create...");
      if (
        boot.scene.textures.exists("boot1") &&
        boot.scene.textures.exists("boot2") &&
        boot.scene.textures.exists("boot3") &&
        boot.scene.textures.exists("boot4")
      ) {
        boot.scene.anims.create({
          key: "boot_shine",
          frames: [
            { key: "boot1" },
            { key: "boot2" },
            { key: "boot3" },
            { key: "boot4" },
            { key: "boot3" },
            { key: "boot2" },
          ],
          frameRate: 5,
          repeat: -1,
        });
        boot.play("boot_shine");
      }
    }

    // Add gentle floating animation (no scaling)
    const scene = boot.scene;
    if (scene && scene.tweens) {
      // Add slight vertical bob
      scene.tweens.add({
        targets: boot,
        y: y - 8,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  onPlayerCollectsBoot(player, boot, scoringSystem, audioSystem, scene) {
    if (!boot.active) return;

    // Check if player can collect more boots
    if (
      scoringSystem &&
      scoringSystem.bootSlipPrevention >= GAME_CONFIG.BOOT_MAX_STACK
    ) {
      return; // Don't collect if at max capacity
    }

    if (scoringSystem) {
      // Get player position for floating text
      const playerX =
        player.x || (player.body ? player.body.x + player.body.width / 2 : 0);
      const playerY = player.y || (player.body ? player.body.y : 0);
      scoringSystem.collectBoot(audioSystem, scene, playerX, playerY);
    }

    boot.destroy();
  }

  update(scene) {
    // Clean up off-screen boots
    const scrollY = scene.cameras.main.scrollY;
    const camBottom = scrollY + GAME_CONFIG.HEIGHT;

    this.bootsGroup.children.iterate((boot) => {
      if (!boot || !boot.active) return;
      if (boot.y > camBottom + 240 || boot.y < scrollY - 2000) boot.destroy();
    });
  }

  setupCollisions(player, scoringSystem, audioSystem, scene) {
    scene.physics.add.overlap(
      player.getSprite(),
      this.bootsGroup,
      (playerSprite, boot) => {
        this.onPlayerCollectsBoot(
          playerSprite,
          boot,
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
    // Clear all boots
    if (this.bootsGroup) {
      this.bootsGroup.clear(true, true);
    }
  }
}
