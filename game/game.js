// Neon Snake — one tiny snake game in two versions of itself.
//   ?v=1   day one: bare green snake, one orb at a time, black background.
//   ?v=7   day seven: same map, same start — neon gradient snake with glow,
//          glowing orbs, particle bursts, speed ramp, obstacle blocks, a combo
//          counter and a starfield. Visibly more going on, same game.
//   ?demo=1  an autopilot steers (deterministic, so both versions open
//          identically). ?seed=N  fixes the orb, star and obstacle layout.
// Human play: arrow keys / WASD to steer, R to restart. Touch swipe works too.

'use strict';

const params = new URLSearchParams(location.search);
const VERSION = params.get('v') === '7' ? 7 : 1; // day one unless asked for day seven
const DEMO = params.get('demo') === '1';
const SEED = Number(params.get('seed') || '7') >>> 0;

const CELL = 60;          // one grid cell, px
const COLS = 18;          // 18 * 60 = 1080 wide
const ROWS = 29;          // 29 * 60 = 1740 tall
const HUD_H = 180;        // score strip at the top; arena starts below it
const W = 1080, H = 1920;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- deterministic RNG (mulberry32): same seed, same orbs, same stars --------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(SEED);
function randInt(n) { return Math.floor(rng() * n); }

// Orbs get their own RNG stream, seeded the same in both versions, so the
// day-one and day-seven runs open on the same orb in the same place: the two
// versions genuinely start from the same moment. (Stars and particles draw
// from the main stream and never touch the orbs.)
let orbRng = mulberry32(SEED ^ 0x9e3779b9);

// --- state ------------------------------------------------------------------
const START = { x: 4, y: 14 }; // same start, both versions
let snake, dir, pendingDir, orbs, obstacles, particles, stars;
let score, combo, comboLeft, speed, acc, lastStep, dead, deadAt, eaten;

function freeCells() {
  const taken = new Set();
  for (const s of snake) taken.add(s.x + ',' + s.y);
  for (const o of obstacles) taken.add(o.x + ',' + o.y);
  for (const o of orbs) taken.add(o.x + ',' + o.y);
  const out = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(x + ',' + y)) out.push({ x, y });
    }
  }
  return out;
}

function spawnOrb() {
  const free = freeCells();
  if (!free.length) return;
  orbs.push(free[Math.floor(orbRng() * free.length)]);
}

function reset() {
  rng = mulberry32(SEED);
  orbRng = mulberry32(SEED ^ 0x9e3779b9);
  snake = [];
  for (let i = 0; i < 4; i++) snake.push({ x: START.x - i, y: START.y });
  dir = { x: 1, y: 0 };
  pendingDir = dir;
  orbs = [];
  obstacles = [];
  particles = [];
  score = 0; combo = 0; comboLeft = 0; eaten = 0;
  speed = 6; acc = 0; dead = false; deadAt = 0;
  // Day seven adds seeded obstacle blocks (never on the opening path).
  if (VERSION === 7) {
    const spots = [
      { x: 9, y: 6 }, { x: 9, y: 7 }, { x: 9, y: 8 },
      { x: 4, y: 22 }, { x: 5, y: 22 }, { x: 13, y: 20 }, { x: 14, y: 20 },
    ];
    for (const s of spots) obstacles.push(s);
  }
  // Day seven's starfield: fixed stars, drawn behind everything.
  stars = [];
  if (VERSION === 7) {
    for (let i = 0; i < 90; i++) {
      stars.push({ x: rng() * W, y: HUD_H + rng() * (H - HUD_H), r: 0.6 + rng() * 1.8, a: 0.25 + rng() * 0.6 });
    }
  }
  spawnOrb();
  if (VERSION === 7) { spawnOrb(); spawnOrb(); }
  lastStep = performance.now();
}

// --- autopilot: greedy toward the nearest orb, never into a wall, itself
//     or an obstacle; ties break in a fixed order, so the run is repeatable --
const DIRS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

function hitsSomething(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  for (const o of obstacles) if (o.x === x && o.y === y) return true;
  // The tail cell frees up as the snake moves, so it is safe to enter.
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === x && snake[i].y === y) return true;
  }
  return false;
}

function autopilot() {
  const head = snake[0];
  let best = null, bestScore = -Infinity;
  for (const d of DIRS) {
    if (d.x === -dir.x && d.y === -dir.y) continue; // never reverse
    const nx = head.x + d.x, ny = head.y + d.y;
    if (hitsSomething(nx, ny)) continue;
    let nearest = Infinity;
    for (const o of orbs) {
      nearest = Math.min(nearest, Math.abs(o.x - nx) + Math.abs(o.y - ny));
    }
    // Prefer the orb, then prefer open space (cells with a free neighbour).
    let open = 0;
    for (const e of DIRS) {
      if (!hitsSomething(nx + e.x, ny + e.y)) open++;
    }
    const s = -nearest * 10 + open;
    if (s > bestScore) { bestScore = s; best = d; }
  }
  if (best) pendingDir = best;
}

// --- stepping ----------------------------------------------------------------
function step() {
  if (DEMO) autopilot();
  dir = pendingDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (hitsSomething(head.x, head.y)) {
    dead = true; deadAt = performance.now();
    return;
  }
  snake.unshift(head);
  let ate = -1;
  for (let i = 0; i < orbs.length; i++) {
    if (orbs[i].x === head.x && orbs[i].y === head.y) { ate = i; break; }
  }
  if (ate >= 0) {
    const orb = orbs.splice(ate, 1)[0];
    score += 10;
    eaten++;
    // A combo chains orbs eaten close together; each chain step adds +5.
    combo = comboLeft > 0 ? combo + 1 : 1;
    comboLeft = 4000;
    if (combo > 1) score += (combo - 1) * 5;
    if (VERSION === 7) {
      burst(orb.x, orb.y);
      speed = Math.min(12, 6 + Math.floor(eaten / 3));
    }
    spawnOrb();
  } else {
    snake.pop();
  }
  if (comboLeft > 0) {
    comboLeft -= 1000 / speed;
    if (comboLeft <= 0) combo = 0;
  }
}

function burst(cx, cy) {
  const px = cx * CELL + CELL / 2, py = HUD_H + cy * CELL + CELL / 2;
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, sp = 60 + rng() * 220;
    particles.push({
      x: px, y: py,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.55, max: 0.55,
      hue: 160 + randInt(160),
    });
  }
}

// --- drawing ----------------------------------------------------------------
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (VERSION === 7) {
    // Starfield behind everything.
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint grid, so the arena reads as a place.
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, HUD_H); ctx.lineTo(x * CELL, H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, HUD_H + y * CELL); ctx.lineTo(W, HUD_H + y * CELL); ctx.stroke();
    }
  }

  // Obstacles (day seven only).
  for (const o of obstacles) {
    ctx.fillStyle = '#1b1b2e';
    ctx.fillRect(o.x * CELL + 3, HUD_H + o.y * CELL + 3, CELL - 6, CELL - 6);
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = 3;
    ctx.strokeRect(o.x * CELL + 3, HUD_H + o.y * CELL + 3, CELL - 6, CELL - 6);
  }

  // Orbs.
  const t = performance.now() / 1000;
  for (const o of orbs) {
    const cx = o.x * CELL + CELL / 2, cy = HUD_H + o.y * CELL + CELL / 2;
    if (VERSION === 7) {
      const pulse = 12 + Math.sin(t * 5 + o.x) * 3;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, pulse + 12);
      g.addColorStop(0, 'rgba(255, 240, 120, 1)');
      g.addColorStop(0.4, 'rgba(255, 190, 60, 0.85)');
      g.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, pulse + 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6b0';
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 12, cy - 12, 24, 24);
    }
  }

  // Particles (day seven only).
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = `hsl(${p.hue} 100% 65%)`;
    ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
  }
  ctx.globalAlpha = 1;

  // Snake.
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const x = s.x * CELL, y = HUD_H + s.y * CELL;
    if (VERSION === 7) {
      const f = snake.length <= 1 ? 0 : i / (snake.length - 1); // 0 head, 1 tail
      const hue = 180 + f * 140; // cyan head fading to magenta tail
      ctx.shadowColor = `hsl(${hue} 100% 60%)`;
      ctx.shadowBlur = 22;
      ctx.fillStyle = `hsl(${hue} 100% 58%)`;
      roundRect(x + 4, y + 4, CELL - 8, CELL - 8, 14);
      ctx.shadowBlur = 0;
      if (i === 0) {
        ctx.fillStyle = '#fff';
        const ex = dir.x, ey = dir.y;
        ctx.beginPath();
        ctx.arc(x + CELL / 2 + ex * 10 - ey * 10, y + CELL / 2 + ey * 10 - ex * 10, 5, 0, Math.PI * 2);
        ctx.arc(x + CELL / 2 + ex * 10 + ey * 10, y + CELL / 2 + ey * 10 + ex * 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = i === 0 ? '#5ecf6a' : '#3da34a';
      ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    }
  }

  // HUD.
  ctx.fillStyle = '#fff';
  ctx.font = '700 56px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCORE ' + score, 40, 92);
  // A small tag in the corner names which build this is, so each version
  // reads on its own even before the video's labels go on.
  // The day tag sits on the second HUD line (y 150), clear of the combo
  // counter that appears on the first line when a combo is running.
  ctx.fillStyle = VERSION === 7 ? '#ff2e88' : 'rgba(255,255,255,0.6)';
  ctx.font = '700 44px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(VERSION === 7 ? 'DAY 7' : 'DAY 1', W - 40, 150);
  ctx.textAlign = 'left';
  if (VERSION === 7 && combo > 1) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = '700 52px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('COMBO x' + combo, W - 40, 92);
    ctx.textAlign = 'left';
  }
  if (VERSION === 7) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '44px monospace';
    ctx.fillText('SPEED ' + speed.toFixed(0) + '/s', 40, 150);
  }

  if (dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '700 96px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
    ctx.font = '44px monospace';
    ctx.fillText('press R to restart', W / 2, H / 2 + 60);
    ctx.textAlign = 'left';
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

// --- main loop ----------------------------------------------------------------
function frame(now) {
  const dt = Math.min(100, now - lastStep);
  lastStep = now;
  if (!dead) {
    acc += dt;
    const interval = 1000 / speed;
    let guard = 0;
    while (acc >= interval && guard++ < 8) {
      acc -= interval;
      step();
      if (dead) break;
    }
    for (const p of particles) {
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.life -= dt / 1000;
    }
    particles = particles.filter(p => p.life > 0);
  } else if (DEMO && now - deadAt > 1200) {
    reset(); // the demo never stalls: a fresh run starts from the same start
  }
  draw();
  requestAnimationFrame(frame);
}

// --- human input ---------------------------------------------------------------
const KEYMAP = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
};
addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') { reset(); return; }
  const d = KEYMAP[e.code];
  if (d && !(d.x === -dir.x && d.y === -dir.y)) pendingDir = d;
});
let touchStart = null;
addEventListener('touchstart', (e) => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const d = Math.abs(dx) > Math.abs(dy)
    ? { x: Math.sign(dx), y: 0 }
    : { x: 0, y: Math.sign(dy) };
  if (!(d.x === -dir.x && d.y === -dir.y)) pendingDir = d;
  touchStart = null;
});

// Expose a little state for the capture driver to read.
window.__snake = {
  get score() { return score; },
  get dead() { return dead; },
  get length() { return snake.length; },
  get version() { return VERSION; },
};

// The demo runs for the camera: no control hint at the bottom of the frame.
if (DEMO) document.getElementById('hint').style.display = 'none';

reset();
requestAnimationFrame(frame);
