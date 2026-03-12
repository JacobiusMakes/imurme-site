/* ═══════════════════════════════════════════════════════════
   Image Corruption Tool — Real-time glitch effects on images
   ═══════════════════════════════════════════════════════════ */

let canvas, ctx;
let sourceCanvas, sourceCtx;
let sourceImage = null;
let renderPending = false;

const effects = {
  rgb: 0,
  scan: 0,
  noise: 0,
  glitch: 0,
  vhs: 0,
  sort: 0,
  poster: 0,
};

// ── Init ────────────────────────────────────────────────────

export function init() {
  canvas = document.getElementById('corrupt-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  sourceCanvas = document.createElement('canvas');
  sourceCtx = sourceCanvas.getContext('2d');

  setupDropZone();
  setupSliders();
  setupButtons();
}

// ── Drop Zone ───────────────────────────────────────────────

function setupDropZone() {
  const drop = document.getElementById('corrupt-drop');
  const fileInput = document.getElementById('corrupt-file');
  if (!drop || !fileInput) return;

  drop.addEventListener('click', () => fileInput.click());

  drop.addEventListener('dragover', e => {
    e.preventDefault();
    drop.classList.add('dragover');
  });

  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));

  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) loadImage(e.target.files[0]);
  });

  // Also handle paste
  document.addEventListener('paste', e => {
    // Only if gen-panel is active
    if (!document.getElementById('gen-panel')?.classList.contains('active')) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        loadImage(item.getAsFile());
        break;
      }
    }
  });
}

function loadImage(file) {
  const img = new Image();
  img.onload = () => {
    sourceImage = img;

    // Fit to max 700px wide, 500px tall
    const maxW = 700, maxH = 500;
    let scale = 1;
    if (img.width > maxW) scale = maxW / img.width;
    if (img.height * scale > maxH) scale = maxH / img.height;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    canvas.width = w;
    canvas.height = h;
    sourceCanvas.width = w;
    sourceCanvas.height = h;
    sourceCtx.drawImage(img, 0, 0, w, h);

    // Show canvas, hide drop zone
    document.getElementById('corrupt-drop').style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('corrupt-new')?.classList.add('visible');

    render();
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
}

// ── Sliders ─────────────────────────────────────────────────

function setupSliders() {
  document.querySelectorAll('#gen-panel .effect-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const effect = slider.dataset.effect;
      effects[effect] = Number(slider.value);
      const val = document.querySelector(`#gen-panel .effect-val[data-for="${effect}"]`);
      if (val) val.textContent = slider.value;
      requestRender();
    });
  });
}

// ── Buttons ─────────────────────────────────────────────────

function setupButtons() {
  document.getElementById('corrupt-random')?.addEventListener('click', randomize);
  document.getElementById('corrupt-reset')?.addEventListener('click', reset);
  document.getElementById('corrupt-download')?.addEventListener('click', download);
  document.getElementById('corrupt-new')?.addEventListener('click', newImage);
}

function randomize() {
  const ranges = { rgb: [5, 40], scan: [20, 80], noise: [10, 60], glitch: [3, 20], vhs: [5, 45], sort: [10, 80], poster: [20, 80] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const val = Math.floor(Math.random() * (max - min)) + min;
    effects[key] = val;
    const slider = document.querySelector(`#gen-panel .effect-slider[data-effect="${key}"]`);
    if (slider) slider.value = val;
    const label = document.querySelector(`#gen-panel .effect-val[data-for="${key}"]`);
    if (label) label.textContent = val;
  }
  requestRender();
}

function reset() {
  for (const key of Object.keys(effects)) {
    effects[key] = 0;
    const slider = document.querySelector(`#gen-panel .effect-slider[data-effect="${key}"]`);
    if (slider) slider.value = 0;
    const label = document.querySelector(`#gen-panel .effect-val[data-for="${key}"]`);
    if (label) label.textContent = '0';
  }
  requestRender();
}

function download() {
  if (!sourceImage) return;
  const link = document.createElement('a');
  link.download = 'corrupted-imurme.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function newImage() {
  sourceImage = null;
  canvas.style.display = 'none';
  document.getElementById('corrupt-drop').style.display = '';
  document.getElementById('corrupt-new')?.classList.remove('visible');
  reset();
}

// ── Render Pipeline ─────────────────────────────────────────

function requestRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    render();
    renderPending = false;
  });
}

function render() {
  if (!sourceImage) return;
  const w = canvas.width, h = canvas.height;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);

  // Apply effects in order (order matters for visual result)
  if (effects.rgb > 0) rgbSplit(imageData, effects.rgb);
  if (effects.vhs > 0) vhs(imageData, effects.vhs);
  if (effects.glitch > 0) glitchBlocks(imageData, effects.glitch);
  if (effects.sort > 0) pixelSort(imageData, effects.sort / 100);
  if (effects.poster > 0) posterize(imageData, effects.poster);
  if (effects.noise > 0) noise(imageData, effects.noise / 100);
  if (effects.scan > 0) scanLines(imageData, effects.scan / 100);

  ctx.putImageData(imageData, 0, 0);
}

// ── Effects ─────────────────────────────────────────────────

function rgbSplit(imageData, amount) {
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);
  const off = Math.round(amount);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = copy[(y * width + Math.min(x + off, width - 1)) * 4];
      data[i + 2] = copy[(y * width + Math.max(x - off, 0)) * 4 + 2];
    }
  }
}

function scanLines(imageData, intensity) {
  const { data, width, height } = imageData;
  for (let y = 0; y < height; y++) {
    if (y % 3 !== 0) continue;
    const dim = 1 - intensity * 0.75;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = Math.round(data[i] * dim);
      data[i + 1] = Math.round(data[i + 1] * dim);
      data[i + 2] = Math.round(data[i + 2] * dim);
    }
  }
}

function noise(imageData, amount) {
  const { data } = imageData;
  const strength = amount * 120;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * strength;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
}

function glitchBlocks(imageData, count) {
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);
  for (let b = 0; b < count; b++) {
    const by = Math.floor(Math.random() * height);
    const bh = Math.floor(Math.random() * 50) + 3;
    const shift = Math.floor((Math.random() - 0.5) * width * 0.35);
    // Optionally tint the block
    const tint = Math.random() > 0.7;
    const tintChannel = Math.floor(Math.random() * 3);

    for (let y = by; y < Math.min(by + bh, height); y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.max(0, Math.min(width - 1, x + shift));
        const di = (y * width + x) * 4;
        const si = (y * width + srcX) * 4;
        data[di] = copy[si];
        data[di + 1] = copy[si + 1];
        data[di + 2] = copy[si + 2];
        if (tint) data[di + tintChannel] = Math.min(255, data[di + tintChannel] + 40);
      }
    }
  }
}

function vhs(imageData, intensity) {
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);
  const seed = Math.random() * 1000;
  for (let y = 0; y < height; y++) {
    const wave = Math.sin(y * 0.02 + seed) * intensity +
      Math.sin(y * 0.07 + seed * 2) * intensity * 0.4 +
      (Math.random() - 0.5) * intensity * 0.15;
    const shift = Math.round(wave);
    for (let x = 0; x < width; x++) {
      const srcX = Math.max(0, Math.min(width - 1, x + shift));
      const di = (y * width + x) * 4;
      const si = (y * width + srcX) * 4;
      data[di] = copy[si];
      data[di + 1] = copy[si + 1];
      data[di + 2] = copy[si + 2];
    }
  }
}

function pixelSort(imageData, amount) {
  const { data, width, height } = imageData;
  const threshold = 0.25;
  for (let y = 0; y < height; y++) {
    if (Math.random() > amount) continue;
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const i = (y * width + x) * 4;
      const bright = x < width ? (data[i] + data[i + 1] + data[i + 2]) / 765 : 0;
      if (bright > threshold && start === -1) {
        start = x;
      } else if ((bright <= threshold || x === width) && start !== -1) {
        const run = [];
        for (let sx = start; sx < x; sx++) {
          const si = (y * width + sx) * 4;
          run.push({ r: data[si], g: data[si + 1], b: data[si + 2], v: data[si] + data[si + 1] + data[si + 2] });
        }
        run.sort((a, b) => a.v - b.v);
        for (let j = 0; j < run.length; j++) {
          const di = (y * width + start + j) * 4;
          data[di] = run[j].r;
          data[di + 1] = run[j].g;
          data[di + 2] = run[j].b;
        }
        start = -1;
      }
    }
  }
}

function posterize(imageData, amount) {
  const { data } = imageData;
  const levels = Math.max(2, Math.round(32 - (amount / 100) * 30));
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
}
