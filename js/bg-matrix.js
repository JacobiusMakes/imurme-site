/* ═══════════════════════════════════════════════════════════
   Background Matrix — Topographic splotches of pulsing symbols
   with subtle grid + smooth contour lines in the valleys
   ═══════════════════════════════════════════════════════════ */

const CHARS = '01234567890ABCDEF!@#$%^&*(){}[]<>/\\|~`+=_-.:;?';
const CELL = 18;
const MAX_OPACITY = 0.13;
const CHANGE_RATE = 0.02;

// Grid — very subtle, aligned to CELL
const GRID_SPACING = CELL;
const GRID_BASE_ALPHA = 0.012;
const GRID_PULSE_ALPHA = 0.035;

// Contours — smooth topo lines, brighter than grid but still subtle
const CONTOUR_LEVELS = 4;
const CONTOUR_STEP = 14;
const CONTOUR_ALPHA = 0.045;

let canvas, ctx;
let maskCanvas, maskCtx;
let cols, rows;
let grid = [];
let running = false;
let raf = null;
let time = 0;

// ── Perlin noise ─────────────────────────────────────────────

const PERM = new Uint8Array(512);
(function buildPerm() {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(hash, x, y) {
  const h = hash & 3;
  return ((h < 2 ? x : -x) + (h & 1 ? y : -y));
}

function noise2d(x, y) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = PERM[PERM[xi] + yi], ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi], bb = PERM[PERM[xi + 1] + yi + 1];
  return lerp(
    lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v
  );
}

function fbm(x, y, octaves) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2d(x * freq, y * freq);
    amp *= 0.5; freq *= 2.0;
  }
  return val;
}

// ── Canvas setup ─────────────────────────────────────────────

export function init() {
  canvas = document.createElement('canvas');
  canvas.id = 'bg-matrix';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', zIndex: '0', pointerEvents: 'none',
  });
  document.body.prepend(canvas);
  ctx = canvas.getContext('2d');
  maskCanvas = document.createElement('canvas');
  maskCtx = maskCanvas.getContext('2d');

  resize();
  window.addEventListener('resize', resize);
  running = true;
  tick();
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = window.innerWidth, ph = window.innerHeight;
  canvas.width = pw * dpr; canvas.height = ph * dpr;
  canvas.style.width = pw + 'px'; canvas.style.height = ph + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  maskCanvas.width = pw * dpr; maskCanvas.height = ph * dpr;
  maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cols = Math.ceil(pw / CELL) + 1;
  rows = Math.ceil(ph / CELL) + 1;
  const oldGrid = grid;
  grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      grid[idx] = oldGrid[idx] || { char: randChar() };
    }
  }
}

function tick() {
  if (!running) return;
  time += 0.006;
  draw();
  raf = requestAnimationFrame(tick);
}

// ── Visibility field (character splotches) ───────────────────

function computeVisField() {
  const vf = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / cols, ny = r / rows;
      const n1 = fbm(nx * 2.5 + time * 0.25, ny * 2.5 + time * 0.12, 4);
      const n2 = fbm(nx * 1.5 - time * 0.18 + 50, ny * 1.5 + time * 0.2 + 50, 3);
      // Sharp edge — narrow transition band
      const raw = ((n1 + n2) * 0.5 + 0.12) / 0.06;
      vf[r * cols + c] = Math.max(0, Math.min(1, raw));
    }
  }
  return vf;
}

// ── Main draw ────────────────────────────────────────────────

function draw() {
  const w = window.innerWidth, h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  const visField = computeVisField();

  drawGridToMask(w, h);
  drawContoursToMask(w, h);
  applyValleyMask(w, h, visField);
  drawCharSplotches(visField);
}

// ── Straight grid with brightness pulses ─────────────────────

function drawGridToMask(w, h) {
  maskCtx.clearRect(0, 0, w, h);
  maskCtx.lineWidth = 0.3;

  const seg = CELL;

  // Horizontal
  const hLines = Math.ceil(h / GRID_SPACING) + 1;
  for (let i = 0; i < hLines; i++) {
    const y = i * GRID_SPACING;
    for (let px = 0; px < w; px += seg) {
      const nx = px / w, ny = y / h;
      const ripple = Math.sin(nx * 12 - time * 3.0 + i * 0.7) * 0.5 + 0.5;
      const a = GRID_BASE_ALPHA + ripple * (GRID_PULSE_ALPHA - GRID_BASE_ALPHA);
      maskCtx.strokeStyle = `rgba(0, 200, 50, ${a.toFixed(4)})`;
      maskCtx.beginPath();
      maskCtx.moveTo(px, y);
      maskCtx.lineTo(Math.min(px + seg, w), y);
      maskCtx.stroke();
    }
  }

  // Vertical
  const vLines = Math.ceil(w / GRID_SPACING) + 1;
  for (let i = 0; i < vLines; i++) {
    const x = i * GRID_SPACING;
    for (let py = 0; py < h; py += seg) {
      const ny = py / h;
      const ripple = Math.sin(ny * 12 - time * 2.5 + i * 0.9) * 0.5 + 0.5;
      const a = GRID_BASE_ALPHA + ripple * (GRID_PULSE_ALPHA - GRID_BASE_ALPHA);
      maskCtx.strokeStyle = `rgba(0, 200, 50, ${a.toFixed(4)})`;
      maskCtx.beginPath();
      maskCtx.moveTo(x, py);
      maskCtx.lineTo(x, Math.min(py + seg, h));
      maskCtx.stroke();
    }
  }
}

// ── Smooth contour lines via marching squares ────────────────

function drawContoursToMask(w, h) {
  const S = CONTOUR_STEP;
  const gcols = Math.ceil(w / S) + 1;
  const grows = Math.ceil(h / S) + 1;

  // Sample the contour noise field onto a grid
  const field = new Float32Array(gcols * grows);
  for (let gy = 0; gy < grows; gy++) {
    for (let gx = 0; gx < gcols; gx++) {
      const nx = (gx * S) / w, ny = (gy * S) / h;
      // Separate noise field for contours so they move independently
      const v = fbm(nx * 3.0 + time * 0.4, ny * 3.0 - time * 0.25, 3) * 0.5 + 0.5;
      field[gy * gcols + gx] = v;
    }
  }

  maskCtx.lineWidth = 0.5;
  maskCtx.lineCap = 'round';

  for (let level = 0; level < CONTOUR_LEVELS; level++) {
    const iso = (level + 1) / (CONTOUR_LEVELS + 1);
    const pulse = Math.sin(time * 0.9 + level * 1.1) * 0.5 + 0.5;
    const a = (CONTOUR_ALPHA * 0.5 + pulse * CONTOUR_ALPHA * 0.5).toFixed(4);
    maskCtx.strokeStyle = `rgba(0, 255, 80, ${a})`;
    maskCtx.beginPath();

    // March each cell
    for (let gy = 0; gy < grows - 1; gy++) {
      for (let gx = 0; gx < gcols - 1; gx++) {
        const tl = field[gy * gcols + gx];
        const tr = field[gy * gcols + gx + 1];
        const br = field[(gy + 1) * gcols + gx + 1];
        const bl = field[(gy + 1) * gcols + gx];

        // Classify corners: 1 if above iso, 0 if below
        const c = (tl >= iso ? 8 : 0) | (tr >= iso ? 4 : 0) | (br >= iso ? 2 : 0) | (bl >= iso ? 1 : 0);
        if (c === 0 || c === 15) continue;

        const x0 = gx * S, y0 = gy * S;

        // Interpolate edge crossings
        const t = lerpFrac(tl, tr, iso);  // top edge
        const r = lerpFrac(tr, br, iso);  // right edge
        const b = lerpFrac(bl, br, iso);  // bottom edge
        const l = lerpFrac(tl, bl, iso);  // left edge

        const tx = x0 + t * S, ty = y0;         // top
        const rx = x0 + S,     ry = y0 + r * S;  // right
        const bx = x0 + b * S, by = y0 + S;      // bottom
        const lx = x0,         ly = y0 + l * S;   // left

        // Draw line segments based on case
        switch (c) {
          case 1: case 14: seg(lx,ly, bx,by); break;
          case 2: case 13: seg(bx,by, rx,ry); break;
          case 3: case 12: seg(lx,ly, rx,ry); break;
          case 4: case 11: seg(tx,ty, rx,ry); break;
          case 5:          seg(tx,ty, lx,ly); seg(bx,by, rx,ry); break;
          case 6: case 9:  seg(tx,ty, bx,by); break;
          case 7: case 8:  seg(tx,ty, lx,ly); break;
          case 10:         seg(tx,ty, rx,ry); seg(lx,ly, bx,by); break;
        }
      }
    }

    maskCtx.stroke();
  }

  function seg(x1, y1, x2, y2) {
    maskCtx.moveTo(x1, y1);
    maskCtx.lineTo(x2, y2);
  }
}

function lerpFrac(a, b, iso) {
  const d = b - a;
  if (Math.abs(d) < 0.0001) return 0.5;
  return Math.max(0, Math.min(1, (iso - a) / d));
}

// ── Erase grid/contours where character splotches live ───────

function applyValleyMask(w, h, visField) {
  maskCtx.save();
  maskCtx.globalCompositeOperation = 'destination-out';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const vis = visField[r * cols + c];
      if (vis < 0.05) continue;
      const eraseAlpha = Math.min(1, vis * 2.5);
      maskCtx.fillStyle = `rgba(0,0,0,${eraseAlpha.toFixed(2)})`;
      maskCtx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  maskCtx.restore();
  ctx.drawImage(maskCanvas, 0, 0, w, h);
}

// ── Character splotches ──────────────────────────────────────

function drawCharSplotches(visField) {
  ctx.font = `11px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cell = grid[idx];
      if (!cell) continue;
      const visibility = visField[idx];
      if (visibility < 0.01) continue;

      const nx = c / cols, ny = r / rows;
      const shimmer = Math.sin(nx * 10 + ny * 8 + time * 2.5) * 0.3 + 0.7;
      const alpha = visibility * shimmer * MAX_OPACITY;
      if (alpha < 0.005) continue;

      if (Math.random() < CHANGE_RATE * (0.5 + visibility)) {
        cell.char = randChar();
      }

      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      const g = Math.floor(180 + visibility * 75);
      ctx.fillStyle = `rgba(0, ${g}, 35, ${alpha.toFixed(3)})`;
      ctx.fillText(cell.char, x, y);
    }
  }
}

function randChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export function destroy() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  window.removeEventListener('resize', resize);
  canvas?.remove();
}
