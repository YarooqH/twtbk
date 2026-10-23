// Captures Chrome Web Store screenshots of the built extension (../dist).
//
//   npm run capture            (run `npm run build` in the repo root first)
//
// Loads the real extension in Microsoft Edge (branded Chrome 137+ ignores
// --load-extension), fills it with a fictional demo library, and serves a
// look-alike X timeline at https://x.com/home so the real content script
// injects its save button, popover and Sync Bookmarks entry. Nothing touches
// the network or a real X account.
//
// Writes store-ready 1280x800 JPEGs to output/ and 2x PNGs to output/2x/
// (for framing in marketing images later).

import { chromium } from 'playwright';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoLibrary } from './demo-library.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION = path.resolve(here, '..', 'dist');
const OUT = path.join(here, 'output');
const OUT_2X = path.join(OUT, '2x');
const BROWSER = process.env.XMARKS_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VIEWPORT = { width: 1280, height: 800 };

const fixture = (name) => readFileSync(path.join(here, 'fixtures', name), 'utf8');
const X_HOME = fixture('x-home.html');
const X_POSTS_JS = fixture('x-home-posts.js');
const ASSETS_HTML = fixture('assets.html');

// Avatars are photos (fixtures/avatars/*.png, gitignored; see CREDITS.md there),
// keyed by file name like the drawings.
function loadAvatars(art) {
  const dir = path.join(here, 'fixtures', 'avatars');
  if (!existsSync(dir)) return console.warn('no fixtures/avatars/ (gitignored): avatars will be blank');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.png'))) art.set(file.slice(0, -4), readFileSync(path.join(dir, file)));
}


// ---- Helpers ----

async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 95, scale: 'css' });
  await page.screenshot({ path: path.join(OUT_2X, `${name}@2x.png`), type: 'png', scale: 'device' });
  console.log('  saved', name);
}

// ---- Run ----

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT_2X, { recursive: true });

const profile = mkdtempSync(path.join(tmpdir(), 'xmarks-capture-'));
const context = await chromium.launchPersistentContext(profile, {
  executablePath: BROWSER,
  headless: true,
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
});

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 15000 }));
  const extId = new URL(worker.url()).host;
  console.log('extension', extId);

  // Settings and onboarding: a returning user, dark theme, default blue accent,
  // save button next to X's bookmark button. Skips the tour and welcome panel.
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

  // Draw the avatars and post images (fixtures/assets.html) to PNG.
  console.log('drawings');
  await page.route('https://studio.local/', (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: ASSETS_HTML }));
  await page.goto('https://studio.local/');
  const art = new Map();
  for (const el of await page.locator('[data-asset]').all()) {
    art.set(await el.getAttribute('data-asset'), await el.screenshot({ type: 'png', scale: 'css' }));
  }
  await page.unroute('https://studio.local/');
  loadAvatars(art);
  console.log('  drew', art.size);

  // Dashboard: open once so Dexie creates the database, then write the demo library.
  const dashboardUrl = `chrome-extension://${extId}/dashboard.html`;
  await page.goto(dashboardUrl);
  await page.waitForLoadState('networkidle');
  const lib = demoLibrary(Date.now(), (name) => `data:image/png;base64,${art.get(name).toString('base64')}`);
  await page.evaluate(async ({ categories, bookmarks }) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('TwitterBookmarkDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['bookmarks', 'categories'], 'readwrite');
      tx.objectStore('bookmarks').clear();
      tx.objectStore('categories').clear();
      for (const c of categories) tx.objectStore('categories').put({ ...c, createdAt: new Date(c.createdAt) });
      for (const b of bookmarks) {
        const row = { ...b, createdAt: new Date(b.createdAt), savedAt: new Date(b.savedAt) };
        if (!row.note) delete row.note;
        if (!row.quotedTweet) delete row.quotedTweet;
        tx.objectStore('bookmarks').put(row);
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, lib);

  console.log('dashboard');
  await page.goto(dashboardUrl);
  await page.waitForSelector('.bm-author-name', { timeout: 15000 });
  // Open the settings panel (save mode, accent, density) so the right column isn't empty.
  const settingsToggle = page.getByText('Settings', { exact: true }).last();
  if (await settingsToggle.count()) await settingsToggle.click();
  await page.waitForTimeout(500);
  await shot(page, '01-dashboard');

  await page.fill('.search-input', 'bread');
  await shot(page, '02-dashboard-search');
  await page.fill('.search-input', '');

  await page.locator('.sidebar-item', { hasText: 'Memes' }).first().click();
  await shot(page, '03-dashboard-category');

  // X timeline stand-in. Only x.com and its image host are served, from local
  // files and the drawings above; everything else is blocked.
  console.log('timeline');
  await page.route('**/*', (route) => {
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
  await page.goto('https://x.com/home');
  await page.waitForSelector('.twtbk-save-btn', { timeout: 15000 });
  await shot(page, '04-timeline-button');

  // Open the popover on the first post and add a note.
  const saveButtons = page.locator('.twtbk-save-btn');
  await saveButtons.nth(0).click();
  await page.waitForSelector('.twtbk-popover', { timeout: 5000 });
  await page.fill('#twtbk-note', 'my reply to every email from now on');
  await shot(page, '05-timeline-popover');

  // Pick a category: the icon fills and X-style toast appears.
  await page.locator('.twtbk-cat-item', { hasText: 'Memes' }).click();
  await page.waitForSelector('#twtbk-toast', { timeout: 5000 });
  await page.waitForTimeout(600);
  await shot(page, '06-timeline-saved');

  // Further down the feed: the video and tier-list posts, each with the button.
  await page.evaluate(() => document.getElementById('twtbk-toast')?.remove());
  await page.locator('[data-testid="tweet"]').nth(2).scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelectorAll('[data-testid="tweet"]')[2].scrollIntoView({ block: 'start' }));
  await page.mouse.wheel(0, -60);
  await shot(page, '07-timeline-media');

  // Bookmarks page: XMarks adds Sync Bookmarks under the Post button.
  console.log('bookmarks page');
  await page.goto('https://x.com/i/bookmarks');
  const sync = page.getByText('Sync Bookmarks', { exact: true }).first();
  await sync.waitFor({ timeout: 15000 });
  await shot(page, '08-sync-entry');
  await sync.click();
  await page.waitForTimeout(400);
  await shot(page, '09-sync-panel');
} finally {
  await context.close();
  rmSync(profile, { recursive: true, force: true });
}
console.log('done ->', OUT);
