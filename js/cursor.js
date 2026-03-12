/* ═══════════════════════════════════════════════════════════
   Custom Cursor — Green square with trailing afterimage
   ═══════════════════════════════════════════════════════════ */

import { isMobile } from './utils.js';

const TRAIL_LENGTH = 5;
let cursorEl = null;
let trailEls = [];
let positions = [];
let mouseX = -100, mouseY = -100;
let raf = null;
let active = false;

export function init() {
  if (isMobile()) return;

  document.body.style.cursor = 'none';

  // Main cursor
  cursorEl = document.createElement('div');
  cursorEl.className = 'custom-cursor';
  Object.assign(cursorEl.style, {
    position: 'fixed', width: '6px', height: '6px',
    background: 'var(--term-fg)', borderRadius: '1px',
    pointerEvents: 'none', zIndex: '9999',
    transform: 'translate(-50%, -50%)',
    transition: 'width 150ms, height 150ms, border-radius 150ms, background 150ms',
    mixBlendMode: 'difference',
  });
  document.body.appendChild(cursorEl);

  // Trail dots
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'fixed', width: '4px', height: '4px',
      background: 'var(--term-fg)', borderRadius: '1px',
      pointerEvents: 'none', zIndex: '9998',
      opacity: String((1 - i / TRAIL_LENGTH) * 0.3),
      transform: 'translate(-50%, -50%)',
    });
    document.body.appendChild(dot);
    trailEls.push(dot);
    positions.push({ x: -100, y: -100 });
  }

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Hover states
  document.addEventListener('mouseover', e => {
    const interactive = e.target.closest('a, button, .reel-card, .gen-mode-btn, .gen-btn, [data-comp]');
    if (interactive) {
      cursorEl.style.width = '24px';
      cursorEl.style.height = '24px';
      cursorEl.style.borderRadius = '50%';
      cursorEl.style.background = 'rgba(0, 255, 65, 0.15)';
      cursorEl.style.border = '1px solid var(--term-fg)';
    }
  });

  document.addEventListener('mouseout', e => {
    const interactive = e.target.closest('a, button, .reel-card, .gen-mode-btn, .gen-btn, [data-comp]');
    if (interactive) {
      cursorEl.style.width = '6px';
      cursorEl.style.height = '6px';
      cursorEl.style.borderRadius = '1px';
      cursorEl.style.background = 'var(--term-fg)';
      cursorEl.style.border = 'none';
    }
  });

  // Click ring
  document.addEventListener('mousedown', () => {
    const ring = document.createElement('div');
    Object.assign(ring.style, {
      position: 'fixed', left: mouseX + 'px', top: mouseY + 'px',
      width: '0', height: '0', borderRadius: '50%',
      border: '1px solid var(--term-fg)', pointerEvents: 'none',
      transform: 'translate(-50%, -50%)', zIndex: '9997',
      transition: 'all 300ms ease-out', opacity: '0.6',
    });
    document.body.appendChild(ring);
    requestAnimationFrame(() => {
      ring.style.width = '32px';
      ring.style.height = '32px';
      ring.style.opacity = '0';
    });
    setTimeout(() => ring.remove(), 350);
  });

  active = true;
  tick();
}

function tick() {
  if (!active) return;

  cursorEl.style.left = mouseX + 'px';
  cursorEl.style.top = mouseY + 'px';

  // Update trail (staggered follow)
  for (let i = trailEls.length - 1; i > 0; i--) {
    positions[i].x = positions[i - 1].x;
    positions[i].y = positions[i - 1].y;
  }
  positions[0].x = mouseX;
  positions[0].y = mouseY;

  for (let i = 0; i < trailEls.length; i++) {
    trailEls[i].style.left = positions[i].x + 'px';
    trailEls[i].style.top = positions[i].y + 'px';
  }

  raf = requestAnimationFrame(tick);
}

export function destroy() {
  active = false;
  if (raf) cancelAnimationFrame(raf);
  cursorEl?.remove();
  trailEls.forEach(el => el.remove());
  document.body.style.cursor = '';
}
