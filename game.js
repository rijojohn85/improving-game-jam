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

(() => {
  const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

  // Initialize all game systems
  const audioSystem = new AudioSystem();
  const scoringSystem = new ScoringSystem();
  const worldSystem = new WorldSystem();
  const player = new Player();
  const debrisSystem = new DebrisSystem();
  const coinSystem = new CoinSystem();

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

    // Setup all collision interactions
    debrisSystem.setupCollisions(
      worldSystem.platforms,
      player,
      audioSystem,
      scoringSystem,
      scene
    );
    coinSystem.setupCollisions(player, scoringSystem, audioSystem, scene);

    // Setup camera
    const cam = this.cameras.main;
    cam.setBounds(0, -worldHeight, W, worldHeight + H);
    cam.startFollow(playerSprite, true, 0.1, 0.1);

    // Initialize UI and audio
    scoringSystem.initialize();
    audioSystem.hookAudioResume();
    audioSystem.setupAudioUI();
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

  // Main update loop - coordinates all systems
  function update() {
    // Update player and get state
    const playerState = player.update(audioSystem);
    const playerPos = playerState.position;

    // Handle parallax scrolling
    updateParallax();

    // Handle fall detection and damage
    handleFallDamage(playerState);

    // Update all game systems
    worldSystem.updateWorldStreaming(
      this.cameras.main,
      playerState,
      coinSystem
    );
    debrisSystem.update(this);
    coinSystem.update(this);

    // Update scoring and UI
    scoringSystem.checkHeightProgress(playerPos.y);
    scoringSystem.updateHeightDisplay(playerPos.y);
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

    if (playerState.grounded && scoringSystem.falling) {
      const result = scoringSystem.endFall(
        playerState.position.y,
        audioSystem,
        scene
      );
      if (result.isDead) {
        scoringSystem.gameOver(scene);
      }
    }
  }
})();
