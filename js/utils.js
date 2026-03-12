/* ═══════════════════════════════════════════════════════════
   Shared Utilities
   ═══════════════════════════════════════════════════════════ */

export const $ = id => document.getElementById(id);
export const $$ = sel => document.querySelectorAll(sel);

export function rand(min, max) { return Math.random() * (max - min) + min; }
export function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
export function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }

export function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

export function fmt(n) {
  if (n == null) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

export function isMobile() {
  return window.innerWidth < 768 || ('ontouchstart' in window && /Mobi|Android|iPhone/i.test(navigator.userAgent));
}

export function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

// Scramble chars for glitch effect
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/\\~`01';
export function randomGlitchChar() { return pick([...GLITCH_CHARS]); }
