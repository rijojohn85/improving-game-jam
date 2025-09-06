// Player.js - Player character logic and physics

import { GAME_CONFIG } from "./GameConfig.js";

export class Player {
  constructor() {
    this.sprite = null;
    this.cursors = null;
    this.keysAD = null;
    this.spaceKey = null;
  }

  initialize(scene, startX, startY) {
    // Create player sprite
    this.sprite = scene.physics.add.sprite(startX, startY, "player_px_32x48");

    // Physics body sized so bottom of body == bottom of sprite (no visual gap)
    this.sprite.body.setSize(28, 46).setOffset(2, 2); // 2 + 46 = 48 -> bottoms align
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDragX(GAME_CONFIG.GROUND_DRAG_X);
    this.sprite.setMaxVelocity(GAME_CONFIG.MAX_SPEED_X, 2500);

    // Input setup
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keysAD = scene.input.keyboard.addKeys({ left: "A", right: "D" });
    this.spaceKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Initial upward velocity
    this.sprite.setVelocityY(-480);

    return this.sprite;
  }

  update(audioSystem = null) {
    if (!this.sprite) return;

    const leftPressed = this.cursors.left.isDown || this.keysAD.left.isDown;
    const rightPressed = this.cursors.right.isDown || this.keysAD.right.isDown;
    const grounded = this.sprite.body.blocked.down;

    // Drag swaps for air/ground
    this.sprite.setDragX(
      grounded ? GAME_CONFIG.GROUND_DRAG_X : GAME_CONFIG.AIR_DRAG_X
    );

    // Ground movement
    if (leftPressed) {
      this.sprite.setVelocityX(-GAME_CONFIG.MOVE_SPEED);
    } else if (rightPressed) {
      this.sprite.setVelocityX(GAME_CONFIG.MOVE_SPEED);
    } else if (grounded) {
      this.sprite.setVelocityX(0);
    }

    // Jump with run-up trade-off
    const jumpPressed =
      this.cursors.up.isDown || Phaser.Input.Keyboard.JustDown(this.spaceKey);

    if (jumpPressed && grounded) {
      const vxBefore = this.sprite.body.velocity.x;
      const runFrac = Phaser.Math.Clamp(
        Math.abs(vxBefore) / GAME_CONFIG.MOVE_SPEED,
        0,
        1
      );
      const vyMag =
        GAME_CONFIG.BASE_JUMP_V *
        (1 - GAME_CONFIG.HEIGHT_REDUCTION_FRAC * runFrac);
      this.sprite.setVelocityY(-vyMag);

      const dir = Math.sign(
        vxBefore || (rightPressed ? 1 : leftPressed ? -1 : 0)
      );
      if (dir !== 0) {
        const impulse = GAME_CONFIG.SIDE_IMPULSE_MAX * runFrac * dir;
        const newVx = Phaser.Math.Clamp(
          vxBefore + impulse,
          -GAME_CONFIG.MAX_SPEED_X,
          GAME_CONFIG.MAX_SPEED_X
        );
        this.sprite.setVelocityX(newVx);
      }

      if (audioSystem) {
        audioSystem.sfxJump(runFrac);
      }
    }

    // Pixel-perfect: snap grounded Y to integer row to avoid sub-pixel gaps
    if (grounded) {
      this.sprite.y = Math.round(this.sprite.y);
    }

    return {
      grounded,
      falling: !grounded && this.sprite.body.velocity.y > 20,
      position: { x: this.sprite.x, y: this.sprite.y },
      velocity: {
        x: this.sprite.body.velocity.x,
        y: this.sprite.body.velocity.y,
      },
    };
  }

  getSprite() {
    return this.sprite;
  }

  getPosition() {
    return this.sprite
      ? { x: this.sprite.x, y: this.sprite.y }
      : { x: 0, y: 0 };
  }

  addColliderWith(group) {
    if (this.sprite && group) {
      return this.sprite.scene.physics.add.collider(this.sprite, group);
    }
    return null;
  }

  addOverlapWith(group, callback, context = null) {
    if (this.sprite && group) {
      return this.sprite.scene.physics.add.overlap(
        this.sprite,
        group,
        callback,
        null,
        context
      );
    }
    return null;
  }
}
