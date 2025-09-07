// CheckpointSystem.js - Manages checkpoint spawning and save points

import { GAME_CONFIG } from "./GameConfig.js";

export class CheckpointSystem {
  constructor() {
    this.checkpointsGroup = null;
    this.lastCheckpointHeight = 0;
    this.currentCheckpoint = null;
    this.activeCheckpoints = new Set();
  }

  initialize(scene) {
    this.checkpointsGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });

    return this.checkpointsGroup;
  }

  shouldSpawnCheckpoint(currentHeightMeters) {
    const checkpointsMissed = Math.floor(
      currentHeightMeters / GAME_CONFIG.CHECKPOINT_INTERVAL_METERS
    );
    const expectedHeight =
      checkpointsMissed * GAME_CONFIG.CHECKPOINT_INTERVAL_METERS;

    // Only spawn if we've reached a new checkpoint milestone and haven't spawned one recently
    return (
      expectedHeight > this.lastCheckpointHeight &&
      currentHeightMeters >= expectedHeight
    );
  }

  spawnCheckpoint(x, y, heightMeters) {
    if (!this.checkpointsGroup) return;

    // Use red checkpoint texture for inactive checkpoints
    const checkpoint = this.checkpointsGroup.create(x, y, "checkpoint_red");
    if (!checkpoint) return;

    // Store checkpoint data
    checkpoint.heightMeters = heightMeters;
    checkpoint.isActive = false;
    checkpoint.spawnX = x;
    checkpoint.spawnY = y;

    console.log(
      `Checkpoint spawned at ${heightMeters}m (${Math.floor(x)}, ${Math.floor(
        y
      )})`
    );

    checkpoint.setDepth(5); // Above other collectibles
    checkpoint.body.setSize(28, 30, true); // Good hitbox for activation
    checkpoint.setOrigin(0.5, 1); // Bottom center origin
    
    // No need for tint since we're using the red texture directly

    // Add flag animation
    const scene = checkpoint.scene;
    if (scene && scene.tweens) {
      scene.tweens.add({
        targets: checkpoint,
        scaleX: 1.1,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.lastCheckpointHeight = heightMeters;
    return checkpoint;
  }

  activateCheckpoint(checkpoint, scoringSystem, audioSystem, scene) {
    if (checkpoint.isActive) return; // Already activated

    checkpoint.isActive = true;
    this.currentCheckpoint = checkpoint;
    this.activeCheckpoints.add(checkpoint);

    // Change checkpoint appearance to indicate activation - use green texture
    checkpoint.setTexture("checkpoint_green");
    
    // Show checkpoint comment if player position is available
    if (scoringSystem && scene) {
      // Get player position for the comment
      const player = scene.children.getByName("player");
      if (player) {
        scoringSystem.showCheckpointComment(scene, player.x, player.y);
      }
    }

    // Visual and audio feedback
    if (scene) {
      scene.cameras.main.flash(150, 0, 255, 0, false); // Green flash

      // Particle effect
      const particles = scene.add.particles(
        checkpoint.x,
        checkpoint.y - 15,
        "coin",
        {
          speed: { min: 50, max: 100 },
          scale: { start: 0.3, end: 0 },
          lifespan: 800,
          quantity: 8,
          tint: 0x00ff00,
        }
      );

      scene.time.delayedCall(1000, () => {
        particles.destroy();
      });
    }

    if (audioSystem) {
      audioSystem.sfxCheckpointSave();
    }

    if (scoringSystem) {
      scoringSystem.saveCheckpoint(checkpoint);
    }

    console.log(`Checkpoint activated at ${checkpoint.heightMeters}m!`);
  }

  getCurrentCheckpoint() {
    return this.currentCheckpoint;
  }

  getCheckpointPosition() {
    if (this.currentCheckpoint) {
      return {
        x: this.currentCheckpoint.spawnX,
        y: this.currentCheckpoint.spawnY,
        heightMeters: this.currentCheckpoint.heightMeters,
      };
    }
    return null;
  }

  update(scene) {
    // Clean up off-screen checkpoints (but keep active ones)
    const scrollY = scene.cameras.main.scrollY;
    const camBottom = scrollY + GAME_CONFIG.HEIGHT;

    this.checkpointsGroup.children.iterate((checkpoint) => {
      if (!checkpoint || !checkpoint.active) return;

      // Don't clean up active checkpoints
      if (checkpoint.isActive) return;

      // Clean up inactive checkpoints that are far off-screen
      if (checkpoint.y > camBottom + 1000 || checkpoint.y < scrollY - 3000) {
        checkpoint.destroy();
      }
    });
  }

  setupCollisions(player, scoringSystem, audioSystem, scene) {
    scene.physics.add.overlap(
      player.getSprite(),
      this.checkpointsGroup,
      (playerSprite, checkpoint) => {
        this.activateCheckpoint(checkpoint, scoringSystem, audioSystem, scene);
      },
      null,
      scene
    );
  }

  reset() {
    this.lastCheckpointHeight = 0;
    this.currentCheckpoint = null;
    this.activeCheckpoints.clear();
    
    // Reset all checkpoints to red when game resets
    if (this.checkpointsGroup) {
      this.checkpointsGroup.children.iterate((checkpoint) => {
        if (checkpoint && checkpoint.active) {
          checkpoint.setTexture("checkpoint_red"); // Use red texture
          checkpoint.isActive = false;
        }
      });
    }
  }
}
