// GameConfig.js - Central configuration for the Pixel Climber game

export const GAME_CONFIG = {
  // Display settings
  WIDTH: 480,
  HEIGHT: 800,
  BACKGROUND_COLOR: "#0b0f17",

  // Physics settings
  GRAVITY_Y: 1000,
  MOVE_SPEED: 240,
  BASE_JUMP_V: 640,
  HEIGHT_REDUCTION_FRAC: 0.35,
  SIDE_IMPULSE_MAX: 180,
  GROUND_DRAG_X: 900,
  AIR_DRAG_X: 140,
  MAX_SPEED_X: 380,
  MARGIN_X: 48,

  // World streaming
  SPAWN_AHEAD: 1200,
  KEEP_BELOW: 1800,

  // Jump calculations
  get MAX_JUMP_H() {
    return this.BASE_JUMP_V ** 2 / (2 * this.GRAVITY_Y);
  },
  get GAP_MIN() {
    return Math.floor(this.MAX_JUMP_H * 0.55);
  },
  get GAP_MAX() {
    return Math.floor(this.MAX_JUMP_H * 0.85);
  },

  // Health and damage
  get SAFE_DROP_PX() {
    return Math.round(this.MAX_JUMP_H * 1.05);
  },
  DMG_PER_50PX: 12,
  MAX_HEALTH: 100,

  // Scoring
  POINTS_PER_METER: 10,
  COIN_POINTS: 50,
  BASE_Y: 680,

  // Coin system
  COIN_SPAWN_CHANCE: 0.7,
  COIN_SIZE: 24,

  // Platform system
  PLATFORM_SIZES: [
    { width: 80, height: 18, key: "platform_small" },
    { width: 120, height: 18, key: "platform_medium" },
    { width: 160, height: 18, key: "platform_large" },
  ],
  PLATFORM_WEIGHTS: [0.3, 0.5, 0.2],

  // Debris settings
  DEBRIS_SCALE: 1.5,
  DEBRIS_MAX: 24,
  DEBRIS_SPAWN_MS: 1200,
  DEBRIS_DMG: 10,
  DEBRIS_LIFESPAN: 9000,
  DEBRIS_VY_MIN: 120,
  DEBRIS_VY_MAX: 220,
  DEBRIS_MAX_VY: 260,
  DEBRIS_GRAVITY_MULT: 0.55,
  DEBRIS_VX_MAX: 40,
  DEBRIS_SPIN_MAX: 140,
};

export const COLORS = {
  SKY_BANDS: {
    TOP_R: 11,
    TOP_G: 15,
    TOP_B: 23, // 0x0b0f17
    BOTTOM_R: 23,
    BOTTOM_G: 34,
    BOTTOM_B: 51, // 0x172233
  },
  MOUNTAINS: {
    FAR: 0x0d1320,
    MID: 0x111a2a,
    NEAR: 0x162234,
  },
  PLATFORM: {
    BASE: 0x6b5846,
    HIGHLIGHT: 0x8e745c,
    SHADOW: 0x4a3b2c,
    BRICK: 0x7a644f,
    PIT: 0x5a4738,
  },
  PLAYER: {
    SKIN: "#f3c999",
    HAIR: "#3a2a20",
    SHIRT: "#3a6ea5",
    PANTS: "#2b2d42",
    BOOTS: "#4b3d31",
  },
  DEBRIS: {
    ROCK: "#6f5a46",
    EDGE: "#4a3b2c",
    DOT: "#8e745c",
  },
  COIN: {
    GOLD: "#FFD700",
    LIGHT: "#FFED4E",
    DARK: "#B8860B",
  },
};
