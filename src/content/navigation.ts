import { debouncedInjectSaveButtons } from './inject';
import { checkBookmarkPage } from './importer';
import { settingsReady } from './settings';
import { containsTweetOrAction, isActionBar, isBookmarkPage } from './xDomAdapter';

let lastPathname = window.location.pathname;
const checkNavigation = () => {
  if (window.location.pathname !== lastPathname) {
    lastPathname = window.location.pathname;
    checkBookmarkPage();
  }
};

const observer = new MutationObserver((mutations) => {
  // JSDOM can deliver queued mutation callbacks after the test environment
  // has torn down the window/document globals. Ignore those late callbacks.
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let shouldInject = false;
  for (const mutation of mutations) {
    const target = mutation.target as Element;
    const targetIsActionBar = target.nodeType === 1 && isActionBar(target);
    const addedActionBarOrTweet = Array.from(mutation.addedNodes).some((node) => {
      if (node.nodeType !== 1) return false;
      return containsTweetOrAction(node as Element);
    });
    if (targetIsActionBar || addedActionBarOrTweet) {
      shouldInject = true;
      break;
    }
  }
  if (shouldInject) {
    debouncedInjectSaveButtons();
    checkNavigation();
  } else if (isBookmarkPage() && !document.getElementById('twtbk-sidebar-importer-container')) {
    checkBookmarkPage();
  }
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
