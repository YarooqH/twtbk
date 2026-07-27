import { MSG } from '../messages';
import './styles';
import './navigation';
import { injectSaveButtons, resolveInjectMode } from './inject';
import { extractTweetData } from './extract';
import { showCategoryPopover } from './popover';
import { showToast } from './toast';
import { SELECTOR_CONFIG } from './xDomAdapter';

// Re-inject buttons when relevant settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.saveMode || changes.injectedPosition || changes.nativeOverrideAction || changes.buttonAlignment) {
      document.querySelectorAll('.twtbk-item-wrapper, .twtbk-save-btn').forEach(el => el.remove());
      const mode = resolveInjectMode();
      if (mode === 'injected' || mode === 'arrow' || mode === 'augment') {
        injectSaveButtons();
      }
    }
  }
});

// Native Bookmark Listener
document.addEventListener('click', (e) => {
  try {
    const target = e.target as HTMLElement;
    const bookmarkSelector = SELECTOR_CONFIG.bookmark.testIds
      .map(t => `[data-testid="${t.value}"]`)
      .join(', ');
    const bookmarkBtn = target.closest(bookmarkSelector);
    if (bookmarkBtn) {
      if (!chrome.runtime?.id) {
        console.warn("XMarks: Context invalidated. Please refresh the page.");
        return;
      }

      const tweetElement = bookmarkBtn.closest('[data-testid="tweet"]');
      if (!tweetElement) return;
      const data = extractTweetData(tweetElement);
      if (!data) return;

      const mode = resolveInjectMode();

      if (mode === 'replace') {
        // Replace mode: own the native bookmark click — prevent X from
        // rerendering and show the category picker anchored to X's button.
        e.preventDefault();
        e.stopImmediatePropagation();
        showCategoryPopover(data, bookmarkBtn as HTMLElement);
      } else if (mode === 'augment') {
        // Augment mode: allow the native bookmark click through (no preventDefault)
        // so X's bookmark toggle runs normally. Also save to XMarks in the background.
        // TODO: capture anchor rectangle here before X rerenders for popover positioning.
        if (bookmarkBtn.getAttribute('data-testid') === 'bookmark') {
          chrome.storage.sync.get(['alsoSaveNativeBookmarks'], (result) => {
            if (result.alsoSaveNativeBookmarks) {
              chrome.runtime.sendMessage({ type: MSG.SAVE_TWEET, payload: data }, (res) => {
                if (res && res.success) {
                  showToast("Saved to XMarks!");
                }
              });
            }
          });
        }
      } else {
        // Injected / Arrow: traditional passive save in background if enabled.
        if (bookmarkBtn.getAttribute('data-testid') === 'bookmark') {
          chrome.storage.sync.get(['alsoSaveNativeBookmarks'], (result) => {
            if (result.alsoSaveNativeBookmarks) {
              chrome.runtime.sendMessage({ type: MSG.SAVE_TWEET, payload: data }, (res) => {
                if (res && res.success) {
                  showToast("Saved to XMarks!");
                }
              });
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("XMarks: Error in native bookmark click listener", err);
  }
}, true);
