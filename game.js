// Pixel Climber - game.js
// Health / fall damage
// Pixel theme + tiny human (32x48). Air-gap fixed via integer sprite + body fit.

(() => {
  const W = 480,
    H = 800;

  // ---- Tunables ----
  const GRAVITY_Y = 1000;
  const MOVE_SPEED = 240; // ground move speed target
  const BASE_JUMP_V = 640; // vertical speed from standstill
  const HEIGHT_REDUCTION_FRAC = 0.35; // full run-up => 35% less vertical speed
  const SIDE_IMPULSE_MAX = 180; // extra sideways boost at takeoff
  const GROUND_DRAG_X = 900; // snappy ground control
  const AIR_DRAG_X = 140; // light drag in air (momentum carries)
  const MAX_SPEED_X = 380; // horizontal speed cap
  const MARGIN_X = 48; // keep platforms away from walls

  // World streaming window
  const SPAWN_AHEAD = 1200; // content ABOVE camera top
  const KEEP_BELOW = 1800; // content BELOW player (preserved)

  // Jump / gaps
  const MAX_JUMP_H = BASE_JUMP_V ** 2 / (2 * GRAVITY_Y);
  const GAP_MIN = Math.floor(MAX_JUMP_H * 0.55);
  const GAP_MAX = Math.floor(MAX_JUMP_H * 0.85);

  // Health / fall damage
  const SAFE_DROP_PX = Math.round(MAX_JUMP_H * 1.05);
  const DMG_PER_50PX = 12;
  const MAX_HEALTH = 100;

  // Simple scoring system
  const POINTS_PER_METER = 10; // Points for height climbed

  // --- Debris knobs (size + slower behavior) ---
  const DEBRIS_SCALE = 0.9; // SIZE KNOB (0.5 smaller … 2.0 larger)
  const DEBRIS_MAX = 24; // max debris alive
  const DEBRIS_SPAWN_MS = 1200; // slower spawn
  const DEBRIS_DMG = 10;
  const DEBRIS_LIFESPAN = 9000;

  // Motion (slower fall, gentler drift/spin)
  const DEBRIS_VY_MIN = 120;
  const DEBRIS_VY_MAX = 220;
  const DEBRIS_MAX_VY = 260;
  const DEBRIS_GRAVITY_MULT = 0.55; // effective gravity vs world (1 = normal, <1 = slower)
  const DEBRIS_VX_MAX = 40;
  const DEBRIS_SPIN_MAX = 140;

  // --- Audio (WebAudio; no assets needed) ---
  let AC, masterGain, musicGain, sfxGain;
  let musicStarted = false,
    muted = false,
    musicTimer = null;

  function ensureAC() {
    if (AC) return;
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(AC.destination);
    musicGain = AC.createGain();
    musicGain.gain.value = 0.05;
    musicGain.connect(masterGain);
    sfxGain = AC.createGain();
    sfxGain.gain.value = 0.18;
    sfxGain.connect(masterGain);
  }
  function hookAudioResume() {
    const resume = () => {
      ensureAC();
      if (AC.state === "suspended") AC.resume();
      startMusic();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
  }
  function setupAudioUI() {
    const btn = document.getElementById("muteBtn");
    if (!btn) return;
    btn.onclick = () => {
      ensureAC();
      muted = !muted;
      masterGain.gain.setTargetAtTime(muted ? 0 : 1, AC.currentTime, 0.05);
      btn.textContent = muted ? "🔇" : "🔊";
    };
  }
  function startMusic() {
    if (musicStarted) return;
    ensureAC();
    const o1 = AC.createOscillator(),
      o2 = AC.createOscillator();
    o1.type = "sine";
    o2.type = "triangle";
    o1.connect(musicGain);
    o2.connect(musicGain);
    o1.start();
    o2.start();
    let i = 0;
    const notes = [220.0, 233.08, 261.63, 293.66];
    const fifths = [330.0, 349.23, 392.0, 440.0];
    musicTimer = setInterval(() => {
      if (!AC) return;
      o1.frequency.setTargetAtTime(
        notes[i % notes.length],
        AC.currentTime,
        0.08
      );
      o2.frequency.setTargetAtTime(
        fifths[i % fifths.length],
        AC.currentTime,
        0.08
      );
      i++;
    }, 900);
    musicStarted = true;
  }
  function sfxTone(freq, dur = 0.08, type = "triangle", vol = 1) {
    ensureAC();
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(sfxGain);
    g.gain.setValueAtTime(0.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.14 * vol, AC.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
    o.start();
    o.stop(AC.currentTime + dur);
  }
  function sfxSweep(f1, f2, dur = 0.12, type = "triangle", vol = 1) {
    ensureAC();
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, AC.currentTime);
    o.connect(g);
    g.connect(sfxGain);
    g.gain.setValueAtTime(0.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12 * vol, AC.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
    o.start();
    o.frequency.linearRampToValueAtTime(f2, AC.currentTime + dur * 0.9);
    o.stop(AC.currentTime + dur);
  }
  function sfxNoise(dur = 0.08, vol = 1, cutoff = 500) {
    ensureAC();
    const buffer = AC.createBuffer(
      1,
      Math.floor(AC.sampleRate * dur),
      AC.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource();
    src.buffer = buffer;
    const flt = AC.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.value = cutoff;
    const g = AC.createGain();
    g.gain.value = 0.18 * vol;
    src.connect(flt);
    flt.connect(g);
    g.connect(sfxGain);
    src.start();
  }
  function sfxJump(runFrac) {
    const start = 700,
      end = start + 200 * (1 - runFrac);
    sfxSweep(start, end, 0.12, "triangle", 0.9);
  }
  function sfxLand(dropPx, dmg) {
    const intensity = Phaser.Math.Clamp(dropPx / (SAFE_DROP_PX * 2), 0.2, 1.0);
    sfxTone(140 - 50 * intensity, 0.07, "sine", 0.9 * intensity);
    sfxNoise(0.08 + 0.04 * intensity, 0.7 * intensity, 600 - 300 * intensity);
    if (dmg > 0) sfxTone(90, 0.12, "square", 0.6 * intensity);
  }
  function sfxDebrisHitPlayer() {
    sfxTone(700, 0.05, "square", 0.5);
    sfxNoise(0.05, 0.4, 900);
  }
  function sfxDebrisThud() {
    sfxTone(180, 0.05, "sine", 0.4);
    sfxNoise(0.05, 0.3, 500);
  }

  const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    backgroundColor: "#0b0f17",
    physics: {
      default: "arcade",
      arcade: { gravity: { y: GRAVITY_Y }, debug: false },
    },
    render: { pixelArt: true, antialias: false, roundPixels: true }, // crisp pixels
    pixelArt: true,
    scene: { preload, create, update },
  };

  // --- State
  let gameConfig, scene;
  let player, cursors, keysAD, spaceKey;
  let platforms, minY, topX;
  let mtnFar, mtnMid, mtnNear;
  let debrisGroup, nextDebrisAt;

  // Health UI
  let health = MAX_HEALTH,
    bestHeight = 0,
    falling = false,
    fallStartY = 0;
  let heightText, hpTextEl, hpFillEl;

  // Simple scoring system state
  let score = 0;
  let lastHeight = 0;
  let scoreText;

  new Phaser.Game(config);

  // ---------- Pixel art helpers (procedural, blocky) ----------

  function makePixelSky(scene) {
    // 8px banded gradient for a pixel feel
    const bands = 8;
    const g = scene.add.graphics();
    for (let i = 0; i < H; i += bands) {
      const t = i / H;
      const r = Math.round(11 + (23 - 11) * t); // 0x0b -> 0x17
      const gC = Math.round(15 + (34 - 15) * t); // 0x0f -> 0x22
      const b = Math.round(23 + (51 - 23) * t); // 0x17 -> 0x33
      const col = (r << 16) | (gC << 8) | b;
      g.fillStyle(col, 1);
      g.fillRect(0, i, W, bands);
    }
    g.generateTexture("skytex", W, H);
    g.destroy();
  }

  function makePixelMountains(scene, key, color, amp = 60, stepX = 4) {
    // Column-stepped silhouette ridge (blocky)
    const width = W,
      height = 200;
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

  function makePixelPlatformTexture(scene) {
    const g = scene.add.graphics();
    // Base block
    const base = 0x6b5846; // brownish rock
    g.fillStyle(base, 1);
    g.fillRect(0, 0, 120, 18);

    // Top highlight (2px)
    g.fillStyle(0x8e745c, 1);
    g.fillRect(0, 0, 120, 2);
    // Bottom shadow (2px)
    g.fillStyle(0x4a3b2c, 1);
    g.fillRect(0, 16, 120, 2);

    // "Bricks" as 6x4 blocks
    g.fillStyle(0x7a644f, 0.9);
    for (let y = 3; y <= 12; y += 4) {
      for (let x = y % 8 ? 6 : 3; x <= 114; x += 12) {
        g.fillRect(x, y, 6, 4);
      }
    }
    // Small pits
    g.fillStyle(0x5a4738, 0.7);
    for (let i = 0; i < 16; i++) {
      const x = 4 + Math.floor(Math.random() * 112);
      const y = 3 + Math.floor(Math.random() * 10);
      g.fillRect(x, y, 2, 2);
    }

    g.generateTexture("platform", 120, 18);
    g.destroy();
  }

  function makePixelPlayerTexture(scene) {
    // 32x48 tiny human, integer size (prevents "air gap" when colliding)
    const key = "player_px_32x48";
    const tex = scene.textures.createCanvas(key, 32, 48);
    const c = tex.getContext();

    // helper draws 2x2 blocks => crunchy pixels
    const px = (x, y, w = 2, h = 2, col = "#fff") => {
      c.fillStyle = col;
      c.fillRect(x, y, w, h);
    };

    // palette
    const SKIN = "#f3c999";
    const HAIR = "#3a2a20";
    const SHIRT = "#3a6ea5";
    const PANTS = "#2b2d42";
    const BOOTS = "#4b3d31";

    // hair
    px(10, 4, 12, 6, HAIR);
    px(8, 6, 2, 4, HAIR);
    px(22, 6, 2, 4, HAIR);
    // head
    px(10, 10, 12, 10, SKIN);
    px(8, 12, 2, 6, SKIN);
    px(22, 12, 2, 6, SKIN);
    // neck
    px(14, 20, 4, 2, SKIN);

    // torso (shirt)
    px(8, 22, 16, 10, SHIRT);
    // arms
    px(6, 24, 2, 6, SHIRT);
    px(24, 24, 2, 6, SHIRT);
    // hands
    px(6, 30, 2, 2, SKIN);
    px(24, 30, 2, 2, SKIN);

    // legs
    px(12, 32, 4, 10, PANTS);
    px(16, 32, 4, 10, PANTS);
    // boots
    px(10, 44, 8, 4, BOOTS);
    px(18, 44, 8, 4, BOOTS);

    tex.refresh();
  }

  function makePixelDebrisTexture(scene) {
    const key = "debris";
    const tex = scene.textures.createCanvas(key, 8, 7);
    const c = tex.getContext();
    const ROCK = "#6f5a46",
      EDGE = "#4a3b2c",
      DOT = "#8e745c";

    // irregular chunk mask
    const mask = [
      " .####. ",
      "######.#",
      "####### ",
      "######  ",
      "#####   ",
      " ###    ",
      "  #     ",
    ];
    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        if (mask[y][x] === "#") {
          c.fillStyle = ROCK;
          c.fillRect(x, y, 1, 1);
        }
      }
    }
    // edge/dots
    c.fillStyle = EDGE;
    c.fillRect(0, 1, 1, 1);
    c.fillRect(6, 1, 1, 1);
    c.fillRect(1, 2, 1, 1);
    c.fillStyle = DOT;
    c.fillRect(3, 2, 1, 1);
    c.fillRect(2, 4, 1, 1);

    tex.refresh();
  }

  function preload() {
    makePixelSky(this);
    makePixelMountains(this, "mtn_far", 0x0d1320, 40, 4);
    makePixelMountains(this, "mtn_mid", 0x111a2a, 70, 4);
    makePixelMountains(this, "mtn_near", 0x162234, 110, 4);
    makePixelPlatformTexture(this);
    makePixelPlayerTexture(this);
    makePixelDebrisTexture(this);
  }

  function create() {
    scene = this;
    scene.cameras.main.roundPixels = true; // extra crisp

    // Parallax background (fixed to camera)
    skyImg = this.add
      .image(0, 0, "skytex")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0);
    mtnFar = this.add
      .tileSprite(0, H - 180, W, H + 360, "mtn_far")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);
    mtnMid = this.add
      .tileSprite(0, H - 120, W, H + 360, "mtn_mid")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);
    mtnNear = this.add
      .tileSprite(0, H - 60, W, H + 360, "mtn_near")
      .setOrigin(0, 1)
      .setScrollFactor(0, 0);
    mtnFar.setAlpha(0.9).setDepth(-30);
    mtnMid.setAlpha(0.95).setDepth(-20);
    mtnNear.setAlpha(1).setDepth(-10);

    const worldHeight = 40000;
    this.physics.world.setBounds(
      0,
      -worldHeight,
      W,
      worldHeight + H,
      true,
      true,
      true,
      true
    );

    platforms = this.physics.add.staticGroup();
    const baseY = 680;

    // Start platforms
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 70,
        y = baseY - (i % 2) * 40;
      platforms.create(x, y, "platform");
    }

    // Initial top
    setTopFromGroup();

    // Seed upward
    for (let i = 0; i < 20; i++) spawnPlatformAbove();

    // Player (exact 32x48 pixel texture; no fractional scaling)
    player = this.physics.add.sprite(W / 2, baseY - 60, "player_px_32x48");
    // Physics body sized so bottom of body == bottom of sprite (no visual gap)
    player.body.setSize(28, 46).setOffset(2, 2); // 2 + 46 = 48 -> bottoms align
    player.setCollideWorldBounds(true);
    player.setDragX(GROUND_DRAG_X);
    player.setMaxVelocity(MAX_SPEED_X, 2500);
    this.physics.add.collider(player, platforms);
    platforms.children.iterate((p) => p && p.refreshBody()); // ensure statics are synced

    // Debris
    debrisGroup = this.physics.add.group({
      allowGravity: true,
      collideWorldBounds: false,
    });
    this.physics.add.overlap(
      player,
      debrisGroup,
      onDebrisHitsPlayer,
      null,
      this
    );
    this.physics.add.collider(
      debrisGroup,
      platforms,
      onDebrisHitsPlatform,
      null,
      this
    );

    // Camera
    const cam = this.cameras.main;
    cam.setBounds(0, -worldHeight, W, worldHeight + H);
    cam.startFollow(player, true, 0.1, 0.1);

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    keysAD = this.input.keyboard.addKeys({ left: "A", right: "D" });
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // HUD
    heightText = document.getElementById("height");
    hpTextEl = document.getElementById("hptext");
    hpFillEl = document.getElementById("hpfill");
    scoreText = document.getElementById("score");

    setHealth(MAX_HEALTH);
    resetScore();
    hookAudioResume();
    setupAudioUI(); // Kick off
    player.setVelocityY(-480);
  }

  function update() {
    const leftPressed = cursors.left.isDown || keysAD.left.isDown;
    const rightPressed = cursors.right.isDown || keysAD.right.isDown;
    const grounded = player.body.blocked.down;

    // Parallax
    const scrollY = this.cameras.main.scrollY;
    mtnFar.tilePositionY = -scrollY * 0.12;
    mtnMid.tilePositionY = -scrollY * 0.26;
    mtnNear.tilePositionY = -scrollY * 0.42;
    const px = Phaser.Math.Clamp((player?.x ?? W / 2) - W / 2, -W / 2, W / 2);
    mtnFar.tilePositionX = px * 0.02;
    mtnMid.tilePositionX = px * 0.05;
    mtnNear.tilePositionX = px * 0.09;

    // Drag swaps for air/ground
    player.setDragX(grounded ? GROUND_DRAG_X : AIR_DRAG_X);

    // Ground movement
    if (leftPressed) player.setVelocityX(-MOVE_SPEED);
    else if (rightPressed) player.setVelocityX(MOVE_SPEED);
    else if (grounded) player.setVelocityX(0);

    // Jump with run-up trade-off
    const jumpPressed =
      cursors.up.isDown || Phaser.Input.Keyboard.JustDown(spaceKey);
    if (jumpPressed && grounded) {
      const vxBefore = player.body.velocity.x;
      const runFrac = Phaser.Math.Clamp(Math.abs(vxBefore) / MOVE_SPEED, 0, 1);
      const vyMag = BASE_JUMP_V * (1 - HEIGHT_REDUCTION_FRAC * runFrac);
      player.setVelocityY(-vyMag);
      const dir = Math.sign(
        vxBefore || (rightPressed ? 1 : leftPressed ? -1 : 0)
      );
      if (dir !== 0) {
        const impulse = SIDE_IMPULSE_MAX * runFrac * dir;
        const newVx = Phaser.Math.Clamp(
          vxBefore + impulse,
          -MAX_SPEED_X,
          MAX_SPEED_X
        );
        player.setVelocityX(newVx);
      }
      sfxJump(runFrac);
    }

    // Fall detection & damage on landing
    if (!grounded && player.body.velocity.y > 20 && !falling) {
      falling = true;
      fallStartY = player.y;
    }
    if (grounded && falling) {
      const drop = Math.max(0, player.y - fallStartY);
      applyFallDamage(drop);
      falling = false;
    }

    // Pixel-perfect: snap grounded Y to integer row to avoid sub-pixel gaps
    if (grounded) player.y = Math.round(player.y);

    // ---- WORLD STREAMING ----
    const camTop = this.cameras.main.scrollY;
    while (minY > camTop - SPAWN_AHEAD) spawnPlatformAbove();

    const despawnY = player.y + KEEP_BELOW;
    platforms.children.iterate((p) => {
      if (!p) return;
      if (p.y > despawnY) {
        const gap = Phaser.Math.Between(GAP_MIN, GAP_MAX);
        const reach = maxHorizontalReachForGap(gap);
        const nx = randomReachableX(topX, reach);
        const ny = minY - gap;
        p.setPosition(nx, ny);
        p.refreshBody();
        minY = ny;
        topX = nx;
      }
    });

    // ---- DEBRIS ----
    const now = this.time.now;
    if (now >= nextDebrisAt && debrisGroup.getChildren().length < DEBRIS_MAX) {
      spawnDebris(this);
      nextDebrisAt =
        now + Phaser.Math.Between(DEBRIS_SPAWN_MS * 0.9, DEBRIS_SPAWN_MS * 1.4);
    }

    const camBottom = scrollY + H;
    debrisGroup.children.iterate((d) => {
      if (!d || !d.active) return;
      if (d.y > camBottom + 240 || d.y < scrollY - 2000) d.destroy();
    });

    // Simple scoring system update
    checkHeightProgress();

    // HUD
    const climbed = Math.max(0, Math.floor((-player.y + 700) / 10));
    if (climbed > bestHeight) bestHeight = climbed;
    if (heightText) heightText.textContent = String(bestHeight);
  }

  // ----- Debris helpers -----

  function spawnDebris(scene) {
    const camTop = scene.cameras.main.scrollY;
    const x = Phaser.Math.Between(MARGIN_X, W - MARGIN_X);
    const y = camTop - Phaser.Math.Between(80, 180);
    const rock = debrisGroup.create(x, y, "debris");
    if (!rock) return;

    // SIZE KNOB applied here
    const baseScale = Phaser.Math.FloatBetween(0.7, 1.2) * DEBRIS_SCALE;
    rock.setScale(baseScale);

    rock.setAngle(Phaser.Math.Between(0, 360));
    rock.setBounce(Phaser.Math.FloatBetween(0.05, 0.2));
    rock.setVelocity(
      Phaser.Math.Between(-DEBRIS_VX_MAX, DEBRIS_VX_MAX),
      Phaser.Math.Between(DEBRIS_VY_MIN, DEBRIS_VY_MAX)
    );
    rock.setAngularVelocity(
      Phaser.Math.Between(-DEBRIS_SPIN_MAX, DEBRIS_SPIN_MAX)
    );

    // Slower fall: reduce effective gravity and clamp terminal velocity
    rock.setGravityY((DEBRIS_GRAVITY_MULT - 1) * GRAVITY_Y); // e.g. 0.55 => adds -0.45*g
    rock.setMaxVelocity(400, DEBRIS_MAX_VY);

    rock.setDepth(2);

    // Shrink hitbox a bit so it feels fair
    if (rock.body && rock.body.setSize) {
      rock.body.setSize(6 * baseScale, 5 * baseScale, true);
    }

    // Auto-despawn timer
    scene.time.delayedCall(DEBRIS_LIFESPAN, () => {
      if (rock && rock.active) rock.destroy();
    });
  }

  function onDebrisHitsPlayer(player, rock) {
    if (!rock.active) return;
    rock.destroy();
    sfxDebrisHitPlayer();
    scene.cameras.main.flash(80, 255, 180, 120);
    setHealth(health - DEBRIS_DMG);
  }

  function onDebrisHitsPlatform(rock /*, platform*/) {
    if (!rock.active) return;
    sfxDebrisThud();
    rock.destroy();
  }

  // ----- Reach-aware spawning helpers -----

  function setTopFromGroup() {
    let top = null;
    platforms.children.iterate((p) => {
      if (!p) return;
      if (!top || p.y < top.y) top = p;
    });
    if (!top) {
      minY = 680;
      topX = W / 2;
      return;
    }
    minY = top.y;
    topX = top.x;
  }

  function spawnPlatformAbove() {
    const gap = Phaser.Math.Between(GAP_MIN, GAP_MAX);
    const reach = maxHorizontalReachForGap(gap);
    const nx = randomReachableX(topX, reach);
    const ny = minY - gap;
    platforms.create(nx, ny, "platform");
    minY = ny;
    topX = nx;
  }

  function randomReachableX(fromX, reach) {
    const r = Math.max(32, Math.floor(reach * 0.9)); // safety margin

    // Platform width is 120, max 30% overlap = 36px, so min center distance = 84px
    const PLATFORM_WIDTH = 120;
    const MAX_OVERLAP_PERCENT = 0.3;
    const MIN_CENTER_DISTANCE = PLATFORM_WIDTH * (1 - MAX_OVERLAP_PERCENT);

    // Calculate valid range considering overlap constraint
    // New platform center must be at least MIN_CENTER_DISTANCE away from previous center
    const overlapMinX = fromX - MIN_CENTER_DISTANCE;
    const overlapMaxX = fromX + MIN_CENTER_DISTANCE;

    // Combine reachability and overlap constraints
    let validRanges = [];

    // Left side range (if reachable)
    const leftMin = Math.max(MARGIN_X, fromX - r);
    const leftMax = Math.min(overlapMinX, fromX + r);
    if (leftMax > leftMin) {
      validRanges.push([leftMin, leftMax]);
    }

    // Right side range (if reachable)
    const rightMin = Math.max(overlapMaxX, fromX - r);
    const rightMax = Math.min(W - MARGIN_X, fromX + r);
    if (rightMax > rightMin) {
      validRanges.push([rightMin, rightMax]);
    }

    // If no valid ranges due to overlap constraint, fall back to reachability only
    if (validRanges.length === 0) {
      const fallbackMinX = Math.max(MARGIN_X, fromX - r);
      const fallbackMaxX = Math.min(W - MARGIN_X, fromX + r);
      return Phaser.Math.Between(fallbackMinX, fallbackMaxX);
    }

    // Choose randomly from valid ranges
    const chosenRange =
      validRanges[Math.floor(Math.random() * validRanges.length)];
    return Phaser.Math.Between(chosenRange[0], chosenRange[1]);
  }

  function maxHorizontalReachForGap(gap) {
    let best = 0;
    for (let r = 0; r <= 1.0001; r += 0.1) {
      const vy = BASE_JUMP_V * (1 - HEIGHT_REDUCTION_FRAC * r);
      const vy2 = vy * vy,
        need = 2 * GRAVITY_Y * gap;
      if (vy2 < need) continue;
      const t = (vy + Math.sqrt(vy2 - need)) / GRAVITY_Y;
      const vx = Math.min(MAX_SPEED_X, r * (MOVE_SPEED + SIDE_IMPULSE_MAX));
      const dx = vx * t;
      if (dx > best) best = dx;
    }
    return Math.max(best, 36);
  }

  // ----- Health / damage -----

  function setHealth(newValue) {
    health = Phaser.Math.Clamp(newValue, 0, MAX_HEALTH);
    if (hpTextEl) hpTextEl.textContent = String(health);
    if (hpFillEl) hpFillEl.style.width = (health / MAX_HEALTH) * 100 + "%";
    if (hpFillEl) {
      const c = health / MAX_HEALTH;
      hpFillEl.style.filter = `saturate(${0.8 + 0.4 * c}) brightness(${
        0.9 + 0.2 * c
      })`;
    }
    if (health <= 0) {
      scene.cameras.main.shake(200, 0.01);
      bestHeight = 0;
      resetScore();
      scene.time.delayedCall(220, () => scene.scene.restart());
    }
  }

  function applyFallDamage(dropPx) {
    const excess = Math.max(0, dropPx - SAFE_DROP_PX);
    const dmg = Math.round((excess / 50) * DMG_PER_50PX);
    sfxLand(dropPx, dmg);
    if (dmg > 0) {
      scene.cameras.main.flash(120, 255, 64, 64);
      setHealth(health - dmg);
    }
  }

  // ----- Simple Scoring System -----

  function addScore(points) {
    if (points <= 0) return;
    score += points;
    updateScoreDisplay();
  }

  function resetScore() {
    score = 0;
    lastHeight = 0;
    updateScoreDisplay();
  }

  function updateScoreDisplay() {
    if (scoreText) scoreText.textContent = `Score: ${score.toLocaleString()}`;
  }

  function checkHeightProgress() {
    const currentHeight = Math.max(0, Math.floor((-player.y + 700) / 10));
    if (currentHeight > lastHeight) {
      const heightGained = currentHeight - lastHeight;
      const points = heightGained * POINTS_PER_METER;
      addScore(points);
      lastHeight = currentHeight;
    }
  }
})();
