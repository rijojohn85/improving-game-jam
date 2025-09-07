// WorldSystem.js - Handles platform generation and world streaming

import { GAME_CONFIG } from "./GameConfig.js";

export class WorldSystem {
  constructor() {
    this.platforms = null;
    this.minY = GAME_CONFIG.BASE_Y;
    this.topX = GAME_CONFIG.WIDTH / 2;
  }

  initialize(scene) {
    // Create platform group
    this.platforms = scene.physics.add.staticGroup();

    // Start platforms (use medium size for starting consistency)
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 70;
      const y = GAME_CONFIG.BASE_Y - (i % 2) * 40;
      const platform = this.platforms.create(x, y, "platform_medium");
      platform.platformWidth = 120;
      platform.platformType = "dirt"; // Starting platforms are dirt
      platform.damageMultiplier = 0.7;
      platform.friction = 1.2;
    }

    // Initial top
    this.setTopFromGroup();

    // Seed upward
    for (let i = 0; i < 20; i++) this.spawnPlatformAbove();

    return this.platforms;
  }

  selectRandomPlatformSize(heightClimbed = 0) {
    // Scale platform sizes based on height climbed
    let sizeScale = 1.0;
    let weights = [...GAME_CONFIG.PLATFORM_WEIGHTS]; // Copy default weights [0.3, 0.5, 0.2] = [small, medium, large]

    if (heightClimbed < 1000) {
      // Early game: Make platforms bigger for easier learning (120% to 100%)
      const easyFactor = (1000 - heightClimbed) / 1000; // 1.0 to 0.0
      sizeScale = 1.0 + easyFactor * 0.3; // Scale up to 130% at start

      // Bias towards larger platforms in early game
      weights = [
        0.1 * (1 - easyFactor) + 0.0 * easyFactor, // small: 10% to 0%
        0.3 * (1 - easyFactor) + 0.2 * easyFactor, // medium: 30% to 20%
        0.6 * (1 - easyFactor) + 0.8 * easyFactor, // large: 60% to 80%
      ];
    } else if (heightClimbed > 2500) {
      // Late game: Start scaling down platforms more aggressively after 2500px
      const difficultyFactor = Math.min(0.9, (heightClimbed - 2500) / 5000); // Scale down to 10% over 5000px
      sizeScale = 1.0 - difficultyFactor;

      // Bias towards smaller platforms in late game
      weights = [
        0.3 + 0.5 * difficultyFactor, // small: 30% to 80%
        0.5 - 0.3 * difficultyFactor, // medium: 50% to 20%
        0.2 - 0.2 * difficultyFactor, // large: 20% to 0%
      ];
    }

    // Create scaled platform sizes
    const scaledSizes = GAME_CONFIG.PLATFORM_SIZES.map((size) => ({
      width: Math.max(50, Math.floor(size.width * sizeScale)), // Minimum width of 50px (reduced for late game)
      height: size.height,
      key: size.key,
    }));

    const random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < scaledSizes.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return scaledSizes[i];
      }
    }

    // Fallback to medium size (scaled)
    return scaledSizes[1];
  }

  setTopFromGroup() {
    let top = null;
    this.platforms.children.iterate((p) => {
      if (!p) return;
      if (!top || p.y < top.y) top = p;
    });
    if (!top) {
      this.minY = 680;
      this.topX = GAME_CONFIG.WIDTH / 2;
      return;
    }
    this.minY = top.y;
    this.topX = top.x;
  }

  spawnPlatformAbove(
    coinSystem = null,
    healthPackSystem = null,
    bootSystem = null
  ) {
    const gap = Phaser.Math.Between(GAME_CONFIG.GAP_MIN, GAME_CONFIG.GAP_MAX);
    const reach = this.maxHorizontalReachForGap(gap);

    // Calculate height climbed for platform scaling
    const heightForScaling = GAME_CONFIG.BASE_Y - (this.minY - gap);

    // Select random platform size with height-based scaling
    const platformSize = this.selectRandomPlatformSize(heightForScaling);

    // Get the width of the previous platform for spacing calculations
    const lastPlatform = this.platforms.getLast(true);
    const prevPlatformWidth =
      lastPlatform && lastPlatform.platformWidth
        ? lastPlatform.platformWidth
        : 120;

    const nx = this.randomReachableX(
      this.topX,
      reach,
      platformSize.width,
      prevPlatformWidth
    );
    const ny = this.minY - gap;

    // --- Platform type selection logic ---
    // Phase 1: first 1500px (BASE_Y - ny < 1500)
    // Phase 2: next 1500px (1500 <= BASE_Y - ny < 3000)
    // Phase 3: BASE_Y - ny >= 3000
    const heightClimbed = GAME_CONFIG.BASE_Y - ny;
    let dirtProb = 0.8,
      stoneProb = 0.2,
      iceProb = 0.0;
    if (heightClimbed < 1500) {
      dirtProb = 0.8;
      stoneProb = 0.2;
      iceProb = 0.0;
    } else if (heightClimbed < 3000) {
      // Scale to stone 80%, dirt 15%, ice 5%
      const t = (heightClimbed - 1500) / 1500; // 0 to 1
      dirtProb = 0.8 - 0.65 * t; // 0.8 -> 0.15
      stoneProb = 0.2 + 0.6 * t; // 0.2 -> 0.8
      iceProb = 0.0 + 0.05 * t; // 0.0 -> 0.05
    } else {
      dirtProb = 0.02;
      stoneProb = 0.08;
      iceProb = 0.9;
    }
    // Pick type
    const r = Math.random();
    let platformType = "dirt";
    if (r < dirtProb) platformType = "dirt";
    else if (r < dirtProb + stoneProb) platformType = "stone";
    else platformType = "ice";

    // Choose sprite key based on type (customize as needed)
    let platformKey = platformSize.key;
    if (platformType === "stone") platformKey = platformSize.key + "_stone";
    else if (platformType === "ice") platformKey = platformSize.key + "_ice";

    const platform = this.platforms.create(nx, ny, platformKey);
    platform.platformWidth = platformSize.width;
    platform.platformType = platformType;
    platform.bootModified = false; // Initialize boot modification flag

    // Assign platform properties
    if (platformType === "stone") {
      platform.damageMultiplier = 1.5; // Example: 1.5x damage
      platform.friction = 1.0;
    } else if (platformType === "ice") {
      platform.damageMultiplier = 1.0;
      platform.friction = 0.5; // Low friction
    } else {
      platform.damageMultiplier = 0.7;
      platform.friction = 1.2;
    }

    // Chance to spawn a coin in a risky but reachable position
    if (coinSystem && Math.random() < GAME_CONFIG.COIN_SPAWN_CHANCE) {
      coinSystem.spawnRiskyCoin(this.topX, this.minY, nx, ny, gap, reach);
    }

    // Chance to spawn a health pack in a safe position
    if (
      healthPackSystem &&
      Math.random() < GAME_CONFIG.HEALTH_PACK_SPAWN_CHANCE
    ) {
      healthPackSystem.spawnHealthPack(
        this.topX,
        this.minY,
        nx,
        ny,
        gap,
        reach
      );
    }

    // Chance to spawn a boot in a safe position (higher chance on ice platforms and in ice phase)
    if (bootSystem) {
      // Use higher spawn chance for ice platforms, even higher in the ice-heavy phase
      let bootSpawnChance = GAME_CONFIG.BOOT_SPAWN_CHANCE;
      if (platformType === "ice") {
        bootSpawnChance = GAME_CONFIG.BOOT_SPAWN_CHANCE_ON_ICE;
        // In the ice-heavy phase (>3000px), make boots even more common
        if (heightClimbed >= 3000) {
          bootSpawnChance = Math.min(
            0.7,
            GAME_CONFIG.BOOT_SPAWN_CHANCE_ON_ICE * 1.5
          ); // Up to 67.5% chance in ice phase
        }
      }

      if (Math.random() < bootSpawnChance) {
        bootSystem.spawnBoot(this.topX, this.minY, nx, ny, gap, reach);
      }
    }

    this.minY = ny;
    this.topX = nx;
  }

  randomReachableX(fromX, reach, platformWidth = 120, prevPlatformWidth = 120) {
    // Dynamic safety buffer based on available space and platform sizes
    const baseBuffer = Math.max(
      20,
      Math.min(40, (prevPlatformWidth + platformWidth) / 6)
    );
    const absoluteMinDistance =
      (prevPlatformWidth + platformWidth) / 2 + baseBuffer;

    // More generous reach calculation
    const maxReach = Math.max(48, Math.floor(reach * 0.95));
    const screenLeft = GAME_CONFIG.MARGIN_X + platformWidth / 2;
    const screenRight =
      GAME_CONFIG.WIDTH - GAME_CONFIG.MARGIN_X - platformWidth / 2;

    const reachableMinX = Math.max(screenLeft, fromX - maxReach);
    const reachableMaxX = Math.min(screenRight, fromX + maxReach);

    // If reachable area is too small, expand it
    if (reachableMaxX - reachableMinX < platformWidth + 20) {
      const extraReach = Math.floor(reach * 0.15); // Add 15% more reach as emergency
      const expandedMinX = Math.max(screenLeft, fromX - maxReach - extraReach);
      const expandedMaxX = Math.min(screenRight, fromX + maxReach + extraReach);

      // Use expanded bounds if they provide more space
      if (expandedMaxX - expandedMinX > reachableMaxX - reachableMinX) {
        return this.findBestPositionInRange(
          expandedMinX,
          expandedMaxX,
          fromX,
          absoluteMinDistance
        );
      }
    }

    // Define exclusion zone around previous platform
    const exclusionLeft = fromX - absoluteMinDistance;
    const exclusionRight = fromX + absoluteMinDistance;

    // Find valid placement zones
    const validZones = [];

    // Left zone
    if (reachableMinX < exclusionLeft) {
      const leftZoneEnd = Math.min(exclusionLeft, reachableMaxX);
      if (leftZoneEnd > reachableMinX + 10) {
        // Ensure minimum viable zone
        validZones.push({
          start: reachableMinX,
          end: leftZoneEnd,
          side: "left",
        });
      }
    }

    // Right zone
    if (reachableMaxX > exclusionRight) {
      const rightZoneStart = Math.max(exclusionRight, reachableMinX);
      if (reachableMaxX > rightZoneStart + 10) {
        // Ensure minimum viable zone
        validZones.push({
          start: rightZoneStart,
          end: reachableMaxX,
          side: "right",
        });
      }
    }

    // If we have valid zones, pick one randomly
    if (validZones.length > 0) {
      const chosenZone =
        validZones[Math.floor(Math.random() * validZones.length)];
      const x = Phaser.Math.Between(chosenZone.start, chosenZone.end);
      return x;
    }

    // Fallback: try to place with reduced safety requirements
    return this.findBestPositionInRange(
      reachableMinX,
      reachableMaxX,
      fromX,
      absoluteMinDistance * 0.7
    );
  }

  findBestPositionInRange(minX, maxX, fromX, minDistance) {
    // Try to maintain minimum distance if possible
    const leftOption = fromX - minDistance;
    const rightOption = fromX + minDistance;

    if (leftOption >= minX && leftOption <= maxX) {
      return leftOption;
    }
    if (rightOption >= minX && rightOption <= maxX) {
      return rightOption;
    }

    // If minimum distance can't be maintained, use the farthest available position
    const leftDistance = Math.abs(minX - fromX);
    const rightDistance = Math.abs(maxX - fromX);

    if (leftDistance >= rightDistance && minX >= minX) {
      return minX;
    } else if (maxX <= maxX) {
      return maxX;
    }

    // Last resort: place in the middle of available range
    return (minX + maxX) / 2;
  }

  maxHorizontalReachForGap(gap) {
    let best = 0;
    for (let r = 0; r <= 1.0001; r += 0.1) {
      const vy =
        GAME_CONFIG.BASE_JUMP_V * (1 - GAME_CONFIG.HEIGHT_REDUCTION_FRAC * r);
      const vy2 = vy * vy;
      const need = 2 * GAME_CONFIG.GRAVITY_Y * gap;
      if (vy2 < need) continue;
      const t = (vy + Math.sqrt(vy2 - need)) / GAME_CONFIG.GRAVITY_Y;
      const vx = Math.min(
        GAME_CONFIG.MAX_SPEED_X,
        r * (GAME_CONFIG.MOVE_SPEED + GAME_CONFIG.SIDE_IMPULSE_MAX)
      );
      const dx = vx * t;
      if (dx > best) best = dx;
    }
    return Math.max(best, 36);
  }

  updateWorldStreaming(
    camera,
    player,
    coinSystem = null,
    healthPackSystem = null,
    checkpointSystem = null,
    bootSystem = null
  ) {
    const camTop = camera.scrollY;

    // Spawn new platforms ahead
    while (this.minY > camTop - GAME_CONFIG.SPAWN_AHEAD) {
      this.spawnPlatformAbove(coinSystem, healthPackSystem, bootSystem);
    }

    // Recycle old platforms
    const despawnY = player.y + GAME_CONFIG.KEEP_BELOW;
    this.platforms.children.iterate((p) => {
      if (!p) return;
      if (p.y > despawnY) {
        const gap = Phaser.Math.Between(
          GAME_CONFIG.GAP_MIN,
          GAME_CONFIG.GAP_MAX
        );
        const reach = this.maxHorizontalReachForGap(gap);

        // Get platform width or use default
        const platformWidth = p.platformWidth || 120;
        const lastPlatform = this.platforms.getLast(true);
        const prevPlatformWidth =
          lastPlatform && lastPlatform.platformWidth
            ? lastPlatform.platformWidth
            : 120;

        const nx = this.randomReachableX(
          this.topX,
          reach,
          platformWidth,
          prevPlatformWidth
        );
        const ny = this.minY - gap;
        p.setPosition(nx, ny);

        // Reset any boot modifications when recycling platform
        if (p.bootModified) {
          // Restore original ice properties if it was an ice platform
          if (p.platformType === "ice") {
            p.friction = 0.5; // Original ice friction
            p.damageMultiplier = 1.0; // Original ice damage multiplier
          }
          p.bootModified = false;
        }

        p.refreshBody();
        this.minY = ny;
        this.topX = nx;
      }
    });
  }

  refreshPlatformBodies() {
    this.platforms.children.iterate((p) => p && p.refreshBody());
  }

  reset() {
    // Clear all platforms
    this.platforms.clear(true, true);

    // Reset position tracking
    this.minY = GAME_CONFIG.BASE_Y;
    this.topX = GAME_CONFIG.WIDTH / 2;

    // Regenerate initial platforms
    this.generateInitialPlatforms();
  }

  generateInitialPlatforms() {
    // Start platforms (use medium size for starting consistency)
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 70;
      const y = GAME_CONFIG.BASE_Y - (i % 2) * 40;
      const platform = this.platforms.create(x, y, "platform_medium");
      platform.platformWidth = 120;
    }

    // Initial top
    this.setTopFromGroup();

    // Seed upward
    for (let i = 0; i < 20; i++) this.spawnPlatformAbove();
  }
}
