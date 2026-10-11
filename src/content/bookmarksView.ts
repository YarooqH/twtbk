// Is the user looking at their bookmarks list on X?
//
// X has two layouts, depending on the account's rollout:
//   - the classic page at /i/bookmarks (and /i/bookmarks/<folderId>)
//   - the History page at /i/history, with Bookmarks, Likes, Videos and
//     Articles tabs (shipped on iOS in May 2026, now reaching the web)
//
// Sync must only run on the Bookmarks view: on History, the Likes tab uses the
// same timeline markup, so scraping it would import likes as bookmarks.

const HISTORY_TAB_PATH = /^\/i\/history\/([^/]+)/;

export function isBookmarksView(loc: Pick<Location, 'pathname'> = window.location, doc: ParentNode = document): boolean {
  const path = loc.pathname.replace(/\/+$/, '');

  if (path === '/i/bookmarks' || path.startsWith('/i/bookmarks/')) return true;
  if (path !== '/i/history' && !path.startsWith('/i/history/')) return false;

  // History with the tab in the URL, e.g. /i/history/bookmarks or /i/history/likes.
  const tabInPath = path.match(HISTORY_TAB_PATH);
  if (tabInPath) return tabInPath[1] === 'bookmarks';

  // Bare /i/history: Bookmarks is the default tab, so the address alone can't
  // tell it from the others. Decide from the selected tab. Its link is
  // language independent: the Bookmarks tab points at /i/history itself (or
  // .../bookmarks), the others at /i/history/<likes|videos|articles>. Without
  // a link (the Bookmarks tab doubles as a folder menu), fall back to its label.
  const selected = doc.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if (!selected) return false;
  const href = selected.getAttribute('href') ?? selected.closest('a')?.getAttribute('href') ?? selected.querySelector('a')?.getAttribute('href') ?? '';
  if (href) {
    const tab = href.split(/[?#]/)[0].replace(/\/+$/, '').match(/^\/i\/history(?:\/([^/]+))?$/);
    if (tab) return !tab[1] || tab[1] === 'bookmarks';
    if (/\/bookmarks(\/|$)/.test(href)) return true;
  }
  return /bookmark/i.test(selected.textContent ?? '');
}

/** True on any page where the Bookmarks view can appear, including History's other tabs. */
export function isBookmarksOrHistoryPage(loc: Pick<Location, 'pathname'> = window.location): boolean {
  return /^\/i\/(bookmarks|history)(\/|$)/.test(loc.pathname);
}
