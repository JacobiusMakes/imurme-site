/* ═══════════════════════════════════════════════════════════
   Commands — Registry of all terminal commands
   ═══════════════════════════════════════════════════════════ */

import * as term from './terminal.js';
import * as glitch from './glitch-engine.js';
import * as imageGlitch from './image-glitch.js';
import { wait, fmt, randInt, randomGlitchChar, isMobile, $ } from './utils.js';
import { typeText } from './typewriter.js';

let siteData = null;

export function setSiteData(data) { siteData = data; }

export const LOGO = [
  ' ██╗███╗   ███╗██╗   ██╗██████╗ ███╗   ███╗███████╗',
  ' ██║████╗ ████║██║   ██║██╔══██╗████╗ ████║██╔════╝',
  ' ██║██╔████╔██║██║   ██║██████╔╝██╔████╔██║█████╗  ',
  ' ██║██║╚██╔╝██║██║   ██║██╔══██╗██║╚██╔╝██║██╔══╝  ',
  ' ██║██║ ╚═╝ ██║╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗',
  ' ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝',
];

// ── Command Registry ────────────────────────────────────────

const commands = {};

function reg(name, aliases, desc, hidden, handler) {
  const entry = { name, aliases, desc, hidden, handler };
  commands[name] = entry;
  for (const a of aliases) commands[a] = entry;
}

// ── help ────────────────────────────────────────────────────

const helpOrder = ['listen', 'links', 'whoami', 'contact', 'projects', 'reels', 'generate', 'glitch', 'home', 'clear'];

export function getOrderedVisibleCommands() {
  const all = Object.values(commands)
    .filter((c, i, arr) => !c.hidden && arr.findIndex(x => x.name === c.name) === i);

  const ordered = [];
  for (const name of helpOrder) {
    const cmd = all.find(c => c.name === name);
    if (cmd) ordered.push(cmd);
  }
  for (const cmd of all) {
    if (!helpOrder.includes(cmd.name)) ordered.push(cmd);
  }
  return ordered;
}

export function renderCommandLine(cmd) {
  const shown = cmd.aliases.slice(0, 2);
  const aliases = shown.length > 0 ? `<span class="cmd-aliases dim"> [${shown.join(', ')}]</span>` : '';
  const el = term.addHTML(`  <span class="cmd-link accent" data-cmd="${cmd.name}">${cmd.name.padEnd(10)}</span>${cmd.desc}${aliases}`, 'output');
  el.querySelector('.cmd-link').addEventListener('click', (e) => {
    e.stopPropagation();
    execute(cmd.name);
  });
  return el;
}

reg('help', ['?'], 'List commands', false, async () => {
  term.addBlank();
  term.addHTML('<span class="hl">AVAILABLE COMMANDS</span>', 'output');
  term.addBlank();

  for (const cmd of getOrderedVisibleCommands()) {
    renderCommandLine(cmd);
  }

  term.addBlank();
  term.addLine('  Type a command to explore. Hidden commands exist.', 'system');
  term.addBlank();
});

// ── whoami ──────────────────────────────────────────────────

reg('whoami', ['who'], 'Who is IMURME?', false, async () => {
  term.clear();
  term.addBlank();
  term.addHTML('<span class="hl">WHO IS IMURME?</span>', 'output');
  term.addHTML('<span class="dim">I Am You Are Me</span>', 'output');
  term.addBlank();

  // Photo floats right, text wraps around it
  term.addHTML(`<div class="whoami-inline">
    <div class="whoami-photo-frame">
      <img src="assets/images/jacobius.png" alt="Jacobius" class="whoami-photo">
      <div class="whoami-photo-label">JACOBIUS — NJ</div>
    </div>
    <div class="whoami-bio">
      <p>IMURME was born in a basement in New Jersey at 3 AM, somewhere between a fever dream and a divine transmission. The brainchild of <span class="accent">Jacobius</span> — producer, curator, architect of controlled chaos.</p>
      <p>The original commandment was simple: <em>create without judgment.</em> No second-guessing. No committee. No algorithm-approved safe choices. Just raw instinct funneled through a screen until something beautiful and unhinged crawled out the other side.</p>
      <p>What started as meme compilations set to music became something stranger — a frequency. A shared hallucination between creator and audience. Every reel is a Rorschach test. Every cut is intentional. Every track is a spell.</p>
      <p class="dim">No genre. No rules. Just output.</p>
      <p>The name says everything: <span class="accent">I Am You Are Me.</span> There is no fourth wall here. You're not watching — you're inside it. You always were.</p>
    </div>
  </div>`, 'output');

  term.addBlank();

  const stats = siteData?.meta;
  if (stats) {
    term.addHTML(`  <span class="hl">${fmt(stats.totalReels)}</span> <span class="dim">reels</span>  //  <span class="hl">${fmt(stats.totalViews)}</span> <span class="dim">views</span>  //  <span class="dim">est. 2026</span>`, 'output');
    term.addBlank();
  }

  term.addHTML('  <span class="dim">@</span><a href="https://instagram.com/i.m.u.r.me" target="_blank">i.m.u.r.me</a> <span class="dim">on Instagram</span>', 'output');
  term.addHTML('  <span class="dim">@</span><a href="https://tiktok.com/@i.m.u.r.me" target="_blank">i.m.u.r.me</a> <span class="dim">on TikTok</span>', 'output');
  term.addHTML('  <span class="dim">@</span><a href="https://youtube.com/@imurme-yt" target="_blank">imurme-yt</a> <span class="dim">on YouTube</span>', 'output');
  term.addBlank();
});

// ── reels ───────────────────────────────────────────────────

reg('reels', ['feed'], 'Reel archive', false, async () => {
  term.addLine('Loading reel archive...', 'system');
  await wait(300);
  glitch.burst(400);
  await wait(500);
  renderReelsPanel();
  term.openPanel('reels-panel');
});

function renderReelsPanel() {
  const grid = document.querySelector('#reels-panel .reels-grid');
  if (!grid) return;
  const reels = siteData?.reels || [];
  if (reels.length === 0) {
    grid.innerHTML = '<div style="color:var(--term-comment);padding:24px">No reels loaded. Check site-data.json</div>';
    return;
  }

  grid.innerHTML = reels.map(r => `
    <a class="reel-card" href="${r.igUrl || '#'}" target="_blank" rel="noopener">
      <div class="reel-thumb-wrap">
        ${r.thumbnailUrl
          ? `<img class="reel-thumb" src="${r.thumbnailUrl}" alt="" loading="lazy">`
          : `<div class="reel-thumb" style="display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--term-comment)">&#127910;</div>`
        }
      </div>
      <div class="reel-overlay">
        <div class="reel-views">${fmt(r.views)} views</div>
        <div class="reel-meta">${r.song || ''} &middot; ${r.postedAt || ''}</div>
      </div>
      ${r.type ? `<div class="reel-type">${r.type}</div>` : ''}
    </a>
  `).join('');
}

// ── stats ───────────────────────────────────────────────────

reg('stats', ['s'], 'Show page statistics', true, async () => {
  const stats = siteData?.meta;
  if (!stats) {
    term.addLine('No data loaded.', 'error');
    return;
  }

  term.clear();
  term.addBlank();
  term.addHTML('<span class="hl">PAGE STATISTICS</span>', 'output');
  term.addBlank();

  const lines = [
    ['Total Reels', fmt(stats.totalReels)],
    ['Total Views', fmt(stats.totalViews)],
    ['Avg Engagement', stats.avgEngagement || '-'],
    ['Top Reel Views', fmt(stats.topReelViews)],
  ];

  for (const [label, val] of lines) {
    await wait(100);
    term.addHTML(`  <span class="dim">${label.padEnd(18)}</span><span class="accent">${val}</span>`, 'output');
  }
  term.addBlank();
});

// ── links ───────────────────────────────────────────────────

reg('links', ['l'], 'Social links', false, async () => {
  term.clear();
  term.addBlank();
  term.addHTML('<span class="hl">LINKS</span>', 'output');
  term.addBlank();

  const links = siteData?.links || {};
  const entries = Object.entries(links);
  if (entries.length === 0) {
    term.addHTML('  <a href="https://instagram.com/i.m.u.r.me" target="_blank">instagram.com/i.m.u.r.me</a>', 'output');
  } else {
    for (const [name, url] of entries) {
      await wait(80);
      term.addHTML(`  <span class="accent">${name.padEnd(14)}</span><a href="${url}" target="_blank">${url}</a>`, 'output');
    }
  }
  term.addBlank();
});

// ── generate ────────────────────────────────────────────────

let imageGlitchInited = false;

reg('generate', ['gen', 'art', 'corrupt'], 'Perception distortion', false, async () => {
  term.addLine('Initializing corruption engine...', 'system');
  await wait(200);
  glitch.burst(300);
  await wait(400);
  term.openPanel('gen-panel');
  if (!imageGlitchInited) {
    imageGlitch.init();
    imageGlitchInited = true;
  }
  initGenerator();
});

function initGenerator() {
  const input = document.querySelector('#gen-panel .gen-input');
  const outputEl = document.querySelector('#gen-panel .gen-output');
  if (!input || !outputEl) return;

  let mode = 'glitch';

  // Mode buttons
  document.querySelectorAll('#gen-panel .gen-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#gen-panel .gen-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      renderGenOutput(input.value, mode, outputEl);
    });
  });

  input.addEventListener('input', () => {
    renderGenOutput(input.value, mode, outputEl);
  });

  // Copy button
  document.querySelector('#gen-panel .gen-btn.primary')?.addEventListener('click', () => {
    copyGenOutput(outputEl);
  });

  input.focus();
}

function renderGenOutput(text, mode, el) {
  if (!text) { el.innerHTML = '<span style="color:var(--term-comment)">type something...</span>'; return; }

  switch (mode) {
    case 'glitch':
      el.innerHTML = `<span class="glitch-text" data-text="${escAttr(text)}" style="color:var(--term-fg)">${escHtml(text)}</span>`;
      break;
    case 'zalgo':
      el.textContent = zalgo(text);
      el.style.color = 'var(--term-fg)';
      break;
    case 'matrix':
      el.innerHTML = text.split('').map(c =>
        `<span style="color:hsl(${120 + randInt(-20, 20)}, 100%, ${randInt(40, 70)}%); opacity:${(0.5 + Math.random() * 0.5).toFixed(2)}">${escHtml(c)}</span>`
      ).join('');
      break;
    case 'corrupt':
      el.innerHTML = text.split('').map(c =>
        Math.random() > 0.7
          ? `<span style="color:var(--glitch-r)">${randomGlitchChar()}</span>`
          : `<span style="color:var(--term-fg)">${escHtml(c)}</span>`
      ).join('');
      break;
    case 'scan':
      el.innerHTML = `<span style="color:var(--term-fg);text-shadow:0 0 8px var(--term-fg),0 0 16px rgba(0,255,65,0.3)">${escHtml(text)}</span>`;
      break;
    default:
      el.textContent = text;
  }
}

function zalgo(text) {
  const above = ['\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307','\u0308','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F','\u0310','\u0311','\u0312','\u0313','\u0314','\u033D','\u033E','\u033F','\u0340','\u0341','\u0342','\u0343','\u0344','\u0346','\u034A','\u034B','\u034C'];
  const below = ['\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F','\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327','\u0328','\u0329','\u032A','\u032B','\u032C','\u032D','\u032E','\u032F','\u0330','\u0331','\u0332','\u0333','\u0339','\u033A','\u033B','\u033C','\u0345','\u0347','\u0348','\u0349'];

  return text.split('').map(c => {
    let out = c;
    const na = randInt(2, 6);
    const nb = randInt(2, 6);
    for (let i = 0; i < na; i++) out += above[randInt(0, above.length - 1)];
    for (let i = 0; i < nb; i++) out += below[randInt(0, below.length - 1)];
    return out;
  }).join('');
}

async function copyGenOutput(el) {
  try {
    await navigator.clipboard.writeText(el.textContent);
    const btn = document.querySelector('#gen-panel .gen-btn.primary');
    if (btn) { const orig = btn.textContent; btn.textContent = 'COPIED!'; setTimeout(() => btn.textContent = orig, 1500); }
  } catch {
    // Fallback
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
  }
}

// ── contact ────────────────────────────────────────────────

reg('contact', ['dm'], 'Get in touch', false, async () => {
  term.clear();
  term.addBlank();
  term.addHTML('<span class="hl">CONTACT</span>', 'output');
  term.addBlank();
  term.addLine('  DM on any platform. Fastest response on Instagram.', 'output');
  term.addBlank();
  term.addHTML('  <span class="accent">instagram    </span><a href="https://instagram.com/i.m.u.r.me" target="_blank">@i.m.u.r.me</a>', 'output');
  term.addHTML('  <span class="accent">tiktok       </span><a href="https://tiktok.com/@i.m.u.r.me" target="_blank">@i.m.u.r.me</a>', 'output');
  term.addHTML('  <span class="accent">youtube      </span><a href="https://youtube.com/@imurme-yt" target="_blank">@imurme-yt</a>', 'output');
  term.addBlank();
  term.addLine('  For business inquiries, DM with subject line.', 'system');
  term.addBlank();
});

// ── projects ───────────────────────────────────────────────

reg('projects', ['work'], 'Projects & music', false, async () => {
  term.clear();
  term.addBlank();
  term.addHTML('<span class="hl">PROJECTS</span>', 'output');
  term.addBlank();

  const songs = siteData?.songs || [];
  if (songs.length > 0) {
    term.addHTML('  <span class="dim">── TRACKS ──</span>', 'output');
    term.addBlank();
    for (const song of songs) {
      await wait(60);
      term.addHTML(`  <span class="accent">▸</span> ${song}`, 'output');
    }
    term.addBlank();
  }

  term.addHTML('  <span class="dim">── LISTEN ──</span>', 'output');
  term.addBlank();
  term.addHTML('  <span class="accent">spotify      </span><a href="https://open.spotify.com/artist/3GyTBvYVvSPZLz0iuvZXTd" target="_blank">IMURME on Spotify</a>', 'output');
  term.addHTML('  <span class="accent">apple music  </span><a href="https://music.apple.com/us/artist/imurme/1817310491" target="_blank">IMURME on Apple Music</a>', 'output');
  term.addHTML('  <span class="accent">soundcloud   </span><a href="https://soundcloud.com/IMURME" target="_blank">IMURME on SoundCloud</a>', 'output');
  term.addBlank();
});

// ── listen ──────────────────────────────────────────────────

reg('listen', ['play'], 'Listen to IMURME', false, async () => {
  term.clear();
  term.addBlank();
  term.addHTML('<span class="hl">LISTEN</span>', 'output');
  term.addBlank();

  // Streaming links
  term.addHTML('  <span class="accent">spotify      </span><a href="https://open.spotify.com/artist/3GyTBvYVvSPZLz0iuvZXTd" target="_blank">Open Spotify</a>', 'output');
  term.addHTML('  <span class="accent">apple music  </span><a href="https://music.apple.com/us/artist/imurme/1817310491" target="_blank">Open Apple Music</a>', 'output');
  term.addHTML('  <span class="accent">soundcloud   </span><a href="https://soundcloud.com/IMURME" target="_blank">Open SoundCloud</a>', 'output');
  term.addBlank();

  // YouTube embeds
  const yt = siteData?.youtube;
  if (yt) {
    const startParam = yt.latestStart ? `&start=${yt.latestStart}` : '';
    term.addHTML(`<div class="listen-embeds">
      <div class="listen-embed">
        <div class="listen-embed-label"><span class="accent">▸</span> ${escHtml(yt.featuredTitle || 'Featured')}</div>
        <div class="listen-embed-wrap">
          <iframe src="https://www.youtube.com/embed/${yt.featured}" title="${escAttr(yt.featuredTitle || 'Featured')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
      </div>
      <div class="listen-embed">
        <div class="listen-embed-label"><span class="accent">▸</span> ${escHtml(yt.latestTitle || 'Latest')} <span class="dim">— newest</span></div>
        <div class="listen-embed-wrap">
          <iframe src="https://www.youtube.com/embed/${yt.latest}?${startParam}" title="${escAttr(yt.latestTitle || 'Latest')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
      </div>
    </div>`, 'output');
    term.addBlank();
  }

  // Discography table
  const disc = siteData?.discography || [];
  if (disc.length > 0) {
    term.addHTML('<span class="hl">DISCOGRAPHY</span>', 'output');
    term.addBlank();

    // Header
    term.addHTML(`<div class="disco-table">
      <div class="disco-row disco-header">
        <span class="disco-title">TRACK</span>
        <span class="disco-meta">DUR</span>
        <span class="disco-meta">BPM</span>
        <span class="disco-meta">KEY</span>
        <span class="disco-meta">REL</span>
        <span class="disco-link"></span>
      </div>
      ${disc.map(s => `<div class="disco-row">
        <span class="disco-title accent">${escHtml(s.title)}</span>
        <span class="disco-meta dim">${escHtml(s.duration)}</span>
        <span class="disco-meta dim">${escHtml(s.bpm)}</span>
        <span class="disco-meta dim">${escHtml(s.key)}</span>
        <span class="disco-meta dim">${escHtml(s.released)}</span>
        <span class="disco-link"><a href="https://distrokid.com/hyperfollow/imurme/${s.slug}" target="_blank">STREAM</a></span>
      </div>`).join('')}
    </div>`, 'output');
    term.addBlank();
  }
});

// ── home ────────────────────────────────────────────────────

reg('home', ['back'], 'Home screen', false, () => {
  term.closePanel();
  term.clear();
  term.addBlank();
  for (const line of LOGO) term.addLine(line, 'ascii');
  term.addBlank();
  term.addLine('  Welcome to the IMURME terminal.', 'system');
  term.addLine('  Type help for commands. Hidden commands exist.', 'system');
  term.addBlank();

  term.addHTML('<span class="hl">AVAILABLE COMMANDS</span>', 'output');
  term.addBlank();
  for (const cmd of getOrderedVisibleCommands()) {
    renderCommandLine(cmd);
  }
  term.addBlank();
  term.addLine('  Type a command to explore. Hidden commands exist.', 'system');
  term.addBlank();
});

// ── clear ───────────────────────────────────────────────────

reg('clear', ['c'], 'Clear terminal', false, () => {
  term.clear();
});

// ── glitch (escalate + meltdown easter egg) ─────────────────

let maxCorruptionHits = 0;

reg('glitch', [], 'Corrupt the terminal', false, async () => {
  const lvl = glitch.getLevel();
  if (lvl >= 3) {
    maxCorruptionHits++;
    term.addLine('MAXIMUM CORRUPTION REACHED', 'error');
    glitch.burst(500);
    if (maxCorruptionHits >= 4) {
      await corruptionMeltdown();
    }
    return;
  }
  glitch.setLevel(lvl + 1);
  glitch.burst(400);
  term.addLine(`Corruption level: ${lvl + 1}/3`, 'system');
});

// ── Corruption Meltdown Easter Egg ──────────────────────────

async function corruptionMeltdown() {
  term.lock();

  // ── Phase 1: Calm before the storm ──
  glitch.setLevel(0);
  await wait(400);
  term.addLine('...', 'system');
  await wait(1500);

  // ── Phase 2: Violent shutdown ──
  glitch.setLevel(3);
  glitch.burst(1000);
  glitch.flash(200);
  glitch.shake(500);
  await wait(300);

  // Rapid flicker
  const terminal = $('terminal');
  for (let i = 0; i < 8; i++) {
    terminal.style.opacity = i % 2 === 0 ? '0' : '1';
    await wait(40 + Math.random() * 60);
  }
  terminal.style.opacity = '0';
  glitch.flash(300);
  await wait(500);

  // ── Phase 3: Black screen with typed messages ──
  const overlay = document.createElement('div');
  overlay.id = 'meltdown-overlay';
  document.body.appendChild(overlay);

  const textEl = document.createElement('div');
  textEl.className = 'meltdown-text';
  overlay.appendChild(textEl);

  // Blinking cursor appears alone first
  const cursorSpan = document.createElement('span');
  cursorSpan.className = 'meltdown-cursor';
  textEl.appendChild(cursorSpan);
  await wait(2000);

  // Type first message
  cursorSpan.remove();
  await typeText(textEl, 'why would you do that?', { speed: 80, jitter: 30 });
  textEl.appendChild(cursorSpan);
  await wait(2500);

  // Clear and type second message
  textEl.textContent = '';
  textEl.appendChild(cursorSpan);
  await wait(1000);
  cursorSpan.remove();
  await typeText(textEl, 'it hurts me ...', { speed: 100, jitter: 40 });
  textEl.appendChild(cursorSpan);
  await wait(2000);

  // ── Phase 4: Glitch the overlay then meltdown ──
  for (let i = 0; i < 5; i++) {
    overlay.style.transform = `translateX(${randInt(-15, 15)}px) skewX(${randInt(-3, 3)}deg)`;
    overlay.style.opacity = String(0.5 + Math.random() * 0.5);
    await wait(60);
  }
  overlay.style.transform = '';
  overlay.style.opacity = '1';
  await wait(200);

  // Remove overlay, reveal page flipped upside down
  overlay.remove();
  terminal.style.opacity = '1';

  // Flip everything
  document.documentElement.classList.add('meltdown-flip');
  glitch.setLevel(3);
  await wait(400);

  // Stutter effect
  document.documentElement.classList.remove('meltdown-flip');
  document.documentElement.classList.add('meltdown-stutter');

  // Spawn dial-up artifacts
  const artifacts = document.createElement('div');
  artifacts.id = 'dialup-artifacts';
  document.body.appendChild(artifacts);

  for (let i = 0; i < 25; i++) {
    const bar = document.createElement('div');
    bar.className = 'artifact-bar';
    bar.style.setProperty('--art-top', randInt(0, 100) + '%');
    bar.style.setProperty('--art-hue', String(randInt(0, 360)));
    bar.style.setProperty('--art-height', randInt(1, 6) + 'px');
    bar.style.setProperty('--art-duration', (0.3 + Math.random() * 0.8) + 's');
    bar.style.setProperty('--art-delay', (Math.random() * 1.5) + 's');
    artifacts.appendChild(bar);
  }

  await wait(3000);
  artifacts.remove();

  // ── Phase 5: Reset prompt ──
  document.documentElement.classList.remove('meltdown-stutter');
  document.documentElement.classList.add('meltdown-flip');

  const resetOverlay = document.createElement('div');
  resetOverlay.id = 'reset-overlay';

  if (isMobile()) {
    resetOverlay.innerHTML = `
      <div class="reset-prompt">
        <div class="reset-text">⚠ TERMINAL MALFUNCTION ⚠</div>
        <button class="reset-btn">tap here to reset broken terminal</button>
      </div>
    `;
    document.body.appendChild(resetOverlay);
    await new Promise(resolve => {
      resetOverlay.querySelector('.reset-btn').addEventListener('click', resolve, { once: true });
    });
  } else {
    resetOverlay.innerHTML = `
      <div class="reset-prompt">
        <div class="reset-text">⚠ TERMINAL MALFUNCTION ⚠</div>
        <div class="reset-hint">type <span class="hl">reset</span> to debug terminal</div>
        <input class="reset-input" type="text" autocomplete="off" autocorrect="off" spellcheck="false">
      </div>
    `;
    document.body.appendChild(resetOverlay);
    const resetInput = resetOverlay.querySelector('.reset-input');
    resetInput.focus();
    await new Promise(resolve => {
      resetInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && resetInput.value.trim().toLowerCase() === 'reset') {
          resolve();
        }
      });
    });
  }

  // ── Phase 6: Recovery with red tint ──
  resetOverlay.remove();

  // Unflip with transition
  document.documentElement.classList.remove('meltdown-flip');
  document.documentElement.style.transition = 'transform 500ms ease';
  document.documentElement.style.transform = '';
  await wait(600);
  document.documentElement.style.transition = '';

  // Apply permanent red tint
  document.documentElement.classList.add('corrupted');
  const bgCanvas = document.getElementById('bg-matrix');
  if (bgCanvas) bgCanvas.style.filter = 'hue-rotate(280deg)';

  glitch.setLevel(0);
  glitch.burst(300);
  await wait(400);

  // Show home screen in red
  term.closePanel();
  term.clear();
  term.addBlank();
  for (const line of LOGO) term.addLine(line, 'ascii');
  term.addBlank();
  term.addLine('  Terminal recovered. Corruption damage: permanent.', 'system');
  term.addLine('  Type help for commands. Hidden commands exist.', 'system');
  term.addBlank();
  term.addHTML('<span class="hl">AVAILABLE COMMANDS</span>', 'output');
  term.addBlank();
  for (const cmd of getOrderedVisibleCommands()) { renderCommandLine(cmd); }
  term.addBlank();
  term.addLine('  Type a command to explore. Hidden commands exist.', 'system');
  term.addBlank();

  term.unlock();
  maxCorruptionHits = 0;
}

// ── exit ────────────────────────────────────────────────────

reg('exit', ['q'], 'Shut down', false, async () => {
  term.lock();
  term.addLine('Shutting down...', 'system');
  await wait(500);
  glitch.burst(600);
  await wait(700);

  // Fade out lines one by one from bottom
  const lines = document.querySelectorAll('.term-line');
  for (let i = lines.length - 1; i >= 0; i--) {
    lines[i].style.opacity = '0';
    await wait(15);
  }

  await wait(500);
  term.clear();
  await wait(800);

  // Reboot
  await term.typeLine('Rebooting...', 'system', 30);
  await wait(600);
  term.clear();
  term.unlock();
  term.addLine('System restored. Type help for commands.', 'system');
  term.addBlank();
});

// ── Easter Eggs ─────────────────────────────────────────────

reg('sudo', [], '', true, async (args) => {
  if (args.join(' ') === 'rm -rf /') {
    term.lock();
    term.addLine('[sudo] password for visitor: ********', 'system');
    await wait(400);
    term.addLine('rm: destroying filesystem...', 'error');
    await wait(200);

    glitch.setLevel(3);
    glitch.burst(800);

    // Dissolve all text
    const lines = document.querySelectorAll('.term-line');
    for (const line of lines) {
      const text = line.textContent;
      line.innerHTML = text.split('').map(c =>
        `<span style="transition:all ${randInt(200, 800)}ms ease;display:inline-block">${escHtml(c)}</span>`
      ).join('');
    }
    await wait(50);
    document.querySelectorAll('.term-line span').forEach(s => {
      s.style.opacity = '0';
      s.style.transform = `translate(${randInt(-30, 30)}px, ${randInt(-20, 40)}px) rotate(${randInt(-45, 45)}deg)`;
    });
    await wait(1200);
    term.clear();
    await wait(1000);

    glitch.setLevel(0);
    await term.typeLine('Filesystem reconstructed. Nothing is real.', 'system', 25);
    term.addBlank();
    term.unlock();
    return;
  }
  term.addLine(`sudo: ${args[0] || 'what'}: command not found`, 'error');
});

reg('matrix', [], '', true, async () => {
  term.lock();
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '90',
    background: 'black', overflow: 'hidden',
    fontFamily: 'var(--font-mono)', fontSize: '14px',
    color: 'var(--term-fg)', lineHeight: '1',
  });
  document.body.appendChild(overlay);

  const cols = Math.floor(window.innerWidth / 14);
  const drops = Array(cols).fill(0);

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  overlay.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let frames = 0;
  const maxFrames = 180; // ~3 seconds at 60fps

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff41';
    ctx.font = '14px monospace';

    for (let i = 0; i < drops.length; i++) {
      const char = String.fromCharCode(0x30A0 + randInt(0, 95));
      ctx.fillText(char, i * 14, drops[i] * 14);
      if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }

    frames++;
    if (frames < maxFrames) requestAnimationFrame(draw);
    else {
      overlay.remove();
      term.unlock();
      term.addLine('Wake up, Neo...', 'system');
    }
  }
  draw();
});

reg('hack', [], '', true, async () => {
  term.lock();
  const hexChars = '0123456789ABCDEF';
  for (let i = 0; i < 12; i++) {
    const hex = Array.from({ length: 48 }, () => hexChars[randInt(0, 15)]).join('');
    term.addLine(`0x${hex}`, 'system');
    await wait(80);
  }
  await wait(200);
  term.addLine('', 'output');
  term.addLine('[===========================] 100%', 'accent');
  await wait(300);
  term.addLine('ACCESS GRANTED', 'error');
  glitch.burst(300);
  await wait(400);
  term.addLine('Just kidding. There is nothing to hack.', 'system');
  term.addBlank();
  term.unlock();
});

reg('ping', [], '', true, async (args) => {
  const host = args[0] || 'imurme.com';
  for (let i = 0; i < 4; i++) {
    await wait(300);
    term.addLine(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${(Math.random() * 2 + 0.1).toFixed(1)}ms`, 'output');
  }
  term.addLine(`${host} is alive and well.`, 'system');
});

reg('666', [], '', true, async () => {
  term.lock();
  document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
  glitch.setLevel(3);
  glitch.burst(600);
  await wait(1500);
  document.documentElement.style.filter = '';
  glitch.setLevel(1);
  term.addLine('HE COMES', 'error');
  await wait(300);
  term.clear();
  term.addLine('Nothing happened.', 'system');
  term.addBlank();
  term.unlock();
});

reg('source', ['credits'], '', true, () => {
  term.addBlank();
  term.addLine('Built with raw HTML, CSS, and JS.', 'system');
  term.addLine('No frameworks were harmed in the making of this site.', 'system');
  term.addBlank();
});

// ── Command Execution ───────────────────────────────────────

export async function execute(input) {
  if (!input) return;
  const parts = input.trim().split(/\s+/);
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);

  const cmd = commands[name];
  if (!cmd) {
    term.addLine(`command not found: ${name}`, 'error');
    term.addLine('Type help for available commands.', 'system');
    return;
  }

  term.lock();
  try {
    await cmd.handler(args);
  } catch (err) {
    term.addLine(`Error: ${err.message}`, 'error');
  }
  term.unlock();
}

// ── Helpers ─────────────────────────────────────────────────

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s) {
  return escHtml(s).replace(/"/g, '&quot;');
}
