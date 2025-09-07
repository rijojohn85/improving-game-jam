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

    // UI elements
    this.heightText = null;
    this.hpTextEl = null;
    this.hpFillEl = null;
    this.scoreText = null;
    this.livesText = null;

    // Save system
    this.saveSystem = new SaveSystem();
  }

  initialize() {
    this.heightText = document.getElementById("height");
    this.hpTextEl = document.getElementById("hptext");
    this.hpFillEl = document.getElementById("hpfill");
    this.scoreText = document.getElementById("score");
    this.livesText = document.getElementById("lives");

    this.setHealth(GAME_CONFIG.MAX_HEALTH);
    this.resetScore();
    this.updateLivesDisplay();

    // Initialize save system
    this.saveSystem.initialize();
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

  updateLivesDisplay() {
    if (this.livesText) this.livesText.textContent = `Lives: ${this.lives}`;
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
        fontSize: "32px",
        fill: "#ff0000",
        fontFamily: "monospace",
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
        fontSize: "18px",
        fill: "#ffffff",
        fontFamily: "monospace",
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
        fontSize: "36px",
        fill: "#ff0000",
        fontFamily: "monospace",
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
        fontSize: "20px",
        fill: "#ffffff",
        fontFamily: "monospace",
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
        fontSize: "20px",
        fill: "#ffffff",
        fontFamily: "monospace",
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
        fontSize: "18px",
        fill: "#44aaff",
        fontFamily: "monospace",
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
        fontSize: "20px",
        fill: "#00ff00",
        fontFamily: "monospace",
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
      fontSize: "20px",
      fill: "#ff4444",
      fontFamily: "monospace",
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
    
    this.updateLivesDisplay();
    this.updateScore();
    this.updateHeight(0);
  }
}
