// PixelArt.js - Procedural pixel art texture generation

import { GAME_CONFIG, COLORS } from "./GameConfig.js";

export class PixelArt {
  static makePixelSky(scene) {
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
    const { PLAYER } = COLORS;

    // 32x48 tiny human, integer size (prevents "air gap" when colliding)
    const key = "player_px_32x48";
    const tex = scene.textures.createCanvas(key, 32, 48);
    const c = tex.getContext();

    // helper draws 2x2 blocks => crunchy pixels
    const px = (x, y, w = 2, h = 2, col = "#fff") => {
      c.fillStyle = col;
      c.fillRect(x, y, w, h);
    };

    // hair
    px(10, 4, 12, 6, PLAYER.HAIR);
    px(8, 6, 2, 4, PLAYER.HAIR);
    px(22, 6, 2, 4, PLAYER.HAIR);
    // head
    px(10, 10, 12, 10, PLAYER.SKIN);
    px(8, 12, 2, 6, PLAYER.SKIN);
    px(22, 12, 2, 6, PLAYER.SKIN);
    // neck
    px(14, 20, 4, 2, PLAYER.SKIN);

    // torso (shirt)
    px(8, 22, 16, 10, PLAYER.SHIRT);
    // arms
    px(6, 24, 2, 6, PLAYER.SHIRT);
    px(24, 24, 2, 6, PLAYER.SHIRT);
    // hands
    px(6, 30, 2, 2, PLAYER.SKIN);
    px(24, 30, 2, 2, PLAYER.SKIN);

    // legs
    px(12, 32, 4, 10, PLAYER.PANTS);
    px(16, 32, 4, 10, PLAYER.PANTS);
    // boots
    px(10, 44, 8, 4, PLAYER.BOOTS);
    px(18, 44, 8, 4, PLAYER.BOOTS);

    tex.refresh();
  }

  static makePixelDebrisTexture(scene) {
    const { DEBRIS } = COLORS;

    const key = "debris";
    const tex = scene.textures.createCanvas(key, 12, 10); // Increased from 8x7 to 12x10
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
    const { COIN } = COLORS;
    const { COIN_SIZE } = GAME_CONFIG;

    const key = "coin";
    const size = COIN_SIZE;
    const canvas = scene.textures.createCanvas(key, size, size);
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
    const { HEALTH_PACK } = COLORS;
    const { HEALTH_PACK_SIZE } = GAME_CONFIG;

    const key = "healthpack";
    const size = HEALTH_PACK_SIZE;
    const canvas = scene.textures.createCanvas(key, size, size);
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

    const key = "checkpoint";
    const size = CHECKPOINT_SIZE;
    const canvas = scene.textures.createCanvas(key, size, size);
    const c = canvas.context;

    // Flag pole (vertical line)
    c.fillStyle = CHECKPOINT.POLE;
    c.fillRect(2, 0, 4, size);

    // Flag base (darker pole bottom)
    c.fillStyle = CHECKPOINT.DARK;
    c.fillRect(1, size - 6, 6, 6);

    // Flag (triangular pennant)
    c.fillStyle = CHECKPOINT.BASE;
    c.beginPath();
    c.moveTo(6, 4); // Start at pole
    c.lineTo(size - 2, 8); // Right point
    c.lineTo(6, 16); // Back to pole, lower
    c.closePath();
    c.fill();

    // Flag highlight
    c.fillStyle = CHECKPOINT.LIGHT;
    c.beginPath();
    c.moveTo(6, 4);
    c.lineTo(size - 4, 7);
    c.lineTo(6, 12);
    c.closePath();
    c.fill();

    // Flag shadow
    c.fillStyle = CHECKPOINT.DARK;
    c.beginPath();
    c.moveTo(6, 12);
    c.lineTo(size - 4, 9);
    c.lineTo(6, 16);
    c.closePath();
    c.fill();

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
  }
}
