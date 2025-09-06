// --- Infrastructure Jenga (Stacker with DevOps chaos) ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("high");
const instBar = document.getElementById("instBar");
const driftInEl = document.getElementById("driftIn");
const overlay = document.getElementById("overlay");
const overTitle = document.getElementById("overTitle");
const overMsg = document.getElementById("overMsg");
const finalScoreEl = document.getElementById("finalScore");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const refactorBtn = document.getElementById("refactorBtn");
const testsBtn = document.getElementById("testsBtn");
const rollbackBtn = document.getElementById("rollbackBtn");
const againBtn = document.getElementById("againBtn");

const DPR = window.devicePixelRatio || 1;
resizeCanvas();

// ---- Game constants
const W = canvas.width,
  H = canvas.height;
const BLOCK_H = 26;
const BASE_W = 220;
const MIN_W = 36;
const COLORS = [
  "#7cc5ff",
  "#9ae6b4",
  "#fbd38d",
  "#c4b5fd",
  "#fca5a5",
  "#93c5fd",
  "#f0abfc",
  "#a7f3d0",
];
const LABELS = [
  "api-gateway",
  "service-mesh",
  "k8s",
  "helm",
  "pulumi",
  "terraform",
  "redis",
  "postgres",
  "nginx",
  "otel",
  "feature-flag",
  "canary",
  "rate-limit",
  "autoscaler",
  "secret",
  "s3-bucket",
  "vpc",
  "ingress",
  "istio",
  "proxy",
  "queue",
  "cache",
];

// ---- State
let state = null;

function initState() {
  return {
    running: false,
    paused: false,
    score: 0,
    high: Number(localStorage.getItem("ij_high") || 0),
    instability: 0, // 0-100
    testsLevel: 0, // reduces drift
    blocks: [],
    mover: null, // moving block (before drop)
    speed: 2.3,
    driftTimer: 0,
    driftInterval: rand(7, 12),
    lastTime: performance.now(),
    inputDrop: false,
    canInteract: true,
  };
}

function startGame() {
  state = initState();
  buildBase();
  spawnMover();
  state.running = true;
  overlay.classList.add("hidden");
  pauseBtn.disabled = false;
  loop();
}
function gameOver(reason = "Stack collapsed") {
  state.running = false;
  state.paused = false;
  pauseBtn.disabled = true;
  startBtn.disabled = false;
  overlay.classList.remove("hidden");
  overTitle.textContent = "Game Over";
  overMsg.textContent = reason;
  finalScoreEl.textContent = state.score;
  if (state.score > state.high) {
    state.high = state.score;
    localStorage.setItem("ij_high", String(state.score));
  }
  updateHUD();
}

function buildBase() {
  const base = newBlock(
    (W - BASE_W) / 2,
    H - BLOCK_H,
    BASE_W,
    "#5eead4",
    "prod-base"
  );
  state.blocks.push(base);
}

function spawnMover() {
  const top = state.blocks[state.blocks.length - 1];
  const w = clamp(top.w + rand(-40, 28), MIN_W + 10, 280);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const label = LABELS[Math.floor(Math.random() * LABELS.length)];
  const mover = newBlock(0, top.y - BLOCK_H, w, color, label);
  mover.dir = Math.random() < 0.5 ? 1 : -1;
  mover.x = mover.dir === 1 ? -w / 2 : W - w / 2; // start slightly off
  mover.moving = true;
  state.mover = mover;
}

function newBlock(x, y, w, color, label) {
  return { x, y, w, h: BLOCK_H, color, label };
}

// ---- Mechanics
function loop() {
  if (!state || !state.running) return;
  const now = performance.now();
  const dt = (now - state.lastTime) / 16.6667; // ~frames
  state.lastTime = now;
  if (!state.paused) {
    update(dt);
    render();
  }
  requestAnimationFrame(loop);
}

function update(dt) {
  // Move mover horizontally
  if (state.mover && state.mover.moving) {
    state.mover.x += state.speed * (state.mover.dir || 1) * dt;
    if (state.mover.x <= -state.mover.w / 2) {
      state.mover.dir = 1;
    }
    if (state.mover.x + state.mover.w / 2 >= W) {
      state.mover.dir = -1;
    }
  }

  // Drop on input
  if (state.inputDrop && state.mover) {
    state.mover.moving = false;
    state.mover.falling = true;
    state.inputDrop = false;
    beep(660, 0.05, "sine");
  }

  // Animate fall
  if (state.mover && state.mover.falling) {
    const targetY = state.blocks[state.blocks.length - 1].y - BLOCK_H;
    state.mover.y += Math.max(6.5, 9.5 - state.speed) * dt;
    if (state.mover.y >= targetY) {
      state.mover.y = targetY;
      landMover();
    }
  }

  // Drift timer
  state.driftTimer += dt / 60; // seconds
  const driftScale = [1, 0.7, 0.5][Math.min(state.testsLevel, 2)]; // tests reduce frequency by 30/50%
  if (state.driftTimer >= state.driftInterval * driftScale) {
    doDrift();
    state.driftTimer = 0;
    state.driftInterval = rand(7, 12);
  }

  // Difficulty ramps slightly
  state.speed = Math.min(5.0, 2.3 + state.score * 0.03);

  // HUD
  updateHUD();
}

function landMover() {
  const top = state.blocks[state.blocks.length - 1];
  const m = state.mover;
  // Compute overlap
  const left = Math.max(m.x, top.x);
  const right = Math.min(m.x + m.w, top.x + top.w);
  const overlap = right - left;

  if (overlap <= 0) {
    // Missed entirely -> collapse
    renderCut(top, m);
    beep(180, 0.12, "square");
    return gameOver("No overlap — deployment toppled!");
  }

  // Trim and create falling offcut
  const misalign = 1 - overlap / m.w;
  if (m.x < top.x) {
    // left overhang
    renderFallingChunk(m.x, m.y, top.x - m.x, m.h, m.color);
  } else if (m.x + m.w > top.x + top.w) {
    // right overhang
    renderFallingChunk(
      top.x + top.w,
      m.y,
      m.x + m.w - (top.x + top.w),
      m.h,
      m.color
    );
  }

  // Finalize block as overlap piece
  m.x = left;
  m.w = overlap;
  m.falling = false;
  state.blocks.push(m);
  state.mover = null;

  // Scoring & instability
  state.score += 1;
  const penalty = (1 - m.w / top.w) * 18; // worse alignment => more instability
  addInstability(penalty);
  if (overlap / top.w > 0.9) addInstability(-2.2); // good placement heals a bit

  // Collapse check (safety)
  if (!isStackSupported()) {
    beep(200, 0.12, "square");
    return gameOver("Support lost — stack collapsed!");
  }

  // Spawn next block
  spawnMover();
}

function doDrift() {
  // Random horizontal nudge to a segment of the tower (simulate config drift)
  if (state.blocks.length <= 2) return;
  const start = Math.floor(rand(1, state.blocks.length - 1)); // not the base
  const dx = rand(-14, 14) * [1, 0.6, 0.4][Math.min(state.testsLevel, 2)]; // tests reduce magnitude
  for (let i = start; i < state.blocks.length; i++) {
    state.blocks[i].x = clamp(state.blocks[i].x + dx, 0, W - state.blocks[i].w);
  }
  addInstability(Math.abs(dx) * 0.9);
  flashCanvas();
  beep(420, 0.05, "triangle");
  if (!isStackSupported()) {
    return gameOver("Config drift toppled your stack!");
  }
}

function isStackSupported() {
  // Each block must overlap the one below at least a pixel
  for (let i = 1; i < state.blocks.length; i++) {
    const a = state.blocks[i - 1],
      b = state.blocks[i];
    const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    if (overlap <= 0) return false;
  }
  // Instability hard cap
  if (state.instability >= 100) return false;
  return true;
}

function addInstability(v) {
  state.instability = clamp(state.instability + v, 0, 100);
}

function updateHUD() {
  scoreEl.textContent = state.score;
  highEl.textContent = state.high;
  instBar.style.width = `${state.instability}%`;
  const left = Math.max(
    0,
    Math.ceil(
      (state.driftInterval - state.driftTimer) *
        [1, 0.7, 0.5][Math.min(state.testsLevel, 2)]
    )
  );
  driftInEl.textContent = left;
}

// ---- Rendering
function render() {
  ctx.clearRect(0, 0, W, H);
  // grid bg
  drawGrid();
  // blocks
  state.blocks.forEach((b) => drawBlock(b));
  if (state.mover) drawBlock(state.mover, true);
  // baseline
  ctx.fillStyle = "#1f2a44";
  ctx.fillRect(0, H - 2, W, 2);
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlock(b, ghost = false) {
  ctx.save();
  ctx.fillStyle = b.color;
  if (ghost) {
    ctx.globalAlpha = 0.9;
  }
  roundRect(ctx, b.x, b.y, b.w, b.h, 6);
  ctx.fill();
  // label
  ctx.fillStyle = "#0c1325";
  ctx.font = "bold 12px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = b.x + b.w / 2,
    cy = b.y + b.h / 2;
  ctx.fillText(b.label, cx, cy);
  ctx.restore();
}

function renderFallingChunk(x, y, w, h, color) {
  // quick visual: draw once (no physics) to suggest the offcut dropped
  ctx.save();
  ctx.fillStyle = color;
  roundRect(ctx, x, y + h + 4, w, h, 6);
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.restore();
}
function renderCut(top, m) {
  // flair when you miss
  ctx.save();
  ctx.fillStyle = "#f87171";
  ctx.fillRect(0, top.y - 2, W, 4);
  ctx.restore();
}
function flashCanvas() {
  canvas.classList.add("flash");
  setTimeout(() => canvas.classList.remove("flash"), 120);
}

// ---- Inputs & actions
window.addEventListener("keydown", (e) => {
  if (!state) return;
  if (e.key === " ") {
    e.preventDefault();
    state.inputDrop = true;
  }
  if (e.key.toLowerCase() === "p") {
    togglePause();
  }
  if (e.key.toLowerCase() === "r") {
    actRefactor();
  }
  if (e.key.toLowerCase() === "t") {
    actTests();
  }
  if (e.key.toLowerCase() === "b") {
    actRollback();
  }
});
canvas.addEventListener("click", () => {
  if (state) state.inputDrop = true;
});

startBtn.addEventListener("click", () => {
  startBtn.disabled = true;
  startGame();
});
pauseBtn.addEventListener("click", togglePause);
againBtn.addEventListener("click", () => {
  startBtn.disabled = true;
  startGame();
});

refactorBtn.addEventListener("click", actRefactor);
testsBtn.addEventListener("click", actTests);
rollbackBtn.addEventListener("click", actRollback);

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function actRefactor() {
  if (!state || state.score < 3) return;
  if (state.blocks.length < 2) return;
  const top = state.blocks[state.blocks.length - 1];
  const below = state.blocks[state.blocks.length - 2];
  // center the top on the block below
  top.x = clamp(below.x + (below.w - top.w) / 2, 0, W - top.w);
  addInstability(-10);
  state.score -= 3;
  beep(520, 0.05, "sine");
}
function actTests() {
  if (!state) return;
  if (state.score < 5) return;
  if (state.testsLevel >= 2) return;
  state.testsLevel += 1;
  state.score -= 5;
  addInstability(-6);
  testsBtn.textContent =
    state.testsLevel >= 2 ? "Tests Maxed" : "Add Tests (-5)";
  testsBtn.disabled = state.testsLevel >= 2;
  beep(760, 0.05, "triangle");
}
function actRollback() {
  if (!state || state.blocks.length <= 1) return;
  if (state.score < 4) return;
  // remove the last placed block
  state.blocks.pop();
  state.score -= 4;
  addInstability(-4);
  // move mover target up one level
  if (!state.mover) {
    spawnMover();
  } else {
    state.mover.y = state.blocks[state.blocks.length - 1].y - BLOCK_H;
  }
  beep(300, 0.05, "square");
}

// ---- Utilities
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function rand(a, b) {
  return Math.random() * (b - a) + a;
}
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Tiny WebAudio beeps (no assets)
let ac;
function beep(freq = 440, dur = 0.05, type = "sine") {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(),
    g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.08, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.start();
  o.stop(ac.currentTime + dur);
}

// ---- Initial
function resizeCanvas() {
  // crisp on HiDPI without changing game units
  const w = canvas.width,
    h = canvas.height;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // scale drawing back to CSS pixels
}

// First screen HUD
(function boot() {
  const high = Number(localStorage.getItem("ij_high") || 0);
  highEl.textContent = high;
  startBtn.disabled = false;
})();
