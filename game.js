// Pixel Climber - game.js (Refactored)
// Main game orchestration file that coordinates all systems

// Import all the modular systems
import { GAME_CONFIG } from "./src/GameConfig.js";
import { AudioSystem } from "./src/AudioSystem.js";
import { PixelArt } from "./src/PixelArt.js";
import { ScoringSystem } from "./src/ScoringSystem.js";
import { WorldSystem } from "./src/WorldSystem.js";
import { Player } from "./src/Player.js";
import { DebrisSystem } from "./src/DebrisSystem.js";
import { CoinSystem } from "./src/CoinSystem.js";
import { HealthPackSystem } from "./src/HealthPackSystem.js";
import { CheckpointSystem } from "./src/CheckpointSystem.js";
import { BootSystem } from "./src/BootSystem.js";
import { SaveSystem } from "./src/SaveSystem.js";
import { StartScene } from "./src/StartScene.js";

// Main GameScene class
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });

    // Initialize all game systems
    this.audioSystem = new AudioSystem();
    this.scoringSystem = new ScoringSystem();
    this.worldSystem = new WorldSystem();
    this.player = new Player();
    this.debrisSystem = new DebrisSystem();
    this.coinSystem = new CoinSystem();
    this.healthPackSystem = new HealthPackSystem();
    this.checkpointSystem = new CheckpointSystem();
    this.bootSystem = new BootSystem();

    // Game state variables
    this.mtnFar = null;
    this.mtnMid = null;
    this.mtnNear = null;
    this.skyImg = null;
    this.debugText = null;
    this.debugVisible = false;
  }

  // Preload function - loads all textures
  preload() {
    // Load player sprites first
    this.load.image("stand", "./sprites/stand.png");
    this.load.image("left1", "./sprites/left1.png");
    this.load.image("left2", "./sprites/left2.png");
    this.load.image("right1", "./sprites/right1.png");
    this.load.image("right2", "./sprites/right2.png");

    // Load item sprites
    this.load.image("coin1", "./sprites/coin1.png");
    this.load.image("coin2", "./sprites/coin2.png");
    this.load.image("coin3", "./sprites/coin3.png");
    this.load.image("medi1", "./sprites/medi1.png");
    this.load.image("medi2", "./sprites/medi2.png");
    this.load.image("medi3", "./sprites/medi3.png");
    this.load.image("boot1", "./sprites/boot1.png");
    this.load.image("boot2", "./sprites/boot2.png");
    this.load.image("boot3", "./sprites/boot3.png");
    this.load.image("boot4", "./sprites/boot4.png");
    this.load.image("heart", "./sprites/heart.png");

    PixelArt.preloadAllTextures(this);
    this.load.image("background", "./background.png");
  }

  // Create function - initializes the game world and systems
  create() {
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;
    this.cameras.main.roundPixels = true;

    // Add game data and reset function to scene for restart functionality
    this.gameData = {
      resetAllSystems: () => {
        this.worldSystem.reset();
        this.debrisSystem.reset();
        this.coinSystem.reset();
        this.healthPackSystem.reset();
        this.checkpointSystem.reset();
        this.bootSystem.reset();
        this.scoringSystem.resetGame();

        // Reset player position
        const playerSprite = this.player.getSprite();
        if (playerSprite) {
          playerSprite.setPosition(
            GAME_CONFIG.WIDTH / 2,
            GAME_CONFIG.BASE_Y - 60
          );
          playerSprite.setVelocity(0, -480); // Initial upward velocity
        }

        // Reset camera
        this.cameras.main.setScroll(0, 0);
      },
    };

    // Setup parallax background
    this.setupBackground();

    // Setup physics world
    const worldHeight = 40000;
    this.physics.world.setBounds(
      0,
      -worldHeight,
      W,
      worldHeight + H,
      true,
      true,
      true,
      true
    );

    // Initialize all game systems
    this.worldSystem.initialize(this);

    const playerSprite = this.player.initialize(
      this,
      W / 2,
      GAME_CONFIG.BASE_Y - 60
    );

    // Setup collisions between player and platforms
    this.player.addColliderWith(this.worldSystem.platforms);
    this.worldSystem.refreshPlatformBodies();

    // Initialize debris and coin systems
    this.debrisSystem.initialize(this);
    this.coinSystem.initialize(this);
    this.healthPackSystem.initialize(this);
    this.checkpointSystem.initialize(this);
    this.bootSystem.initialize(this);

    // Setup all collision interactions
    this.debrisSystem.setupCollisions(
      this.worldSystem.platforms,
      this.player,
      this.audioSystem,
      this.scoringSystem,
      this
    );
    this.coinSystem.setupCollisions(
      this.player,
      this.scoringSystem,
      this.audioSystem,
      this
    );
    this.healthPackSystem.setupCollisions(
      this.player,
      this.scoringSystem,
      this.audioSystem,
      this
    );
    this.checkpointSystem.setupCollisions(
      this.player,
      this.scoringSystem,
      this.audioSystem,
      this
    );
    this.bootSystem.setupCollisions(
      this.player,
      this.scoringSystem,
      this.audioSystem,
      this
    );

    // Setup camera
    const cam = this.cameras.main;
    cam.setBounds(0, -worldHeight, W, worldHeight + H);
    cam.startFollow(playerSprite, true, 0.1, 0.1);

    // Initialize UI and audio
    this.scoringSystem.initialize(this);
    this.audioSystem.setupAudioUI();

    // Setup debug toggle
    this.setupDebugToggle();

    // Debug text for velocity
    this.debugText = this.add
      .text(10, 10, "", {
        font: "16px monospace",
        fill: "#fff",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: { x: 6, y: 2 },
      })
      .setScrollFactor(0, 0)
      .setDepth(1000)
      .setVisible(this.debugVisible);
  }

  // Setup parallax background
  setupBackground() {
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

    this.skyImg = this.add
      .image(-50, -50, "background")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0);
    this.mtnFar = this.add
      .tileSprite(0, H - 180, W, H + 360, "mtn_far")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);
    this.mtnMid = this.add
      .tileSprite(0, H - 120, W, H + 360, "mtn_mid")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);
    this.mtnNear = this.add
      .tileSprite(0, H - 60, W, H + 360, "mtn_near")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);

    this.mtnFar.setAlpha(0.9).setDepth(-30);
    this.mtnMid.setAlpha(0.95).setDepth(-20);
    this.mtnNear.setAlpha(1).setDepth(-10);
  }

  // Setup debug toggle functionality
  setupDebugToggle() {
    this.input.keyboard.on("keydown-D", () => {
      this.debugVisible = !this.debugVisible;
      if (this.debugText) {
        this.debugText.setVisible(this.debugVisible);
      }
    });
  }

  // Main update loop - coordinates all systems
  update() {
    // Update player and get state
    const playerState = this.player.update(this.audioSystem);
    const playerPos = playerState.position;

    // Update debug text with velocity, platform friction, and damage info
    if (this.debugText && this.debugVisible && this.player.getSprite()) {
      const vx = this.player.getSprite().body.velocity.x.toFixed(1);
      const vy = this.player.getSprite().body.velocity.y.toFixed(1);

      // Get current platform info using scoring system helper
      const platformInfo = this.scoringSystem.getCurrentPlatform(
        this.player,
        this
      );

      // Calculate friction effects and max speed
      let speedScale = 1.0;
      let maxSpeedMult = 1.0;
      if (platformInfo.friction < 0.7) {
        speedScale = 2.5 + (0.7 - platformInfo.friction) * 3.0;
        maxSpeedMult = speedScale * 0.8;
      } else if (platformInfo.friction > 1.2) {
        speedScale = Math.max(0.3, 1.5 - platformInfo.friction);
        maxSpeedMult = Math.max(0.2, 0.8 - (platformInfo.friction - 1.0));
      } else {
        speedScale = Math.max(0.5, 1.2 - platformInfo.friction * 0.4);
        maxSpeedMult = Math.max(0.4, 0.9 - platformInfo.friction * 0.3);
      }

      // Check if player is sliding on ice
      const isSliding =
        this.player._iceSlideTimer > 0 && platformInfo.friction < 0.7;
      const slideInfo = isSliding
        ? `\nICE SLIDE: ${this.player._iceSlideTimer.toFixed(0)}f dir:${
            this.player._iceSlideDirection
          }`
        : "";

      // Get damage debug info from scoring system
      const dmgInfo = this.scoringSystem.getDamageDebugInfo();

      this.debugText.setText(
        `vx: ${vx}\nvy: ${vy}` +
          `\nfriction: ${platformInfo.friction.toFixed(2)} (${
            platformInfo.platformType
          })` +
          `\nspeed: ${speedScale.toFixed(2)}x max: ${maxSpeedMult.toFixed(
            2
          )}x` +
          `\nmax speed: ${(GAME_CONFIG.MAX_SPEED_X * maxSpeedMult).toFixed(
            1
          )}px/s` +
          slideInfo +
          (dmgInfo ? `\n${dmgInfo}` : "")
      );
    }

    // Handle parallax scrolling
    this.updateParallax();

    // Handle fall detection and damage
    this.handleFallDamage(playerState);

    // Update all game systems
    this.worldSystem.updateWorldStreaming(
      this.cameras.main,
      playerState,
      this.coinSystem,
      this.healthPackSystem,
      this.checkpointSystem,
      this.bootSystem
    );
    this.debrisSystem.update(this);
    this.coinSystem.update(this);
    this.healthPackSystem.update(this);
    this.checkpointSystem.update(this);
    this.bootSystem.update(this);

    // Update scoring and UI
    this.scoringSystem.checkHeightProgress(playerPos.y);
    this.scoringSystem.updateHeightDisplay(playerPos.y);

    // Update idle comment system
    this.scoringSystem.updateIdleComments(
      this,
      playerPos.x,
      playerPos.y,
      this.game.loop.delta
    );

    // Check for checkpoint spawning
    const currentHeightMeters = Math.max(
      0,
      Math.floor((-playerPos.y + GAME_CONFIG.BASE_Y) / 10)
    );
    if (this.checkpointSystem.shouldSpawnCheckpoint(currentHeightMeters)) {
      // Find a suitable platform to place the checkpoint
      const targetY = playerPos.y - 200; // Look for platforms above player
      let bestPlatform = null;
      let closestDistance = Infinity;

      this.worldSystem.platforms.children.iterate((platform) => {
        if (platform && platform.active) {
          const distance = Math.abs(platform.y - targetY);
          if (distance < closestDistance && platform.y < playerPos.y - 50) {
            closestDistance = distance;
            bestPlatform = platform;
          }
        }
      });

      if (bestPlatform) {
        const checkpointX = bestPlatform.x;
        const checkpointY = bestPlatform.y - 30; // Place on top of platform
        this.checkpointSystem.spawnCheckpoint(
          checkpointX,
          checkpointY,
          currentHeightMeters
        );
      }
    }
  }

  // Update parallax background
  updateParallax() {
    const { WIDTH: W } = GAME_CONFIG;
    const scrollY = this.cameras.main.scrollY;
    this.mtnFar.tilePositionY = -scrollY * 0.12;
    this.mtnMid.tilePositionY = -scrollY * 0.26;
    this.mtnNear.tilePositionY = -scrollY * 0.42;

    const playerPos = this.player.getPosition();
    const px = Phaser.Math.Clamp(playerPos.x - W / 2, -W / 2, W / 2);
    this.mtnFar.tilePositionX = px * 0.02;
    this.mtnMid.tilePositionX = px * 0.05;
    this.mtnNear.tilePositionX = px * 0.09;
  }

  // Handle fall damage detection
  handleFallDamage(playerState) {
    if (playerState.falling) {
      this.scoringSystem.startFall(playerState.position.y);
    }

    if (playerState.grounded && this.scoringSystem.falling) {
      const result = this.scoringSystem.endFall(
        playerState.position.y,
        this.audioSystem,
        this,
        this.player
      );
      if (result.isDead) {
        this.scoringSystem.gameOver(this, this.audioSystem);
      }
    }
  }
}

// Initialize the game with both scenes
(() => {
  const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

  // Game configuration
  const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
    physics: {
      default: "arcade",
      arcade: { gravity: { y: GAME_CONFIG.GRAVITY_Y }, debug: false },
    },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    pixelArt: true,
    scene: [StartScene, GameScene], // Start with StartScene, then GameScene
  };

  // Start the game
  new Phaser.Game(config);
})();
