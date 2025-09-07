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

  // Air control settings
  AIR_CONTROL_STRENGTH: 0.8, // How much control you have in air (0-1)
  AIR_ACCELERATION: 400, // How fast you can change direction in air (increased for more responsiveness)
  AIR_MAX_SPEED_MULT: 1.3, // Multiplier for max speed in air (increased for more mobility)
  AIR_DECELERATION: 0.985, // How much velocity decays when not pressing keys in air (slower decay)

  // Ice platform sliding settings
  ICE_SLIDE_FORCE: 0.0001, // How strong the random sliding force is (as fraction of move speed) - reduced from 0.05
  ICE_SLIDE_CHANCE: 0.05, // Chance per frame to start sliding (at 60fps)
  ICE_DIRECTION_CHANGE_CHANCE: 0.000, // Chance per frame to change slide direction - reduced from 0.005

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

  // Lives and checkpoint system
  MAX_LIVES: 3,
  CHECKPOINT_INTERVAL_METERS: 250,
  CHECKPOINT_SIZE: 32,

  // Coin system
  COIN_SPAWN_CHANCE: 0.7,
  COIN_SIZE: 24,

  // Health pack system
  HEALTH_PACK_SPAWN_CHANCE: 0.25, // Rarer than coins
  HEALTH_PACK_SIZE: 24,
  HEALTH_PACK_HEAL_AMOUNT: 25, // Heals 25 health points

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
    // Dirt (default)
    BASE: 0x6b5846,
    HIGHLIGHT: 0x8e745c,
    SHADOW: 0x4a3b2c,
    BRICK: 0x7a644f,
    PIT: 0x5a4738,
    // Stone
    STONE_BASE: 0x888c8e,
    STONE_HIGHLIGHT: 0xbfc6c7,
    STONE_SHADOW: 0x5a5e60,
    STONE_BRICK: 0xa0a4a6,
    STONE_PIT: 0x7a7e80,
    // Ice
    ICE_BASE: 0x9be6ff,
    ICE_HIGHLIGHT: 0xe0f7ff,
    ICE_SHADOW: 0x5fd0ff,
    ICE_BRICK: 0xb3f0ff,
    ICE_PIT: 0x7fdfff,
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
  HEALTH_PACK: {
    CROSS: "#FF4444", // Red cross
    LIGHT: "#FF6666", // Light red highlight
    DARK: "#CC2222", // Dark red shadow
    BASE: "#FFFFFF", // White background
    BORDER: "#222222", // Dark border
  },
  CHECKPOINT: {
    BASE: "#00AA00", // Green base
    LIGHT: "#00FF00", // Bright green light
    DARK: "#006600", // Dark green shadow
    INACTIVE: "#444444", // Gray when inactive
    POLE: "#666666", // Flag pole color
  },
};
