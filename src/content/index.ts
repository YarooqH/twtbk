import './styles';
import './navigation';
import {
  settingSaveMode,
  settingNativeOverrideAction,
} from './settings';
import { injectSaveButtons } from './inject';
import { extractTweetData } from './extract';
import { showCategoryPopover } from './popover';
import { showToast } from './toast';

// Re-inject buttons when relevant settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.saveMode || changes.injectedPosition || changes.nativeOverrideAction || changes.buttonAlignment) {
      document.querySelectorAll('.twtbk-item-wrapper, .twtbk-save-btn').forEach(el => el.remove());
      if (settingSaveMode === 'injected' || (settingSaveMode === 'native-override' && settingNativeOverrideAction === 'arrow')) {
        injectSaveButtons();
      }
    }
  }
});

// Native Bookmark Listener
document.addEventListener('click', (e) => {
  try {
    const target = e.target as HTMLElement;
    const bookmarkBtn = target.closest('[data-testid="bookmark"], [data-testid="removeBookmark"]');
    if (bookmarkBtn) {
      if (!chrome.runtime?.id) {
        console.warn("XMarks: Context invalidated. Please refresh the page.");
        return;
      }

      const tweetElement = bookmarkBtn.closest('[data-testid="tweet"]');
      if (!tweetElement) return;
      const data = extractTweetData(tweetElement);
      if (!data) return;

      if (settingSaveMode === 'native-override' && settingNativeOverrideAction === 'replace') {
        // This mode owns the bookmark click; do not let X rerender the anchor under the picker.
        e.preventDefault();
        e.stopImmediatePropagation();
        showCategoryPopover(data, bookmarkBtn as HTMLElement);
      } else if (bookmarkBtn.getAttribute('data-testid') === 'bookmark') {
        // Traditional passive save in background if setting is enabled (injected mode, OR native-override + arrow mode)
        chrome.storage.sync.get(['alsoSaveNativeBookmarks'], (result) => {
          if (result.alsoSaveNativeBookmarks) {
            chrome.runtime.sendMessage({ type: 'SAVE_TWEET', payload: data }, (res) => {
              if (res && res.success) {
                showToast("Saved to XMarks!");
              }
            });
          }
        });
      }
    }
  } catch (err) {
    console.error("XMarks: Error in native bookmark click listener", err);
  }
}, true);
