import { debouncedInjectSaveButtons } from './inject';
import { checkBookmarkPage } from './importer';
import { isBookmarksOrHistoryPage, isBookmarksView } from './bookmarksView';
import { settingsReady } from './settings';

let lastPathname = window.location.pathname;
const checkNavigation = () => {
  if (window.location.pathname !== lastPathname) {
    lastPathname = window.location.pathname;
    checkBookmarkPage();
  }
};

// X's History page can switch between its Bookmarks and Likes tabs without a
// URL change, so re-check whenever the Sync entry's visibility and the current
// view disagree.
const syncImporterWithView = () => {
  if (!isBookmarksOrHistoryPage()) return;
  const shown = !!document.getElementById('twtbk-sidebar-importer-container');
  if (isBookmarksView() !== shown) checkBookmarkPage();
};

const observer = new MutationObserver((mutations) => {
  // JSDOM can deliver queued mutation callbacks after the test environment
  // has torn down the window/document globals. Ignore those late callbacks.
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let shouldInject = false;
  for (const mutation of mutations) {
    const target = mutation.target as Element;
    const targetIsActionBar = target.nodeType === 1
      && target.matches('[role="group"]')
      && !!target.closest('[data-testid="tweet"]');
    const addedActionBarOrTweet = Array.from(mutation.addedNodes).some((node) => {
      if (node.nodeType !== 1) return false;
      const element = node as Element;
      return element.matches('[data-testid="tweet"], [role="group"]')
        || !!element.querySelector('[data-testid="tweet"], [role="group"]');
    });
    if (targetIsActionBar || addedActionBarOrTweet) {
      shouldInject = true;
      break;
    }
  }
  if (shouldInject) {
    debouncedInjectSaveButtons();
    checkNavigation();
  }
  syncImporterWithView();
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Listen to native SPA history events (replacing setInterval double-polling)
window.addEventListener('popstate', checkNavigation);
const originalPushState = history.pushState;
history.pushState = function (...args) {
  originalPushState.apply(this, args);
  checkNavigation();
};

// Initial injection waits for the persisted mode and placement settings.
settingsReady.then(() => debouncedInjectSaveButtons());
checkBookmarkPage();
