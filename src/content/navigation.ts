import { debouncedInjectSaveButtons } from './inject';
import { checkBookmarkPage } from './importer';
import { settingsReady } from './settings';

let lastPathname = window.location.pathname;
const checkNavigation = () => {
  if (window.location.pathname !== lastPathname) {
    lastPathname = window.location.pathname;
    checkBookmarkPage();
  }
};

const observer = new MutationObserver((mutations) => {
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
  } else if (window.location.pathname.includes('/i/bookmarks') && !document.getElementById('twtbk-sidebar-importer-container')) {
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
