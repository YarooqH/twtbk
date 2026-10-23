// Records the README demo: sync existing bookmarks, save a new post from the
// timeline, then find it in the dashboard.
//
//   npm run demo               (run `npm run build` in the repo root first; needs ffmpeg on PATH)
//
// Same setup as capture.mjs: the real extension in Edge, the look-alike X pages
// from fixtures/, no network. The library starts empty apart from the
// categories, so the sync really imports the fixture posts. The first post is
// left off the Bookmarks page so scene 2 has something new to save.
//
// Frames come from Chrome's screencast (sharper than Playwright's video) and
// are stitched by ffmpeg into output/demo/xmarks-demo.gif and .mp4.

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoLibrary } from './demo-library.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION = path.resolve(here, '..', 'dist');
const OUT = path.join(here, 'output', 'demo');
const FRAMES = path.join(OUT, 'frames');
const BROWSER = process.env.XMARKS_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VIEWPORT = { width: 1280, height: 800 };
const GIF_WIDTH = 960;
const GIF_FPS = 15;

const fixture = (name) => readFileSync(path.join(here, 'fixtures', name), 'utf8');
const X_HOME = fixture('x-home.html');
// Drop the first post from the Bookmarks page only.
const X_POSTS_JS = fixture('x-home-posts.js').replace(
  /\r?\n {2}\];\r?\n/,
  "\n  ];\n  if (location.pathname.startsWith('/i/bookmarks')) posts.shift();\n",
);
const ASSETS_HTML = fixture('assets.html');

// Avatars are photos (fixtures/avatars/*.png, gitignored; see CREDITS.md there),
// keyed by file name like the drawings.
function loadAvatars(art) {
  const dir = path.join(here, 'fixtures', 'avatars');
  if (!existsSync(dir)) return console.warn('no fixtures/avatars/ (gitignored): avatars will be blank');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.png'))) art.set(file.slice(0, -4), readFileSync(path.join(dir, file)));
}


// ---- Cursor and captions ----
// Headless screencasts don't show the pointer, so draw one that follows the
// real mouse events, plus a caption pill naming the current step.

const OVERLAY_JS = `(() => {
  if (window.__demoOverlay) return;
  const boot = () => {
    if (!document.body || document.getElementById('demo-cursor')) return;
    window.__demoOverlay = true;
    const style = document.createElement('style');
    style.textContent = \`
      #demo-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; z-index: 2147483647; pointer-events: none;
        transform: translate(var(--x, -100px), var(--y, -100px)); filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
      #demo-ripple { position: fixed; z-index: 2147483646; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%;
        background: rgba(29,155,240,.45); pointer-events: none; opacity: 0; transform: scale(.3); }
      #demo-ripple.on { animation: demo-ripple .45s ease-out; }
      @keyframes demo-ripple { 0% { opacity: .9; transform: scale(.3); } 100% { opacity: 0; transform: scale(1.3); } }
      #demo-caption { position: fixed; left: 50%; bottom: 28px; z-index: 2147483645; pointer-events: none;
        transform: translate(-50%, 12px); opacity: 0; transition: opacity .3s, transform .3s;
        display: flex; align-items: center; gap: 12px; padding: 12px 22px 12px 12px; border-radius: 9999px;
        background: rgba(21,24,28,.94); border: 1px solid #2f3336; box-shadow: 0 8px 28px rgba(0,0,0,.55);
        color: #e7e9ea; font: 600 19px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      #demo-caption.on { opacity: 1; transform: translate(-50%, 0); }
      #demo-caption.top { bottom: auto; top: 72px; }
      #demo-caption b { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #1d9bf0; color: #fff; font-size: 16px; }
    \`;
    document.head.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2l15 9.2-6.6 1.3L8 19z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    const ripple = document.createElement('div');
    ripple.id = 'demo-ripple';
    const caption = document.createElement('div');
    caption.id = 'demo-caption';
    document.body.append(caption, ripple, cursor);
    const at = (x, y) => { cursor.style.setProperty('--x', (x - 3) + 'px'); cursor.style.setProperty('--y', (y - 2) + 'px'); };
    if (window.__demoStart) at(...window.__demoStart);
    addEventListener('mousemove', (e) => at(e.clientX, e.clientY), true);
    addEventListener('mousedown', (e) => {
      ripple.style.left = e.clientX + 'px'; ripple.style.top = e.clientY + 'px';
      ripple.classList.remove('on'); void ripple.offsetWidth; ripple.classList.add('on');
    }, true);
    window.__demoCaption = (step, text, top) => {
      caption.classList.toggle('top', top);
      caption.innerHTML = '<b>' + step + '</b><span>' + text + '</span>';
      requestAnimationFrame(() => caption.classList.add('on'));
    };
  };
  if (document.body) boot(); else addEventListener('DOMContentLoaded', boot);
})();`;

let pointer = { x: 900, y: 420 };

async function overlay(page) {
  await page.evaluate(([x, y]) => { window.__demoStart = [x, y]; }, [pointer.x, pointer.y]);
  await page.evaluate(OVERLAY_JS);
  await page.mouse.move(pointer.x, pointer.y);
}

async function caption(page, step, text, { top = false } = {}) {
  await page.evaluate(([s, t, tp]) => window.__demoCaption(s, t, tp), [step, text, top]);
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Glide the pointer to the centre of `target` (a locator) over ~`ms`. */
async function moveTo(page, target, ms = 650) {
  const box = await target.boundingBox();
  if (!box) throw new Error('no bounding box for move target');
  const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const from = { ...pointer };
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    await page.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
    await page.waitForTimeout(16);
  }
  pointer = to;
}

async function click(page, target, ms) {
  await moveTo(page, target, ms);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
}


// ---- Screencast ----

const frames = []; // { t, file }
const speedRanges = []; // { from, to, speed } in wall-clock ms
let cdp = null;
let frameNo = 0;

async function startCast(page) {
  cdp = await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
    const file = path.join(FRAMES, `f${String(frameNo++).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ t: Date.now(), file });
    cdp?.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height, everyNthFrame: 1 });
  // A gap between scenes is cut out: the next frame starts right after the last one.
  if (frames.length) frames.push({ cut: true });
}

async function stopCast(page, hold = 0) {
  if (hold) await page.waitForTimeout(hold);
  // Repeat the last frame so the scene holds until this moment.
  const last = frames.at(-1);
  if (last && !last.cut) frames.push({ t: Date.now(), file: last.file });
  await cdp.send('Page.stopScreencast').catch(() => {});
  await cdp.detach().catch(() => {});
  cdp = null;
}

async function fast(speed, fn) {
  const from = Date.now();
  await fn();
  speedRanges.push({ from, to: Date.now(), speed });
}

/** Wall-clock duration from a to b, shortened inside the fast ranges. */
function played(a, b) {
  let ms = b - a;
  for (const r of speedRanges) {
    const overlap = Math.min(b, r.to) - Math.max(a, r.from);
    if (overlap > 0) ms -= overlap - overlap / r.speed;
  }
  return ms;
}

function encode() {
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const next = frames[i + 1];
    if (f.cut || !next || next.cut) continue;
    const ms = played(f.t, next.t);
    if (ms <= 0) continue;
    lines.push(`file '${f.file.replaceAll('\\', '/')}'`, `duration ${(ms / 1000).toFixed(4)}`);
  }
  // The concat demuxer ignores the last entry's duration unless it's repeated.
  lines.push(lines.at(-2));
  const list = path.join(OUT, 'frames.txt');
  writeFileSync(list, lines.join('\n') + '\n');

  const mp4 = path.join(OUT, 'xmarks-demo.mp4');
  const gif = path.join(OUT, 'xmarks-demo.gif');
  const run = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  run(['-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', mp4]);
  run(['-i', mp4, '-vf',
    `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    '-loop', '0', gif]);
  console.log('wrote', mp4);
  console.log('wrote', gif);
}


// ---- Run ----

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const profile = mkdtempSync(path.join(tmpdir(), 'xmarks-demo-'));
const context = await chromium.launchPersistentContext(profile, {
  executablePath: BROWSER,
  headless: true,
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
});

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 15000 }));
  const extId = new URL(worker.url()).host;
  console.log('extension', extId);

  const nowIso = new Date().toISOString();
  await worker.evaluate(async (iso) => {
    await chrome.storage.local.set({
      xmarks_onboarding: {
        version: 1, popupSeenAt: iso, dashboardSeenAt: iso, welcomePanelDismissed: true,
        firstSaveCompleted: true, firstSyncCompleted: true, firstDashboardActionCompleted: true,
        syncHintDismissed: true, saveModeGuidanceDismissed: true, tourCompletedAt: iso, tourDismissedAt: iso,
      },
    });
    await chrome.storage.sync.set({
      themeMode: 'dark', accentColor: '#1d9bf0', cardDensity: 'comfortable',
      saveMode: 'injected', injectedPosition: 'next-to-bookmark',
    });
  }, nowIso);

  const page = await context.newPage();

  await page.route('https://studio.local/', (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: ASSETS_HTML }));
  await page.goto('https://studio.local/');
  const art = new Map();
  for (const el of await page.locator('[data-asset]').all()) {
    art.set(await el.getAttribute('data-asset'), await el.screenshot({ type: 'png', scale: 'css' }));
  }
  await page.unroute('https://studio.local/');
  loadAvatars(art);

  // Categories only: the bookmarks arrive through the sync.
  const dashboardUrl = `chrome-extension://${extId}/dashboard.html`;
  await page.goto(dashboardUrl);
  await page.waitForLoadState('networkidle');
  const { categories } = demoLibrary(Date.now(), () => '');
  await page.evaluate(async (cats) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('TwitterBookmarkDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['bookmarks', 'categories'], 'readwrite');
      tx.objectStore('bookmarks').clear();
      tx.objectStore('categories').clear();
      for (const c of cats) tx.objectStore('categories').put({ ...c, createdAt: new Date(c.createdAt) });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, categories);

  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'x.com' && (url.pathname === '/home' || url.pathname === '/i/bookmarks')) {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: X_HOME });
    }
    if (url.hostname === 'x.com' && url.pathname === '/fixtures/x-home-posts.js') {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: X_POSTS_JS });
    }
    if (url.hostname === 'pbs.twimg.com') {
      const name = path.basename(url.pathname, '.png');
      if (art.has(name)) return route.fulfill({ status: 200, contentType: 'image/png', body: art.get(name) });
    }
    return url.protocol.startsWith('http') ? route.abort() : route.continue();
  });

  // Scene 1: sync what's already bookmarked on X.
  console.log('scene 1: sync');
  await page.goto('https://x.com/i/bookmarks');
  const syncEntry = page.getByText('Sync Bookmarks', { exact: true }).first();
  await syncEntry.waitFor({ timeout: 15000 });
  await overlay(page);
  await page.waitForTimeout(300);
  await startCast(page);
  await caption(page, '1', 'Sync the bookmarks you already have');
  await page.waitForTimeout(900);
  await click(page, syncEntry, 800);
  await page.waitForSelector('#twtbk-start-import-btn', { timeout: 5000 });
  await page.waitForTimeout(900);
  await click(page, page.locator('#twtbk-start-import-btn'), 600);
  await page.waitForTimeout(1200);
  await fast(4, () => page.getByText('Sync complete', { exact: true }).first().waitFor({ timeout: 60000 }));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await stopCast(page, 1800);

  // Scene 2: save a new post from the timeline with a category and a note.
  console.log('scene 2: save');
  await page.goto('https://x.com/home');
  await page.waitForSelector('.twtbk-save-btn', { timeout: 15000 });
  await overlay(page);
  await page.waitForTimeout(400);
  await startCast(page);
  await caption(page, '2', 'Save new posts as you scroll');
  await page.waitForTimeout(1100);
  await click(page, page.locator('.twtbk-save-btn').first(), 750);
  await page.waitForSelector('.twtbk-popover', { timeout: 5000 });
  await page.waitForTimeout(600);
  await click(page, page.locator('#twtbk-note'), 450);
  await page.keyboard.type('my reply to every email from now on', { delay: 55 });
  await page.waitForTimeout(500);
  // The category list scrolls inside the popover; Memes is below the fold.
  const memes = page.locator('.twtbk-cat-item', { hasText: 'Memes' });
  await moveTo(page, page.locator('.twtbk-cat-item', { hasText: 'Dev' }), 450);
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(450);
  await memes.scrollIntoViewIfNeeded();
  await click(page, memes, 450);
  await page.waitForSelector('#twtbk-toast', { timeout: 5000 });
  await stopCast(page, 1800);

  // Scene 3: find it again in the dashboard, by the note.
  console.log('scene 3: search');
  await page.goto(dashboardUrl);
  await page.waitForSelector('.bm-author-name', { timeout: 15000 });
  const settingsToggle = page.getByText('Settings', { exact: true }).last();
  if (await settingsToggle.count()) await settingsToggle.click();
  pointer = { x: 760, y: 420 };
  await overlay(page);
  await page.waitForTimeout(500);
  await startCast(page);
  await caption(page, '3', 'Find anything, notes included');
  await page.waitForTimeout(1500);
  await click(page, page.locator('.search-input'), 650);
  await page.keyboard.type('email', { delay: 85 });
  await page.waitForTimeout(1200);
  await moveTo(page, page.getByText('my reply to every email from now on').first(), 700);
  await stopCast(page, 2200);
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
}

encode();
console.log('done ->', OUT);
