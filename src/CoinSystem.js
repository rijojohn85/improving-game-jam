// CoinSystem.js - Manages coin spawning and collection

import { GAME_CONFIG } from "./GameConfig.js";

export class CoinSystem {
  constructor() {
    this.coinsGroup = null;
  }

  initialize(scene) {
    this.coinsGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });

    return this.coinsGroup;
  }

  spawnRiskyCoin(fromX, fromY, toX, toY, gap, reach) {
    // Don't spawn coins if the group isn't initialized yet
    if (!this.coinsGroup) return;

    // Check if there's already a coin too close vertically
    let tooClose = false;
    this.coinsGroup.children.iterate((existingCoin) => {
      if (existingCoin && existingCoin.active) {
        const verticalDistance = Math.abs(existingCoin.y - (fromY - gap * 0.6));
        if (verticalDistance < 120) {
          // Minimum 120px vertical separation
          tooClose = true;
        }
      }
    });

    if (tooClose) return;

    // Create multiple positioning strategies for variety
    const strategies = [
      // Strategy 1: To the side of the jump path
      () => {
        const sideOffset =
          (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.Between(60, 120);
        const jumpMidX = (fromX + toX) / 2;
        return {
          x: jumpMidX + sideOffset,
          y: fromY - gap * Phaser.Math.FloatBetween(0.4, 0.7),
        };
      },

      // Strategy 2: High and off to one side
      () => {
        const direction = toX > fromX ? 1 : -1; // Which side is the next platform
        const lateralOffset = direction * Phaser.Math.Between(40, 80);
        return {
          x: fromX + lateralOffset,
          y: fromY - gap * Phaser.Math.FloatBetween(0.6, 0.8),
        };
      },

      // Strategy 3: Between platforms but offset vertically
      () => {
        const midX = (fromX + toX) / 2;
        const horizontalJitter = Phaser.Math.Between(-30, 30);
        return {
          x: midX + horizontalJitter,
          y: fromY - gap * Phaser.Math.FloatBetween(0.3, 0.6),
        };
      },
    ];

    // Randomly select a positioning strategy
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    const position = strategy();

    // Ensure coin is within screen bounds and reachable
    const finalX = Phaser.Math.Clamp(
      position.x,
      GAME_CONFIG.MARGIN_X + 30,
      GAME_CONFIG.WIDTH - GAME_CONFIG.MARGIN_X - 30
    );
    const finalY = Math.max(position.y, fromY - gap * 0.9); // Don't go too high

    this.spawnCoin(finalX, finalY);
  }

  spawnCoin(x, y) {
    // Don't spawn coins if the group isn't initialized yet
    if (!this.coinsGroup) return;

    // Use coin1 as the base sprite (will be animated)
    const coin = this.coinsGroup.create(x, y, "coin1");
    if (!coin) return;

    console.log(
      `Coin created at (${Math.floor(x)}, ${Math.floor(y)}), total coins: ${
        this.coinsGroup.children.size
      }`
    );

    coin.setDepth(3); // Above debris but below UI
    
    // Scale the sprite to match the original COIN_SIZE (24px)
    const targetSize = GAME_CONFIG.COIN_SIZE;
    coin.setDisplaySize(targetSize, targetSize);
    
    coin.body.setSize(18, 18, true); // Larger hitbox for easier collection
    
    // Start the coin spinning animation
    if (coin.scene.anims.exists('coin_spin')) {
      coin.play('coin_spin');
    } else {
      // If animation doesn't exist yet, try to create it
      console.warn('coin_spin animation not found, attempting to create...');
      if (coin.scene.textures.exists('coin1') && coin.scene.textures.exists('coin2') && coin.scene.textures.exists('coin3')) {
        coin.scene.anims.create({
          key: 'coin_spin',
          frames: [
            { key: 'coin1' },
            { key: 'coin2' },
            { key: 'coin3' },
            { key: 'coin2' }
          ],
          frameRate: 8,
          repeat: -1
        });
        coin.play('coin_spin');
      }
    }

    // Add gentle floating animation (no scaling)
    const scene = coin.scene;
    if (scene && scene.tweens) {
      scene.tweens.add({
        targets: coin,
        y: y - 5,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  onPlayerCollectsCoin(player, coin, scoringSystem, audioSystem, scene) {
    if (!coin.active) return;

    if (scoringSystem) {
      // Get player position for floating text
      const playerX = player.x || (player.body ? player.body.x + player.body.width/2 : 0);
      const playerY = player.y || (player.body ? player.body.y : 0);
      scoringSystem.collectCoin(audioSystem, scene, playerX, playerY);
    }

    coin.destroy();
  }

  update(scene) {
    // Clean up off-screen coins
    const scrollY = scene.cameras.main.scrollY;
    const camBottom = scrollY + GAME_CONFIG.HEIGHT;

    this.coinsGroup.children.iterate((c) => {
      if (!c || !c.active) return;
      if (c.y > camBottom + 240 || c.y < scrollY - 2000) c.destroy();
    });
  }

  setupCollisions(player, scoringSystem, audioSystem, scene) {
    scene.physics.add.overlap(
      player.getSprite(),
      this.coinsGroup,
      (playerSprite, coin) => {
        this.onPlayerCollectsCoin(
          playerSprite,
          coin,
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
    // Clear all coins
    if (this.coinsGroup) {
      this.coinsGroup.clear(true, true);
    }

    console.log("CoinSystem reset complete");
  }
}
