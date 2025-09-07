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
import { SaveSystem } from "./src/SaveSystem.js";

(() => {
  const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

  // Initialize all game systems
  const audioSystem = new AudioSystem();
  const scoringSystem = new ScoringSystem();
  const worldSystem = new WorldSystem();
  const player = new Player();
  const debrisSystem = new DebrisSystem();
  const coinSystem = new CoinSystem();
  const healthPackSystem = new HealthPackSystem();
  const checkpointSystem = new CheckpointSystem();

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
    scene: { preload, create, update },
  };

  // Game state variables
  let scene;
  let mtnFar, mtnMid, mtnNear, skyImg;
  let debugText;
  let debugVisible = false;

  // Start the game
  new Phaser.Game(config);

  // Preload function - loads all textures
  function preload() {
    PixelArt.preloadAllTextures(this);
  }

  // Create function - initializes the game world and systems
  function create() {
    scene = this;
    scene.cameras.main.roundPixels = true;

    // Add game data and reset function to scene for restart functionality
    scene.gameData = {
      resetAllSystems: () => {
        console.log("Resetting all game systems...");
        worldSystem.reset();
        debrisSystem.reset();
        coinSystem.reset();
        healthPackSystem.reset();
        checkpointSystem.reset();
        scoringSystem.resetGame();

        // Reset player position
        const playerSprite = player.getSprite();
        if (playerSprite) {
          playerSprite.setPosition(
            GAME_CONFIG.WIDTH / 2,
            GAME_CONFIG.BASE_Y - 60
          );
          playerSprite.setVelocity(0, -480); // Initial upward velocity
        }

        // Reset camera
        scene.cameras.main.setScroll(0, 0);
      },
    };

    // Setup parallax background
    setupBackground();

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
    worldSystem.initialize(scene);
    
    // Attach systems to scene for easy access
    scene.worldSystem = worldSystem;
    scene.scoringSystem = scoringSystem;
    
    const playerSprite = player.initialize(
      scene,
      W / 2,
      GAME_CONFIG.BASE_Y - 60
    );

    // Setup collisions between player and platforms
    player.addColliderWith(worldSystem.platforms);
    worldSystem.refreshPlatformBodies();

    // Initialize debris and coin systems
    debrisSystem.initialize(scene);
    coinSystem.initialize(scene);
    healthPackSystem.initialize(scene);
    checkpointSystem.initialize(scene);

    // Setup all collision interactions
    debrisSystem.setupCollisions(
      worldSystem.platforms,
      player,
      audioSystem,
      scoringSystem,
      scene
    );
    coinSystem.setupCollisions(player, scoringSystem, audioSystem, scene);
    healthPackSystem.setupCollisions(player, scoringSystem, audioSystem, scene);
    checkpointSystem.setupCollisions(player, scoringSystem, audioSystem, scene);

    // Setup camera
    const cam = this.cameras.main;
    cam.setBounds(0, -worldHeight, W, worldHeight + H);
    cam.startFollow(playerSprite, true, 0.1, 0.1);

    // Initialize UI and audio
    scoringSystem.initialize();
    audioSystem.setupAudioUI();

    // Setup debug toggle
    setupDebugToggle();

    // Debug text for velocity
    debugText = scene.add.text(10, 10, '', {
      font: '16px monospace',
      fill: '#fff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 6, y: 2 },
    }).setScrollFactor(0, 0).setDepth(1000).setVisible(debugVisible);
  }

  // Setup parallax background
  function setupBackground() {
    skyImg = scene.add
      .image(0, 0, "skytex")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0);
    mtnFar = scene.add
      .tileSprite(0, H - 180, W, H + 360, "mtn_far")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);
    mtnMid = scene.add
      .tileSprite(0, H - 120, W, H + 360, "mtn_mid")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);
    mtnNear = scene.add
      .tileSprite(0, H - 60, W, H + 360, "mtn_near")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);

    mtnFar.setAlpha(0.9).setDepth(-30);
    mtnMid.setAlpha(0.95).setDepth(-20);
    mtnNear.setAlpha(1).setDepth(-10);
  }

  // Setup debug toggle functionality
  function setupDebugToggle() {
    scene.input.keyboard.on('keydown-D', () => {
      debugVisible = !debugVisible;
      if (debugText) {
        debugText.setVisible(debugVisible);
      }
    });
  }

  // Main update loop - coordinates all systems
  function update() {
    // Update player and get state
    const playerState = player.update(audioSystem);
    const playerPos = playerState.position;

    // Update debug text with velocity, platform friction, and damage info
    if (debugText && debugVisible && player.getSprite()) {
      const vx = player.getSprite().body.velocity.x.toFixed(1);
      const vy = player.getSprite().body.velocity.y.toFixed(1);
      
      // Get current platform info using scoring system helper
      const platformInfo = scoringSystem.getCurrentPlatform(player, scene);
      
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
      const isSliding = player._iceSlideTimer > 0 && platformInfo.friction < 0.7;
      const slideInfo = isSliding ? `\nICE SLIDE: ${player._iceSlideTimer.toFixed(0)}f dir:${player._iceSlideDirection}` : "";
      
      // Get damage debug info from scoring system
      const dmgInfo = scoringSystem.getDamageDebugInfo();

      debugText.setText(
        `vx: ${vx}\nvy: ${vy}` +
        `\nfriction: ${platformInfo.friction.toFixed(2)} (${platformInfo.platformType})` +
        `\nspeed: ${speedScale.toFixed(2)}x max: ${maxSpeedMult.toFixed(2)}x` +
        `\nmax speed: ${(GAME_CONFIG.MAX_SPEED_X * maxSpeedMult).toFixed(1)}px/s` +
        slideInfo +
        (dmgInfo ? `\n${dmgInfo}` : "")
      );
    }

    // Handle parallax scrolling
    updateParallax();

    // Handle fall detection and damage
    handleFallDamage(playerState);

    // Update all game systems
    worldSystem.updateWorldStreaming(
      this.cameras.main,
      playerState,
      coinSystem,
      healthPackSystem,
      checkpointSystem
    );
    debrisSystem.update(this);
    coinSystem.update(this);
    healthPackSystem.update(this);
    checkpointSystem.update(this);

    // Update scoring and UI
    scoringSystem.checkHeightProgress(playerPos.y);
    scoringSystem.updateHeightDisplay(playerPos.y);

    // Check for checkpoint spawning
    const currentHeightMeters = Math.max(
      0,
      Math.floor((-playerPos.y + GAME_CONFIG.BASE_Y) / 10)
    );
    if (checkpointSystem.shouldSpawnCheckpoint(currentHeightMeters)) {
      // Find a suitable platform to place the checkpoint
      const targetY = playerPos.y - 200; // Look for platforms above player
      let bestPlatform = null;
      let closestDistance = Infinity;

      worldSystem.platforms.children.iterate((platform) => {
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
        checkpointSystem.spawnCheckpoint(
          checkpointX,
          checkpointY,
          currentHeightMeters
        );
      }
    }
  }

  // Update parallax background
  function updateParallax() {
    const scrollY = scene.cameras.main.scrollY;
    mtnFar.tilePositionY = -scrollY * 0.12;
    mtnMid.tilePositionY = -scrollY * 0.26;
    mtnNear.tilePositionY = -scrollY * 0.42;

    const playerPos = player.getPosition();
    const px = Phaser.Math.Clamp(playerPos.x - W / 2, -W / 2, W / 2);
    mtnFar.tilePositionX = px * 0.02;
    mtnMid.tilePositionX = px * 0.05;
    mtnNear.tilePositionX = px * 0.09;
  }

  // Handle fall damage detection
  function handleFallDamage(playerState) {
    if (playerState.falling) {
      scoringSystem.startFall(playerState.position.y);
    }

    if (playerState.grounded && scoringSystem.falling) {      const result = scoringSystem.endFall(
        playerState.position.y,
        audioSystem,
        scene,
        player
      );
      if (result.isDead) {
        scoringSystem.gameOver(scene);
      }
    }
  }
})();
