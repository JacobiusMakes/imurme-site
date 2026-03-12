/* ═══════════════════════════════════════════════════════════
   Typewriter — Auto-typing engine with variable speed
   ═══════════════════════════════════════════════════════════ */

import { wait, rand } from './utils.js';

/**
 * Type text character by character into a target element.
 * @param {HTMLElement} el — element to append text into
 * @param {string} text — full string to type
 * @param {object} opts — { speed, jitter, mistakes, abortSignal }
 */
export async function typeText(el, text, opts = {}) {
  const speed = opts.speed || 30;
  const jitter = opts.jitter ?? 15;
  const mistakeChance = opts.mistakes ?? 0;
  const signal = opts.abortSignal;

  for (let i = 0; i < text.length; i++) {
    if (signal?.aborted) return;

    // Occasional typo + backspace
    if (mistakeChance > 0 && Math.random() < mistakeChance && i > 0) {
      const wrong = String.fromCharCode(text.charCodeAt(i) + (Math.random() > 0.5 ? 1 : -1));
      el.textContent += wrong;
      await wait(speed + rand(50, 120));
      if (signal?.aborted) return;
      el.textContent = el.textContent.slice(0, -1);
      await wait(80);
      if (signal?.aborted) return;
    }

    el.textContent += text[i];

    // Scroll parent into view
    const parent = el.closest('#terminal-output');
    if (parent) parent.scrollTop = parent.scrollHeight;

    // Variable delay
    let delay = speed + rand(-jitter, jitter);
    if (text[i] === '.' || text[i] === '!') delay += rand(80, 200);
    else if (text[i] === ',') delay += rand(30, 80);
    else if (text[i] === '\n') delay += rand(40, 120);

    await wait(Math.max(8, delay));
  }
}

/**
 * Type multiple lines sequentially.
 * @param {Function} addLine — function(text, className) that creates a new line
 * @param {string[]} lines — array of { text, cls, speed }
 */
export async function typeLines(addLine, lines, opts = {}) {
  const signal = opts.abortSignal;
  for (const line of lines) {
    if (signal?.aborted) return;
    const el = addLine(line.text || '', line.cls || 'output');
    if (line.speed !== 0) {
      el.textContent = '';
      await typeText(el, line.text || '', { speed: line.speed || 15, abortSignal: signal });
    }
    if (line.pause) await wait(line.pause);
  }
}
