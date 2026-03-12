/* ═══════════════════════════════════════════════════════════
   IMURME — Main entry point
   ═══════════════════════════════════════════════════════════ */

import { $, wait, randInt } from './utils.js';
import * as term from './terminal.js';
import * as commands from './commands.js';
import * as glitchEngine from './glitch-engine.js';
import * as cursor from './cursor.js';
import * as bgMatrix from './bg-matrix.js';
import { typeText } from './typewriter.js';

let bootAbort = null;

// ── Boot Sequence ───────────────────────────────────────────

async function boot() {
  const bootScreen = $('boot-screen');
  const bootText = $('boot-text');
  bootAbort = new AbortController();
  const signal = bootAbort.signal;

  // Skip on any key or tap
  const skipHandler = () => { bootAbort.abort(); };
  document.addEventListener('keydown', skipHandler, { once: true });
  document.addEventListener('touchstart', skipHandler, { once: true });

  try {
    const lines = [
      { text: 'IMURME BIOS v6.6.6', pause: 200 },
      { text: 'Memory test: 0xDEADBEEF ... OK', pause: 150 },
      { text: 'Loading kernel modules...', pause: 200 },
      { text: '[  OK  ] Started corruption engine', pause: 100 },
      { text: '[  OK  ] Mounted /dev/chaos', pause: 100 },
      { text: '[  OK  ] Audio subsystem initialized', pause: 100 },
      { text: 'IMURME OS ready.', pause: 300 },
    ];

    for (const line of lines) {
      if (signal.aborted) throw new DOMException('', 'AbortError');
      const div = document.createElement('div');
      div.style.cssText = 'color: var(--term-fg-dim); font-size: 12px; margin: 2px 0;';
      bootText.appendChild(div);
      await typeText(div, line.text, { speed: 12, abortSignal: signal });
      await wait(line.pause);
    }

    await wait(400);
  } catch {
    // Skipped — that's fine
  }

  // Remove skip listener and hint
  document.removeEventListener('keydown', skipHandler);
  document.removeEventListener('touchstart', skipHandler);
  $('skip-hint')?.remove();

  // Fade out boot screen
  bootScreen.classList.add('hidden');
  await wait(350);
  bootScreen.remove();
}

// ── Load Site Data ──────────────────────────────────────────

async function loadSiteData() {
  try {
    const res = await fetch('./data/site-data.json');
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return null;
}

// ── Panel Close Handlers ────────────────────────────────────

function initPanelClose() {
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => term.closePanel());
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && term.getCurrentPanel()) {
      term.closePanel();
    }
  });
}

// ── Typed Intro Sequence ────────────────────────────────────

async function introSequence() {
  term.lock();
  term.addBlank();

  // Type ASCII logo character by character (fast)
  for (const line of commands.LOGO) {
    const el = term.addLine('', 'ascii');
    el.textContent = '';
    await typeText(el, line, { speed: 3, jitter: 0 });
  }

  term.addBlank();
  await term.typeLine('  Welcome to the IMURME terminal.', 'system', 15);
  await term.typeLine('  Type help for commands. Hidden commands exist.', 'system', 15);
  term.addBlank();

  // Staggered command list reveal
  term.addHTML('<span class="hl">AVAILABLE COMMANDS</span>', 'output');
  term.addBlank();
  await wait(80);

  const cmdList = commands.getOrderedVisibleCommands();
  for (const cmd of cmdList) {
    commands.renderCommandLine(cmd);
    await wait(50);
  }

  term.addBlank();
  term.addLine('  Type a command to explore. Hidden commands exist.', 'system');
  term.addBlank();

  // Unlock — user can start typing now
  term.unlock();

  // Snake reveal runs in background (don't await)
  snakeReveal();
}

// ── Snake Background Reveal ─────────────────────────────────

function snakeReveal() {
  // Start the bg-matrix (renders behind everything at z-index 0)
  bgMatrix.init();

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Black overlay canvas that hides bg-matrix initially
  const overlay = document.createElement('canvas');
  overlay.id = 'snake-reveal';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '0', pointerEvents: 'none',
  });
  overlay.width = w * dpr;
  overlay.height = h * dpr;
  overlay.style.width = w + 'px';
  overlay.style.height = h + 'px';

  // Insert after bg-matrix so it stacks on top
  const bgCanvas = document.getElementById('bg-matrix');
  if (bgCanvas) bgCanvas.after(overlay);
  else document.body.prepend(overlay);

  const ctx = overlay.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Fill with the background color
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  // Snake grid
  const CELL = 14;
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  const visited = new Uint8Array(cols * rows);
  let visitedCount = 0;
  const total = cols * rows;
  const TARGET = total * 0.70;

  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];

  // 4 snakes — one from each corner + center
  const snakes = [
    { x: 0, y: 0, dir: 0 },
    { x: cols - 1, y: 0, dir: 1 },
    { x: 0, y: rows - 1, dir: 0 },
    { x: cols - 1, y: rows - 1, dir: 2 },
    { x: Math.floor(cols / 2), y: Math.floor(rows / 2), dir: 0 },
  ];

  // Punch holes through the black overlay to reveal bg-matrix
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,1)';

  const STEPS_PER_SNAKE = 8;
  const CLEAR_RADIUS = 2; // 5x5 clearing area

  function clearArea(cx, cy) {
    for (let dy = -CLEAR_RADIUS; dy <= CLEAR_RADIUS; dy++) {
      for (let dx = -CLEAR_RADIUS; dx <= CLEAR_RADIUS; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const idx = ny * cols + nx;
        if (!visited[idx]) { visited[idx] = 1; visitedCount++; }
      }
    }
    // Draw one big rect for the whole area (faster than per-cell)
    ctx.fillRect(
      (cx - CLEAR_RADIUS) * CELL,
      (cy - CLEAR_RADIUS) * CELL,
      (CLEAR_RADIUS * 2 + 1) * CELL,
      (CLEAR_RADIUS * 2 + 1) * CELL
    );
  }

  function inBounds(cx, cy) {
    return cx >= 0 && cx < cols && cy >= 0 && cy < rows;
  }

  function stepSnake(snake) {
    clearArea(snake.x, snake.y);

    // Random turn (15% chance)
    if (Math.random() < 0.15) {
      snake.dir = (snake.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
    }

    let nx = snake.x + DX[snake.dir];
    let ny = snake.y + DY[snake.dir];

    if (!inBounds(nx, ny) || (visited[ny * cols + nx] && Math.random() < 0.5)) {
      const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      let found = false;

      for (const d of dirs) {
        const cx = snake.x + DX[d], cy = snake.y + DY[d];
        if (inBounds(cx, cy) && !visited[cy * cols + cx]) {
          snake.dir = d; nx = cx; ny = cy; found = true; break;
        }
      }

      if (!found) {
        for (const d of dirs) {
          const cx = snake.x + DX[d], cy = snake.y + DY[d];
          if (inBounds(cx, cy)) {
            snake.dir = d; nx = cx; ny = cy; found = true; break;
          }
        }
      }

      if (!found) {
        // Teleport to random unvisited cell
        for (let a = 0; a < 200; a++) {
          const rx = Math.floor(Math.random() * cols);
          const ry = Math.floor(Math.random() * rows);
          if (!visited[ry * cols + rx]) {
            snake.x = rx; snake.y = ry;
            snake.dir = Math.floor(Math.random() * 4);
            return;
          }
        }
        return;
      }
    }

    snake.x = nx;
    snake.y = ny;
  }

  // Hard failsafe: remove overlay after 3 seconds no matter what
  const failsafe = setTimeout(() => {
    overlay.style.transition = 'opacity 300ms ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }, 3000);

  function frame() {
    if (!document.body.contains(overlay)) return;

    for (const snake of snakes) {
      for (let s = 0; s < STEPS_PER_SNAKE; s++) {
        stepSnake(snake);
      }
    }

    if (visitedCount >= TARGET) {
      clearTimeout(failsafe);
      overlay.style.transition = 'opacity 300ms ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    } else {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

// ── Init ────────────────────────────────────────────────────

async function init() {
  // Load data in parallel with boot
  const dataPromise = loadSiteData();

  // Run boot sequence
  await boot();

  // Initialize systems
  const siteData = await dataPromise;
  commands.setSiteData(siteData);

  term.init((cmd) => commands.execute(cmd));
  glitchEngine.start();
  // bgMatrix.init() is called inside snakeReveal()
  cursor.init();
  initPanelClose();

  // Run typed intro + snake reveal
  await introSequence();
}

// ── Boot ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
