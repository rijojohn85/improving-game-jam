// ScoringSystem.js - Handles scoring, health, and UI updates

import { GAME_CONFIG } from "./GameConfig.js";

export class ScoringSystem {
  constructor() {
    this.health = GAME_CONFIG.MAX_HEALTH;
    this.bestHeight = 0;
    this.score = 0;
    this.lastHeight = 0;
    this.falling = false;
    this.fallStartY = 0;

    // UI elements
    this.heightText = null;
    this.hpTextEl = null;
    this.hpFillEl = null;
    this.scoreText = null;
  }

  initialize() {
    this.heightText = document.getElementById("height");
    this.hpTextEl = document.getElementById("hptext");
    this.hpFillEl = document.getElementById("hpfill");
    this.scoreText = document.getElementById("score");

    this.setHealth(GAME_CONFIG.MAX_HEALTH);
    this.resetScore();
  }

  setHealth(newValue) {
    this.health = Phaser.Math.Clamp(newValue, 0, GAME_CONFIG.MAX_HEALTH);
    if (this.hpTextEl) this.hpTextEl.textContent = String(this.health);
    if (this.hpFillEl)
      this.hpFillEl.style.width =
        (this.health / GAME_CONFIG.MAX_HEALTH) * 100 + "%";
    if (this.hpFillEl) {
      const c = this.health / GAME_CONFIG.MAX_HEALTH;
      this.hpFillEl.style.filter = `saturate(${0.8 + 0.4 * c}) brightness(${
        0.9 + 0.2 * c
      })`;
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
    if (this.scoreText)
      this.scoreText.textContent = `Score: ${this.score.toLocaleString()}`;
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
    if (this.heightText) this.heightText.textContent = String(this.bestHeight);
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
      if (scene) {
        scene.cameras.main.flash(120, 255, 64, 64);
      }
      const isDead = this.setHealth(this.health - finalDmg);
      return { damage: finalDmg, isDead };
    }

    return { damage: 0, isDead: false };
  }

  collectCoin(audioSystem, scene) {
    if (audioSystem) {
      audioSystem.sfxCoinCollect();
    }

    this.addScore(GAME_CONFIG.COIN_POINTS);

    if (scene) {
      scene.cameras.main.flash(100, 255, 255, 100, false);
    }
  }

  collectHealthPack(audioSystem, scene) {
    // Only collect if player is not at full health
    if (this.health >= GAME_CONFIG.MAX_HEALTH) return;

    if (audioSystem) {
      audioSystem.sfxHealthPackCollect();
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
      scene.time.delayedCall(220, () => {
        this.resetScore();
        scene.scene.restart();
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
      return { platformType: "unknown", friction: 1.0, damageMultiplier: 1.0 };
    }

    const playerSprite = player.getSprite();
    if (!playerSprite) {
      return { platformType: "unknown", friction: 1.0, damageMultiplier: 1.0 };
    }

    const px = playerSprite.x;
    // Use the center bottom of the player's physics body
    const py = playerSprite.y + playerSprite.body.height / 2 + playerSprite.body.height / 2;

    // Find the platform the player is standing on or very close to
    let closestPlatform = null;
    let minDistance = Infinity;

    for (let p of scene.worldSystem.platforms.getChildren()) {
      if (!p.active) continue;

      // Check if player is horizontally within platform bounds (with some tolerance)
      const platformWidth = p.platformWidth || 120;
      const platformLeft = p.x - platformWidth / 2 - 5; // Add 5px tolerance
      const platformRight = p.x + platformWidth / 2 + 5; // Add 5px tolerance
      
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
        damageMultiplier: closestPlatform.damageMultiplier !== undefined ? closestPlatform.damageMultiplier : 1.0
      };
    }

    return { platformType: "unknown", friction: 1.0, damageMultiplier: 1.0 };
  }
}
