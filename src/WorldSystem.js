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

    // Generate initial platforms
    this.generateInitialPlatforms();

    return this.platforms;
  }

  selectRandomPlatformSize() {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < GAME_CONFIG.PLATFORM_SIZES.length; i++) {
      cumulativeWeight += GAME_CONFIG.PLATFORM_WEIGHTS[i];
      if (random <= cumulativeWeight) {
        return GAME_CONFIG.PLATFORM_SIZES[i];
      }
    }

    // Fallback to medium size
    return GAME_CONFIG.PLATFORM_SIZES[1];
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

  spawnPlatformAbove(coinSystem = null, healthPackSystem = null) {
    const gap = Phaser.Math.Between(GAME_CONFIG.GAP_MIN, GAME_CONFIG.GAP_MAX);
    const reach = this.maxHorizontalReachForGap(gap);

    // Select random platform size
    const platformSize = this.selectRandomPlatformSize();

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
    const platform = this.platforms.create(nx, ny, platformSize.key);

    // Store platform width for spacing calculations
    platform.platformWidth = platformSize.width;

    // Chance to spawn a coin in a risky but reachable position
    if (coinSystem && Math.random() < GAME_CONFIG.COIN_SPAWN_CHANCE) {
      console.log(
        `Spawning coin at height ${Math.floor(
          (GAME_CONFIG.BASE_Y - ny) / 100
        )} meters`
      );
      coinSystem.spawnRiskyCoin(this.topX, this.minY, nx, ny, gap, reach);
    }

    // Chance to spawn a health pack in a safe position
    if (
      healthPackSystem &&
      Math.random() < GAME_CONFIG.HEALTH_PACK_SPAWN_CHANCE
    ) {
      console.log(
        `Spawning health pack at height ${Math.floor(
          (GAME_CONFIG.BASE_Y - ny) / 100
        )} meters`
      );
      healthPackSystem.spawnHealthPack(
        this.topX,
        this.minY,
        nx,
        ny,
        gap,
        reach
      );
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
    checkpointSystem = null
  ) {
    const camTop = camera.scrollY;

    // Spawn new platforms ahead
    while (this.minY > camTop - GAME_CONFIG.SPAWN_AHEAD) {
      this.spawnPlatformAbove(coinSystem, healthPackSystem);
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

    console.log("WorldSystem reset complete");
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
