// StartScene.js - Animated start screen with game rules
import { GAME_CONFIG } from "./GameConfig.js";
import { PixelArt } from "./PixelArt.js";

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: "StartScene" });
    this.animatedElements = [];
  }

  preload() {
    // Preload all textures needed for the start screen
    PixelArt.preloadAllTextures(this);
  }

  create() {
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

    // Create animated background
    this.createAnimatedBackground();

    // Game title
    this.add
      .text(W / 2, 120, "PIXEL CLIMBER", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "32px",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Animated subtitle
    const subtitle = this.add
      .text(W / 2, 170, "REACH FOR THE SKY!", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        fill: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Animate subtitle
    this.tweens.add({
      targets: subtitle,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Rules section
    this.createRulesSection();

    // Animated player character preview
    this.createPlayerPreview();

    // Start button
    this.createStartButton();

    // Controls info
    this.createControlsInfo();

    // Background music setup (optional)
    this.setupStartMusic();

    // Add floating particles for ambiance
    this.createFloatingParticles();
  }

  createAnimatedBackground() {
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

    // Create a gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0f17, 0x0b0f17, 0x1a1f2e, 0x2a2f3e);
    bg.fillRect(0, 0, W, H);

    // Create animated mountain silhouettes
    PixelArt.makePixelMountains(this, "mtn_far_start", 0x2a2f3e, 40, 6);
    PixelArt.makePixelMountains(this, "mtn_mid_start", 0x1a1f2e, 50, 5);
    PixelArt.makePixelMountains(this, "mtn_near_start", 0x0f1419, 60, 4);

    this.mtnFar = this.add.tileSprite(0, H - 200, W, 200, "mtn_far_start");
    this.mtnMid = this.add.tileSprite(0, H - 150, W, 150, "mtn_mid_start");
    this.mtnNear = this.add.tileSprite(0, H - 100, W, 100, "mtn_near_start");

    // Animate the mountains slowly
    this.tweens.add({
      targets: this.mtnFar,
      tilePositionX: -50,
      duration: 20000,
      repeat: -1,
      ease: "Linear",
    });

    this.tweens.add({
      targets: this.mtnMid,
      tilePositionX: 30,
      duration: 15000,
      repeat: -1,
      ease: "Linear",
    });

    this.tweens.add({
      targets: this.mtnNear,
      tilePositionX: -80,
      duration: 12000,
      repeat: -1,
      ease: "Linear",
    });
  }

  createRulesSection() {
    const { WIDTH: W } = GAME_CONFIG;

    const rulesTitle = this.add
      .text(W / 2, 240, "HOW TO PLAY", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "20px",
        fill: "#34d399",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const rules = [
      "• JUMP ON PLATFORMS TO CLIMB HIGHER",
      "• COLLECT COINS FOR POINTS",
      "• AVOID FALLING ROCKS",
      "• FIND HEALTH PACKS TO HEAL",
      "• REACH CHECKPOINTS TO SAVE PROGRESS",
      "• BEWARE OF ICE PLATFORMS - THEY'RE SLIPPERY!",
    ];

    rules.forEach((rule, index) => {
      const ruleText = this.add
        .text(W / 2, 290 + index * 25, rule, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "10px",
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 1,
        })
        .setOrigin(0.5);

      // Animate rules appearing one by one
      ruleText.setAlpha(0);
      this.tweens.add({
        targets: ruleText,
        alpha: 1,
        duration: 500,
        delay: index * 200 + 1000,
        ease: "Power2.easeOut",
      });
    });
  }

  createPlayerPreview() {
    const { WIDTH: W } = GAME_CONFIG;

    // Create player texture and get the key
    const playerTextureKey = PixelArt.makePixelPlayerTexture(this);

    // Add platform under player
    if (!this.textures.exists("platform_medium")) {
      PixelArt.createPlatformTextures(this);
    }

    const platform = this.add.image(100, 500, "platform_medium").setScale(1.5);
    
    // Add animated player sprite (positioned to stand on platform)
    // Platform top is at Y 500 - (27/2) = 486.5
    // Player bottom should be at Y 486.5, so player center should be at Y 486.5 - 48 = 438.5
    const player = this.add.sprite(100, 439, playerTextureKey).setScale(2);

    // Animate player jumping
    this.tweens.add({
      targets: player,
      y: 389,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Quad.easeInOut",
    });
  }

  createStartButton() {
    const { WIDTH: W } = GAME_CONFIG;

    const startButton = this.add
      .text(W / 2, 600, "PRESS SPACE TO START", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "18px",
        fill: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Animate start button
    this.tweens.add({
      targets: startButton,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Add input handling
    this.input.keyboard.on("keydown-SPACE", () => {
      this.startGame();
    });

    // Make button clickable
    startButton.setInteractive();
    startButton.on("pointerdown", () => {
      this.startGame();
    });

    // Button hover effect
    startButton.on("pointerover", () => {
      startButton.setTint(0xffffff);
    });

    startButton.on("pointerout", () => {
      startButton.clearTint();
    });
  }

  createControlsInfo() {
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

    const controls = [
      "ARROW KEYS - MOVE LEFT/RIGHT",
      "SPACEBAR - JUMP",
      "D - TOGGLE DEBUG INFO",
    ];

    controls.forEach((control, index) => {
      this.add
        .text(W / 2, H - 100 + index * 18, control, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "8px",
          fill: "#888888",
          stroke: "#000000",
          strokeThickness: 1,
        })
        .setOrigin(0.5);
    });
  }

  createFloatingParticles() {
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;

    // Create simple floating particles for ambiance
    for (let i = 0; i < 15; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xffffff, 0.3);
      particle.fillCircle(0, 0, Math.random() * 2 + 1);

      particle.x = Math.random() * W;
      particle.y = Math.random() * H;

      // Animate particles floating upward
      this.tweens.add({
        targets: particle,
        y: particle.y - H - 100,
        x: particle.x + (Math.random() - 0.5) * 100,
        alpha: 0,
        duration: Math.random() * 10000 + 8000,
        delay: Math.random() * 5000,
        repeat: -1,
        ease: "Linear",
        onRepeat: () => {
          particle.x = Math.random() * W;
          particle.y = H + 50;
          particle.alpha = 0.3;
        },
      });
    }
  }

  setupStartMusic() {
    // This would be handled by the AudioSystem
    // For now, we'll just prepare for future audio integration
    if (this.sound && this.sound.context && this.sound.context.state === "running") {
      // Audio is available and ready
      // Could play a gentle start screen music here
    }
  }

  startGame() {
    // Add a transition effect
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, W, H);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 500,
      ease: "Power2.easeInOut",
      onComplete: () => {
        // Switch to the main game scene
        this.scene.start("GameScene");
      },
    });
  }

  update() {
    // Any ongoing animations or updates can go here
    // The floating particles and mountain animations are handled by tweens
  }
}
