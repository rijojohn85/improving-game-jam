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

  applyFallDamage(dropPx, audioSystem, scene) {
    const excess = Math.max(0, dropPx - GAME_CONFIG.SAFE_DROP_PX);
    const dmg = Math.round((excess / 50) * GAME_CONFIG.DMG_PER_50PX);

    if (audioSystem) {
      audioSystem.sfxLand(dropPx, dmg, GAME_CONFIG.SAFE_DROP_PX);
    }

    if (dmg > 0) {
      if (scene) {
        scene.cameras.main.flash(120, 255, 64, 64);
      }
      const isDead = this.setHealth(this.health - dmg);
      return { damage: dmg, isDead };
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

  // Fall detection methods
  startFall(playerY) {
    if (!this.falling) {
      this.falling = true;
      this.fallStartY = playerY;
    }
  }

  endFall(playerY, audioSystem, scene) {
    if (this.falling) {
      const drop = Math.max(0, playerY - this.fallStartY);
      const result = this.applyFallDamage(drop, audioSystem, scene);
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
}
