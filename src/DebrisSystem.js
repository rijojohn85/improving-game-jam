// DebrisSystem.js - Manages falling debris that can hurt the player

import { GAME_CONFIG } from "./GameConfig.js";

export class DebrisSystem {
  constructor() {
    this.debrisGroup = null;
    this.nextDebrisAt = 0;
  }

  initialize(scene) {
    this.debrisGroup = scene.physics.add.group({
      allowGravity: true,
      collideWorldBounds: false,
    });

    this.nextDebrisAt = scene.time.now + GAME_CONFIG.DEBRIS_SPAWN_MS;
    return this.debrisGroup;
  }

  spawnDebris(scene) {
    const camTop = scene.cameras.main.scrollY;
    const x = Phaser.Math.Between(
      GAME_CONFIG.MARGIN_X,
      GAME_CONFIG.WIDTH - GAME_CONFIG.MARGIN_X
    );
    const y = camTop - Phaser.Math.Between(80, 180);
    const rock = this.debrisGroup.create(x, y, "debris");
    if (!rock) return;

    // SIZE KNOB applied here
    const baseScale =
      Phaser.Math.FloatBetween(0.7, 1.2) * GAME_CONFIG.DEBRIS_SCALE;
    rock.setScale(baseScale);

    rock.setAngle(Phaser.Math.Between(0, 360));
    rock.setBounce(Phaser.Math.FloatBetween(0.05, 0.2));
    rock.setVelocity(
      Phaser.Math.Between(
        -GAME_CONFIG.DEBRIS_VX_MAX,
        GAME_CONFIG.DEBRIS_VX_MAX
      ),
      Phaser.Math.Between(GAME_CONFIG.DEBRIS_VY_MIN, GAME_CONFIG.DEBRIS_VY_MAX)
    );
    rock.setAngularVelocity(
      Phaser.Math.Between(
        -GAME_CONFIG.DEBRIS_SPIN_MAX,
        GAME_CONFIG.DEBRIS_SPIN_MAX
      )
    );

    // Slower fall: reduce effective gravity and clamp terminal velocity
    rock.setGravityY(
      (GAME_CONFIG.DEBRIS_GRAVITY_MULT - 1) * GAME_CONFIG.GRAVITY_Y
    );
    rock.setMaxVelocity(400, GAME_CONFIG.DEBRIS_MAX_VY);

    rock.setDepth(2);

    // Shrink hitbox a bit so it feels fair
    if (rock.body && rock.body.setSize) {
      rock.body.setSize(6 * baseScale, 5 * baseScale, true);
    }

    // Auto-despawn timer
    scene.time.delayedCall(GAME_CONFIG.DEBRIS_LIFESPAN, () => {
      if (rock && rock.active) rock.destroy();
    });
  }

  onDebrisHitsPlayer(player, rock, audioSystem, scoringSystem, scene) {
    if (!rock.active) return;
    rock.destroy();

    if (audioSystem) {
      audioSystem.sfxDebrisHitPlayer();
    }

    if (scene) {
      scene.cameras.main.flash(80, 255, 180, 120);
    }

    if (scoringSystem) {
      const isDead = scoringSystem.setHealth(
        scoringSystem.health - GAME_CONFIG.DEBRIS_DMG
      );
      if (isDead) {
        scoringSystem.gameOver(scene, audioSystem);
      }
    }
  }

  onDebrisHitsPlatform(rock, platform, audioSystem) {
    if (!rock.active) return;

    if (audioSystem) {
      audioSystem.sfxDebrisThud();
    }

    rock.destroy();
  }

  update(scene) {
    const now = scene.time.now;

    // Spawn new debris
    if (
      now >= this.nextDebrisAt &&
      this.debrisGroup.getChildren().length < GAME_CONFIG.DEBRIS_MAX
    ) {
      this.spawnDebris(scene);
      this.nextDebrisAt =
        now +
        Phaser.Math.Between(
          GAME_CONFIG.DEBRIS_SPAWN_MS * 0.9,
          GAME_CONFIG.DEBRIS_SPAWN_MS * 1.4
        );
    }

    // Clean up off-screen debris
    const scrollY = scene.cameras.main.scrollY;
    const camBottom = scrollY + GAME_CONFIG.HEIGHT;

    this.debrisGroup.children.iterate((d) => {
      if (!d || !d.active) return;
      if (d.y > camBottom + 240 || d.y < scrollY - 2000) d.destroy();
    });
  }

  setupCollisions(platforms, player, audioSystem, scoringSystem, scene) {
    // Debris hits player
    scene.physics.add.overlap(
      player.getSprite(),
      this.debrisGroup,
      (playerSprite, rock) => {
        this.onDebrisHitsPlayer(
          playerSprite,
          rock,
          audioSystem,
          scoringSystem,
          scene
        );
      },
      null,
      scene
    );

    // Debris hits platforms
    scene.physics.add.collider(
      this.debrisGroup,
      platforms,
      (rock, platform) => {
        this.onDebrisHitsPlatform(rock, platform, audioSystem);
      },
      null,
      scene
    );
  }

  reset() {
    // Clear all debris
    if (this.debrisGroup) {
      this.debrisGroup.clear(true, true);
    }

    // Reset spawn timer
    this.nextDebrisAt = 0;

    console.log("DebrisSystem reset complete");
  }
}
