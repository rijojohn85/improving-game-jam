// PixelArt.js - Procedural pixel art texture generation

import { GAME_CONFIG, COLORS } from "./GameConfig.js";

export class PixelArt {
  static makePixelSky(scene) {
    // Check if texture already exists
    if (scene.textures.exists("skytex")) {
      return;
    }
    
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;
    const { SKY_BANDS } = COLORS;

    // 8px banded gradient for a pixel feel
    const bands = 8;
    const g = scene.add.graphics();
    for (let i = 0; i < H; i += bands) {
      const t = i / H;
      const r = Math.round(
        SKY_BANDS.TOP_R + (SKY_BANDS.BOTTOM_R - SKY_BANDS.TOP_R) * t
      );
      const gC = Math.round(
        SKY_BANDS.TOP_G + (SKY_BANDS.BOTTOM_G - SKY_BANDS.TOP_G) * t
      );
      const b = Math.round(
        SKY_BANDS.TOP_B + (SKY_BANDS.BOTTOM_B - SKY_BANDS.TOP_B) * t
      );
      const col = (r << 16) | (gC << 8) | b;
      g.fillStyle(col, 1);
      g.fillRect(0, i, W, bands);
    }
    g.generateTexture("skytex", W, H);
    g.destroy();
  }

  static makePixelMountains(scene, key, color, amp = 60, stepX = 4) {
    // Check if texture already exists
    if (scene.textures.exists(key)) {
      return;
    }
    
    const { WIDTH: W } = GAME_CONFIG;

    // Column-stepped silhouette ridge (blocky)
    const width = W;
    const height = 200;
    const g = scene.add.graphics();
    g.fillStyle(color, 1);

    let baseY = height * 0.6;
    for (let x = 0; x < width; x += stepX) {
      const n =
        Math.sin(x * 0.01) +
        Math.sin(x * 0.023 + 1.7) * 0.6 +
        Math.sin(x * 0.005 - 2) * 0.4;
      let y = baseY + Math.round((n * amp) / 8) * 2; // quantize to even rows
      y = Phaser.Math.Clamp(y, 40, height - 8);
      g.fillRect(x, y, stepX, height - y);
    }

    // A few horizontal "dither" lines
    g.fillStyle(0xffffff, 0.05);
    for (let k = 0; k < 6; k++) {
      const y = 60 + k * 18 + Math.floor(Math.random() * 4);
      g.fillRect(0, y, width, 2);
    }

    g.generateTexture(key, width, height);
    g.destroy();
  }

  static createPlatformTextures(scene) {
    GAME_CONFIG.PLATFORM_SIZES.forEach((platformInfo) => {
      // Dirt (default)
      PixelArt.makePixelPlatformTexture(
        scene,
        platformInfo.width,
        platformInfo.height,
        platformInfo.key,
        'dirt'
      );
      // Stone
      PixelArt.makePixelPlatformTexture(
        scene,
        platformInfo.width,
        platformInfo.height,
        platformInfo.key + '_stone',
        'stone'
      );
      // Ice
      PixelArt.makePixelPlatformTexture(
        scene,
        platformInfo.width,
        platformInfo.height,
        platformInfo.key + '_ice',
        'ice'
      );
    });
  }

  static makePixelPlatformTexture(
    scene,
    width = 120,
    height = 18,
    key = "platform",
    type = "dirt"
  ) {
    // Check if texture already exists
    if (scene.textures.exists(key)) {
      return;
    }
    
    const { PLATFORM } = COLORS;
    const g = scene.add.graphics();

    // Choose palette
    let base, highlight, shadow, brick, pit;
    if (type === 'stone') {
      base = PLATFORM.STONE_BASE;
      highlight = PLATFORM.STONE_HIGHLIGHT;
      shadow = PLATFORM.STONE_SHADOW;
      brick = PLATFORM.STONE_BRICK;
      pit = PLATFORM.STONE_PIT;
    } else if (type === 'ice') {
      base = PLATFORM.ICE_BASE;
      highlight = PLATFORM.ICE_HIGHLIGHT;
      shadow = PLATFORM.ICE_SHADOW;
      brick = PLATFORM.ICE_BRICK;
      pit = PLATFORM.ICE_PIT;
    } else {
      base = PLATFORM.BASE;
      highlight = PLATFORM.HIGHLIGHT;
      shadow = PLATFORM.SHADOW;
      brick = PLATFORM.BRICK;
      pit = PLATFORM.PIT;
    }

    // Base block
    g.fillStyle(base, 1);
    g.fillRect(0, 0, width, height);

    // Top highlight (2px)
    g.fillStyle(highlight, 1);
    g.fillRect(0, 0, width, 2);
    // Bottom shadow (2px)
    g.fillStyle(shadow, 1);
    g.fillRect(0, height - 2, width, 2);

    // "Bricks" as blocks proportional to platform size
    g.fillStyle(brick, 0.9);
    const blockWidth = Math.max(6, Math.floor(width / 20));
    const blockHeight = Math.max(3, Math.floor(height / 6));
    for (let y = 3; y <= height - 6; y += blockHeight + 1) {
      for (
        let x = y % 8 ? blockWidth : blockWidth / 2;
        x <= width - blockWidth - 3;
        x += blockWidth * 2
      ) {
        g.fillRect(x, y, blockWidth, blockHeight);
      }
    }

    // Small pits proportional to platform size
    g.fillStyle(pit, 0.7);
    const numPits = Math.floor(width / 8);
    for (let i = 0; i < numPits; i++) {
      const x = 4 + Math.floor(Math.random() * (width - 8));
      const y = 3 + Math.floor(Math.random() * (height - 8));
      g.fillRect(x, y, 2, 2);
    }

    g.generateTexture(key, width, height);
    g.destroy();
  }

  static makePixelPlayerTexture(scene) {
    // Load actual sprite images instead of procedural texture
    const spriteNames = ['stand', 'left1', 'left2', 'right1', 'right2'];
    
    spriteNames.forEach(spriteName => {
      if (!scene.textures.exists(spriteName)) {
        scene.load.image(spriteName, `./sprites/${spriteName}.png`);
      }
    });
    
    // Create a placeholder texture for compatibility
    const key = "player_px_32x48";
    if (!scene.textures.exists(key)) {
      scene.load.image(key, './sprites/stand.png');
    }
    
    return key;
  }

  static makePixelDebrisTexture(scene) {
    const { DEBRIS } = COLORS;

    const key = "debris";
    
    // Check if texture already exists
    if (scene.textures.exists(key)) {
      return;
    }
    
    const tex = scene.textures.createCanvas(key, 12, 10); // Increased from 8x7 to 12x10
    if (!tex) {
      console.error(`Failed to create texture: ${key}`);
      return;
    }
    
    const c = tex.getContext();

    // irregular chunk mask (more realistic rock debris shape)
    const mask = [
      "  ######   ",
      " ######## #",
      "###########",
      "###########",
      "##########.",
      " ########  ",
      "  ######   ",
      "   ####    ",
      "    ##     ",
      "     .     ",
    ];

    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        if (mask[y][x] === "#") {
          c.fillStyle = DEBRIS.ROCK;
          c.fillRect(x, y, 1, 1);
        }
      }
    }

    // edge/dots (adjusted for more realistic rock shape)
    c.fillStyle = DEBRIS.EDGE;
    c.fillRect(1, 1, 1, 1); // Top left edge
    c.fillRect(8, 1, 1, 1); // Top right edge
    c.fillRect(0, 3, 1, 1); // Left side edge
    c.fillRect(10, 4, 1, 1); // Right side edge
    c.fillStyle = DEBRIS.DOT;
    c.fillRect(4, 2, 1, 1); // Top highlight
    c.fillRect(6, 3, 1, 1); // Center highlight
    c.fillRect(3, 4, 1, 1); // Left highlight
    c.fillRect(7, 5, 1, 1); // Right highlight

    tex.refresh();
  }

  static makePixelCoinTexture(scene) {
    const { COIN_SIZE } = GAME_CONFIG;

    // Create animated coin texture using the new sprites
    const key = "coin";
    
    // Check if texture already exists
    if (scene.textures.exists(key)) {
      return;
    }

    // Create animation frames from the new coin sprites
    if (scene.textures.exists('coin1') && scene.textures.exists('coin2') && scene.textures.exists('coin3')) {
      // Use coin1 as the base texture for static display, animation will be handled separately
      const baseTexture = scene.textures.get('coin1');
      scene.textures.addCanvas(key, baseTexture.source[0].source);
      
      // Create animation for coins if not already created
      if (!scene.anims.exists('coin_spin')) {
        scene.anims.create({
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
      }
    } else {
      console.warn('Coin sprites not loaded, falling back to generated texture');
      // Fallback to original generated texture code if sprites aren't loaded
      this.makeOriginalCoinTexture(scene);
    }
  }

  static makeOriginalCoinTexture(scene) {
    const { COIN } = COLORS;
    const { COIN_SIZE } = GAME_CONFIG;

    const key = "coin";
    const size = COIN_SIZE;
    
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) {
      console.error(`Failed to create texture: ${key}`);
      return;
    }
    
    const c = canvas.context;

    // Create a circular coin shape
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    c.fillStyle = COIN.DARK;
    c.beginPath();
    c.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    c.fill();

    c.fillStyle = COIN.GOLD;
    c.beginPath();
    c.arc(centerX, centerY, radius - 2, 0, 2 * Math.PI);
    c.fill();

    c.fillStyle = COIN.LIGHT;
    c.beginPath();
    c.arc(centerX - 2, centerY - 2, radius - 4, 0, 2 * Math.PI);
    c.fill();

    c.fillStyle = COIN.DARK;
    c.fillRect(centerX - 3, centerY - 1, 6, 2);
    c.fillRect(centerX - 1, centerY - 3, 2, 6);

    canvas.refresh();
  }

  static makePixelHealthPackTexture(scene) {
    const { HEALTH_PACK_SIZE } = GAME_CONFIG;

    // Create health pack texture using the new sprites
    const key = "healthpack";
    
    // Check if texture already exists
    if (scene.textures.exists(key)) {
      return;
    }

    // Create animation frames from the new health pack sprites
    if (scene.textures.exists('medi1') && scene.textures.exists('medi2') && scene.textures.exists('medi3')) {
      // Use medi1 as the base texture for static display
      const baseTexture = scene.textures.get('medi1');
      scene.textures.addCanvas(key, baseTexture.source[0].source);
      
      // Create animation for health packs if not already created
      if (!scene.anims.exists('healthpack_pulse')) {
        scene.anims.create({
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
      }
    } else {
      console.warn('Health pack sprites not loaded, falling back to generated texture');
      // Fallback to original generated texture code if sprites aren't loaded
      this.makeOriginalHealthPackTexture(scene);
    }
  }

  static makeOriginalHealthPackTexture(scene) {
    const { HEALTH_PACK } = COLORS;
    const { HEALTH_PACK_SIZE } = GAME_CONFIG;

    const key = "healthpack";
    const size = HEALTH_PACK_SIZE;
    
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) {
      console.error(`Failed to create texture: ${key}`);
      return;
    }
    
    const c = canvas.context;

    // Create a square health pack with a red cross
    const centerX = size / 2;
    const centerY = size / 2;

    // Black border
    c.fillStyle = HEALTH_PACK.BORDER;
    c.fillRect(0, 0, size, size);

    // White background
    c.fillStyle = HEALTH_PACK.BASE;
    c.fillRect(2, 2, size - 4, size - 4);

    // Red cross - vertical bar
    c.fillStyle = HEALTH_PACK.CROSS;
    c.fillRect(centerX - 3, 4, 6, size - 8);

    // Red cross - horizontal bar
    c.fillStyle = HEALTH_PACK.CROSS;
    c.fillRect(4, centerY - 3, size - 8, 6);

    // Light highlights on cross
    c.fillStyle = HEALTH_PACK.LIGHT;
    c.fillRect(centerX - 2, 5, 2, size - 10); // Left side of vertical
    c.fillRect(5, centerY - 2, size - 10, 2); // Top side of horizontal

    // Dark shadows on cross
    c.fillStyle = HEALTH_PACK.DARK;
    c.fillRect(centerX + 1, 5, 2, size - 10); // Right side of vertical
    c.fillRect(5, centerY + 1, size - 10, 2); // Bottom side of horizontal

    canvas.refresh();
  }

  static makePixelCheckpointTexture(scene) {
    const { CHECKPOINT } = COLORS;
    const { CHECKPOINT_SIZE } = GAME_CONFIG;

    const size = CHECKPOINT_SIZE;
    
    // Create red (inactive) checkpoint texture
    this.makeCheckpointTexture(scene, "checkpoint_red", size, {
      BASE: "#FF4444", // Red flag
      LIGHT: "#FF6666", // Light red highlight  
      DARK: "#CC2222", // Dark red shadow
      POLE: CHECKPOINT.POLE,
      POLE_DARK: CHECKPOINT.DARK
    });
    
    // Create green (active) checkpoint texture  
    this.makeCheckpointTexture(scene, "checkpoint_green", size, {
      BASE: CHECKPOINT.BASE, // Green flag
      LIGHT: CHECKPOINT.LIGHT, // Light green highlight
      DARK: CHECKPOINT.DARK, // Dark green shadow
      POLE: CHECKPOINT.POLE,
      POLE_DARK: CHECKPOINT.DARK
    });
    
    // Create default "checkpoint" texture as red for backwards compatibility
    this.makeCheckpointTexture(scene, "checkpoint", size, {
      BASE: "#FF4444", // Red flag
      LIGHT: "#FF6666", // Light red highlight
      DARK: "#CC2222", // Dark red shadow
      POLE: CHECKPOINT.POLE,
      POLE_DARK: CHECKPOINT.DARK
    });
  }

  static makeCheckpointTexture(scene, key, size, colors) {
    // Check if texture already exists
    if (scene.textures.exists(key)) {
      return;
    }
    
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) {
      console.error(`Failed to create texture: ${key}`);
      return;
    }
    
    const c = canvas.context;

    // Flag pole (vertical line)
    c.fillStyle = colors.POLE;
    c.fillRect(2, 0, 4, size);

    // Flag base (darker pole bottom)
    c.fillStyle = colors.POLE_DARK;
    c.fillRect(1, size - 6, 6, 6);

    // Flag (triangular pennant)
    c.fillStyle = colors.BASE;
    c.beginPath();
    c.moveTo(6, 4); // Start at pole
    c.lineTo(size - 2, 8); // Right point
    c.lineTo(6, 16); // Back to pole, lower
    c.closePath();
    c.fill();

    // Flag highlight
    c.fillStyle = colors.LIGHT;
    c.beginPath();
    c.moveTo(6, 4);
    c.lineTo(size - 4, 7);
    c.lineTo(6, 12);
    c.closePath();
    c.fill();

    // Flag shadow
    c.fillStyle = colors.DARK;
    c.beginPath();
    c.moveTo(6, 12);
    c.lineTo(size - 4, 9);
    c.lineTo(6, 16);
    c.closePath();
    c.fill();

    canvas.refresh();
  }

  static makePixelBootTexture(scene) {
    const { BOOT_SIZE } = GAME_CONFIG;

    // Create boot texture using the new sprites
    const key = "boot";
    
    // Check if texture already exists
    if (scene.textures.exists(key)) {
      return;
    }

    // Create animation frames from the new boot sprites
    if (scene.textures.exists('boot1') && scene.textures.exists('boot2') && scene.textures.exists('boot3') && scene.textures.exists('boot4')) {
      // Use boot1 as the base texture for static display
      const baseTexture = scene.textures.get('boot1');
      scene.textures.addCanvas(key, baseTexture.source[0].source);
      
      // Create animation for boots if not already created
      if (!scene.anims.exists('boot_shine')) {
        scene.anims.create({
          key: 'boot_shine',
          frames: [
            { key: 'boot1' },
            { key: 'boot2' },
            { key: 'boot3' },
            { key: 'boot4' },
            { key: 'boot3' },
            { key: 'boot2' }
          ],
          frameRate: 5,
          repeat: -1
        });
      }
    } else {
      console.warn('Boot sprites not loaded, falling back to generated texture');
      // Fallback to original generated texture code if sprites aren't loaded
      this.makeOriginalBootTexture(scene);
    }
  }

  static makeOriginalBootTexture(scene) {
    const { BOOT } = COLORS;
    const { BOOT_SIZE } = GAME_CONFIG;

    const key = "boot";
    const size = BOOT_SIZE;
    
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) {
      console.error(`Failed to create texture: ${key}`);
      return;
    }
    
    const c = canvas.context;

    // Create a boot shape
    const centerX = size / 2;
    const centerY = size / 2;

    // Main boot body (boot upper)
    c.fillStyle = BOOT.LEATHER;
    c.fillRect(4, 6, 16, 12);

    // Boot sole (bottom part)
    c.fillStyle = BOOT.SOLE;
    c.fillRect(2, 16, 20, 4);

    // Boot highlight (lighter leather on top)
    c.fillStyle = BOOT.HIGHLIGHT;
    c.fillRect(5, 7, 14, 3);

    // Laces (small lines across the boot)
    c.fillStyle = BOOT.LACES;
    c.fillRect(6, 9, 12, 1);
    c.fillRect(6, 11, 12, 1);
    c.fillRect(6, 13, 12, 1);

    // Small buckle detail
    c.fillStyle = BOOT.BUCKLE;
    c.fillRect(18, 8, 2, 2);
    c.fillRect(18, 12, 2, 2);

    // Sole grip lines
    c.fillStyle = BOOT.HIGHLIGHT;
    c.fillRect(4, 17, 2, 1);
    c.fillRect(8, 17, 2, 1);
    c.fillRect(12, 17, 2, 1);
    c.fillRect(16, 17, 2, 1);

    canvas.refresh();
  }

  static preloadAllTextures(scene) {
    const { MOUNTAINS } = COLORS;

    PixelArt.makePixelSky(scene);
    PixelArt.makePixelMountains(scene, "mtn_far", MOUNTAINS.FAR, 40, 4);
    PixelArt.makePixelMountains(scene, "mtn_mid", MOUNTAINS.MID, 70, 4);
    PixelArt.makePixelMountains(scene, "mtn_near", MOUNTAINS.NEAR, 110, 4);
    PixelArt.createPlatformTextures(scene);
    PixelArt.makePixelPlayerTexture(scene);
    PixelArt.makePixelDebrisTexture(scene);
    PixelArt.makePixelCoinTexture(scene);
    PixelArt.makePixelHealthPackTexture(scene);
    PixelArt.makePixelCheckpointTexture(scene);
    PixelArt.makePixelBootTexture(scene);
  }
}
