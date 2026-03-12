/* ═══════════════════════════════════════════════════════════
   Terminal Engine — Input handling, output rendering, history
   ═══════════════════════════════════════════════════════════ */

import { $, wait } from './utils.js';
import { typeText } from './typewriter.js';

const PROMPT = 'visitor@imurme:~$ ';
const MAX_LINES = 500;

let output, inputArea, inputText, cursorEl, hiddenInput;
let commandHistory = [];
let historyIndex = -1;
let locked = false;
let currentPanel = null;
let onCommand = null; // callback set by main.js

// ── Init ────────────────────────────────────────────────────

export function init(commandHandler) {
  output = $('terminal-output');
  inputArea = $('input-area');
  inputText = $('input-text');
  cursorEl = $('cursor');
  hiddenInput = $('hidden-input');
  onCommand = commandHandler;

  $('input-prompt').textContent = PROMPT;

  // Focus management — skip for cmd-links (they trigger commands, not typing)
  document.addEventListener('click', e => {
    if (locked) return;
    if (e.target.closest('.content-panel') || e.target.closest('.panel-close')) return;
    if (e.target.closest('.cmd-link')) return;
    hiddenInput.focus();
  });

  hiddenInput.addEventListener('input', () => {
    if (locked) return;
    inputText.textContent = hiddenInput.value;
    cursorEl.classList.add('typing');
    clearTimeout(cursorEl._typingTimer);
    cursorEl._typingTimer = setTimeout(() => cursorEl.classList.remove('typing'), 150);
  });

  hiddenInput.addEventListener('keydown', e => {
    if (locked) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = hiddenInput.value.trim();
      hiddenInput.value = '';
      inputText.textContent = '';
      submitCommand(cmd);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      if (historyIndex < commandHistory.length - 1) historyIndex++;
      hiddenInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
      inputText.textContent = hiddenInput.value;
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        hiddenInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
      } else {
        historyIndex = -1;
        hiddenInput.value = '';
      }
      inputText.textContent = hiddenInput.value;
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion could go here
      return;
    }

    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clear();
      return;
    }
  });

  // Initial focus
  setTimeout(() => hiddenInput.focus(), 100);
}

// ── Command Submission ──────────────────────────────────────

function submitCommand(cmd) {
  // Show the input line in output
  addLine(PROMPT + cmd, 'input', true);

  if (cmd) {
    commandHistory.push(cmd);
    historyIndex = -1;
  }

  if (onCommand) onCommand(cmd);
}

// ── Output ──────────────────────────────────────────────────

export function addLine(text, cls = 'output', instant = false) {
  const div = document.createElement('div');
  div.className = `term-line ${cls}${instant ? ' instant' : ''}`;

  if (cls === 'input') {
    // Split into prompt and command parts
    const promptSpan = document.createElement('span');
    promptSpan.className = 'prompt';
    const cmdSpan = document.createElement('span');
    cmdSpan.className = 'cmd';

    const promptEnd = text.indexOf('$ ') + 2;
    promptSpan.textContent = text.slice(0, promptEnd);
    cmdSpan.textContent = text.slice(promptEnd);
    div.appendChild(promptSpan);
    div.appendChild(cmdSpan);
  } else {
    div.textContent = text;
  }

  output.appendChild(div);
  trimLines();
  scrollToBottom();
  return div;
}

export function addHTML(html, cls = 'output') {
  const div = document.createElement('div');
  div.className = `term-line ${cls} instant`;
  div.innerHTML = html;
  output.appendChild(div);
  trimLines();
  scrollToBottom();
  return div;
}

export function addBlank() {
  return addLine('', 'output', true);
}

export function clear() {
  output.innerHTML = '';
}

// ── Typewriter output ───────────────────────────────────────

export async function typeLine(text, cls = 'output', speed = 20) {
  const div = addLine('', cls, true);
  await typeText(div, text, { speed });
  return div;
}

export async function typeLines(lines) {
  for (const line of lines) {
    if (typeof line === 'string') {
      await typeLine(line);
    } else {
      await typeLine(line.text || '', line.cls || 'output', line.speed || 20);
      if (line.pause) await wait(line.pause);
    }
  }
}

// ── Lock / Unlock (during transitions, boot) ────────────────

export function lock() {
  locked = true;
  inputArea.classList.add('locked');
}

export function unlock() {
  locked = false;
  inputArea.classList.remove('locked');
  hiddenInput.focus();
}

export function isLocked() { return locked; }

// ── Panel Management ────────────────────────────────────────

export function openPanel(id) {
  const panel = $(id);
  if (!panel) return;
  currentPanel = id;
  panel.classList.add('active');
}

export function closePanel() {
  if (currentPanel) {
    const panel = $(currentPanel);
    if (panel) panel.classList.remove('active');
    currentPanel = null;
    hiddenInput.focus();
  }
}

export function getCurrentPanel() { return currentPanel; }

// ── Helpers ─────────────────────────────────────────────────

function scrollToBottom() {
  output.scrollTop = output.scrollHeight;
}

function trimLines() {
  while (output.children.length > MAX_LINES) {
    output.removeChild(output.firstChild);
  }
}

export function focus() {
  hiddenInput.focus();
}
