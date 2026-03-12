/* ═══════════════════════════════════════════════════════════
   Glitch Engine — Procedural visual corruption controller
   ═══════════════════════════════════════════════════════════ */

import { $, rand, randInt, clamp } from './utils.js';

let level = 0;        // 0-3
let running = false;
let frameId = null;
let lastGlitch = 0;
let escalateTimer = null;

const root = document.documentElement;

// ── Public API ──────────────────────────────────────────────

export function start() {
  if (running) return;
  running = true;
  level = 0;
  setNoiseOpacity(0.03);
  tick();

  // Slowly escalate from 0 to 1 after 30s of interaction
  escalateTimer = setTimeout(() => { if (level < 1) setLevel(1); }, 30000);
}

export function stop() {
  running = false;
  if (frameId) cancelAnimationFrame(frameId);
  if (escalateTimer) clearTimeout(escalateTimer);
  resetAll();
}

export function setLevel(l) {
  level = clamp(l, 0, 3);
  setNoiseOpacity([0.03, 0.06, 0.1, 0.18][level]);
}

export function getLevel() { return level; }

export function burst(duration = 300) {
  const prev = level;
  setLevel(3);
  flash(80);
  shake();
  setTimeout(() => setLevel(prev), duration);
}

export function flash(duration = 100) {
  const el = $('flash-overlay');
  if (!el) return;
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), duration);
}

export function shake(duration = 200) {
  const el = $('terminal');
  if (!el) return;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), duration);
}

// ── Internals ───────────────────────────────────────────────

function tick() {
  if (!running) return;
  const now = performance.now();

  // Determine glitch probability based on level
  const intervals = [15000, 8000, 4000, 800]; // ms between glitches
  const interval = intervals[level] || 15000;

  if (now - lastGlitch > interval + rand(-1000, 1000)) {
    triggerGlitch();
    lastGlitch = now;
  }

  frameId = requestAnimationFrame(tick);
}

function triggerGlitch() {
  const effects = [];

  // Always: brief chromatic aberration
  effects.push(doAberration);

  // Level 1+: occasional cursor jitter
  if (level >= 1 && Math.random() > 0.5) effects.push(doCursorJitter);

  // Level 2+: screen tear
  if (level >= 2 && Math.random() > 0.3) effects.push(doScreenTear);

  // Level 3: everything
  if (level >= 3) {
    effects.push(doTextScramble);
    if (Math.random() > 0.5) effects.push(doFlicker);
  }

  for (const fx of effects) fx();
}

function doAberration() {
  const intensity = [1, 2, 4, 8][level];
  const dur = [80, 120, 200, 400][level];
  root.style.setProperty('--ab-x', String(rand(-intensity, intensity)));
  root.style.setProperty('--ab-y', String(rand(-intensity * 0.3, intensity * 0.3)));
  $('terminal-output')?.classList.add('glitch-ab');
  setTimeout(() => {
    root.style.setProperty('--ab-x', '0');
    root.style.setProperty('--ab-y', '0');
    $('terminal-output')?.classList.remove('glitch-ab');
  }, dur);
}

function doCursorJitter() {
  const cursor = $('cursor');
  if (!cursor) return;
  const orig = cursor.style.transform;
  cursor.style.transform = `translateX(${randInt(-6, 6)}px)`;
  setTimeout(() => { cursor.style.transform = orig; }, 100);
}

function doScreenTear() {
  const container = $('screen-tear');
  if (!container) return;
  container.innerHTML = '';

  const slices = randInt(2, 5);
  for (let i = 0; i < slices; i++) {
    const div = document.createElement('div');
    div.className = 'tear-slice';
    div.style.setProperty('--slice-y', rand(5, 95) + '%');
    div.style.setProperty('--slice-h', randInt(1, 4) + 'px');
    div.style.setProperty('--slice-offset', randInt(-20, 20) + 'px');
    container.appendChild(div);
  }

  container.classList.add('active');
  setTimeout(() => {
    container.classList.remove('active');
    container.innerHTML = '';
  }, randInt(80, 250));
}

function doTextScramble() {
  const output = $('terminal-output');
  if (!output) return;
  const lines = output.querySelectorAll('.term-line');
  if (lines.length === 0) return;

  // Pick a random visible line and briefly scramble a chunk
  const line = lines[randInt(Math.max(0, lines.length - 8), lines.length - 1)];
  if (!line) return;
  const orig = line.textContent;
  const start = randInt(0, Math.max(0, orig.length - 10));
  const len = randInt(3, 10);
  const scrambled = orig.slice(0, start) +
    Array.from({ length: Math.min(len, orig.length - start) }, () =>
      String.fromCharCode(randInt(33, 126))
    ).join('') +
    orig.slice(start + len);

  line.textContent = scrambled;
  setTimeout(() => { line.textContent = orig; }, randInt(60, 180));
}

function doFlicker() {
  const el = $('terminal');
  if (!el) return;
  el.style.opacity = '0.7';
  setTimeout(() => { el.style.opacity = '1'; }, randInt(30, 80));
}

function setNoiseOpacity(v) {
  root.style.setProperty('--noise-opacity', String(v));
}

function resetAll() {
  root.style.setProperty('--ab-x', '0');
  root.style.setProperty('--ab-y', '0');
  root.style.setProperty('--noise-opacity', '0.03');
  $('terminal-output')?.classList.remove('glitch-ab');
  const tear = $('screen-tear');
  if (tear) { tear.classList.remove('active'); tear.innerHTML = ''; }
}
