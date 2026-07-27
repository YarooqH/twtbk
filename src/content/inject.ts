import { MSG } from '../messages';
import {
  settingSaveMode,
  settingInjectedPosition,
  settingNativeOverrideAction,
  settingButtonAlignment,
  currentAccentColor,
  settingsLoaded,
} from './settings';
import { extractTweetData } from './extract';
import { showCategoryPopover } from './popover';
import {
  type ActionType,
  findAction,
  findAllTweets,
  findActionBar,
  getActionWrapper,
  getTweetId,
  scoreActionGroup,
  MIN_ACTION_BAR_SCORE,
  ADAPTER_VERSION,
} from './xDomAdapter';

// ---------------------------------------------------------------------------
// Idempotent injection helpers (Hardening Roadmap #4)
// ---------------------------------------------------------------------------

/** Baked into every injected wrapper so future adapter schema changes
 *  invalidate stale wrappers automatically. */
export const DATA_VERSION = ADAPTER_VERSION;

/** Explicit injection modes (Hardening Roadmap #6). */
export type InjectMode = 'injected' | 'replace' | 'augment' | 'arrow';

/** Derive the active mode from persistent settings so every consumer
 *  (inject.ts, index.ts) agrees without duplicating ad-hoc checks. */
export function resolveInjectMode(): InjectMode {
  if (settingSaveMode === 'native-override') {
    if (settingNativeOverrideAction === 'replace') return 'replace';
    if (settingNativeOverrideAction === 'arrow') return 'arrow';
  }
  // 'augment' is not yet wired to a setting; reserved for future use.
  return 'injected';
}

/** Per-tweet injection state tracked in a WeakMap (auto-GC'd with the tweet). */
export interface InjectedState {
  wrapper: HTMLElement;
  tweetId: string;
  adapterVersion: number;
  mode: InjectMode;
  placement: string;
  builtAt: number;
}

const injectionStates = new WeakMap<Element, InjectedState>();

/** Compute the logical placement label for the current settings,
 *  so we can detect placement changes without DOM diffing. */
function computePlacement(): string {
  if (settingSaveMode === 'native-override') return 'next-to-bookmark'; // arrow sits after bookmark
  return settingInjectedPosition;
}

/**
 * Validate an existing injected wrapper.
 * Returns true when the wrapper is still attached, has a matching
 * adapter version, tweet id, mode, and placement — i.e. it is healthy.
 */
function validateWrapper(
  wrapper: HTMLElement,
  actionBar: Element,
  tweetId: string,
  mode: InjectMode,
  placement: string,
): boolean {
  if (!actionBar.contains(wrapper)) return false;
  if (wrapper.dataset.twtbkAdapterVersion !== String(DATA_VERSION)) return false;
  if (wrapper.dataset.twtbkTweetId !== tweetId) return false;
  // Optional runtime mode/placement check (dataset stores the build-time values).
  if (wrapper.dataset.twtbkMode !== mode) return false;
  if (wrapper.dataset.twtbkPlacement !== placement) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Button rendering
// ---------------------------------------------------------------------------

export function markButtonAsSaved(btnContainer: HTMLElement) {
  btnContainer.dataset.saved = 'true';
  btnContainer.setAttribute('title', 'Saved in XMarks');

  const svg = btnContainer.querySelector('svg');
  if (!svg) return;

  svg.style.color = currentAccentColor;
  svg.style.fill = currentAccentColor;
  svg.style.stroke = currentAccentColor;

  if (settingSaveMode === 'native-override') {
    svg.innerHTML = `<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>`;
  } else {
    svg.innerHTML = `
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `;
  }
}

/** Map legacy testId strings to the adapter's ActionType. */
function testIdToActionType(testId: string): ActionType | null {
  switch (testId) {
    case 'bookmark': return 'bookmark';
    case 'like': return 'like';
    case 'retweet': return 'retweet';
    case 'reply': return 'reply';
    case 'views':
    case 'analytics': return 'views';
    case 'share': return 'share';
    default: return null;
  }
}

// Helper: Find direct child wrapper of actionBar [role="group"]
export function getDirectChildWrapper(actionBar: Element, target: Element): HTMLElement {
  return getActionWrapper(actionBar, target);
}

export function findActionItem(actionBar: Element, testId: string): Element | null {
  const actionType = testIdToActionType(testId);
  if (actionType) {
    const result = findAction(actionBar, actionType);
    return result.element ?? null;
  }
  // Fallback for unrecognized testIds: direct data-testid lookup
  return actionBar.querySelector(`[data-testid="${testId}"]`);
}

export function injectSaveButtons() {
  // Never render a default-mode button before chrome.storage has supplied the user's mode.
  if (!settingsLoaded) return;

  const mode = resolveInjectMode();
  // 'replace' mode owns the native bookmark click; it does NOT inject a separate button.
  if (mode === 'replace') return;

  const tweets = findAllTweets();
  const placement = computePlacement();

  tweets.forEach(tweet => {
    // ── Idempotency: check WeakMap state + DOM health ──────────────────
    const existingState = injectionStates.get(tweet);
    if (existingState) {
      const actionBarResult = findActionBar(tweet);
      const actionBar = actionBarResult.element;
      if (actionBar && validateWrapper(existingState.wrapper, actionBar, existingState.tweetId, mode, placement)) {
        // Wrapper is healthy — nothing to do.
        return;
      }
      // Stale or detached — remove the old wrapper before rebuilding.
      existingState.wrapper.remove();
      injectionStates.delete(tweet);
    }

    // Fallback: clean up any orphaned DOM wrappers that lost their WeakMap entry.
    const domWrapper = tweet.querySelector('.twtbk-item-wrapper') as HTMLElement | null;
    if (domWrapper) {
      domWrapper.remove();
    }

    // ── Locate a verified action bar ───────────────────────────────────
    const actionBarResult = findActionBar(tweet);
    if (!actionBarResult.found || !actionBarResult.element) return;
    const actionBar = actionBarResult.element;

    // Only inject into a verified action bar with enough recognized native actions
    if (scoreActionGroup(actionBar) < MIN_ACTION_BAR_SCORE) return;

    // ── Clone X's native DOM structure ─────────────────────────────────
    const refBtn = findActionItem(actionBar, 'bookmark')
      || findActionItem(actionBar, 'like')
      || findActionItem(actionBar, 'reply');

    if (!refBtn) return;

    const refWrapper = getDirectChildWrapper(actionBar, refBtn);

    // Extract tweet ID for saved check
    const tweetIdResult = getTweetId(tweet);
    const tweetId = tweetIdResult.element ?? '';

    // Clone refWrapper (shallow) to get X's exact item wrapper styling and flex attributes
    const itemWrapper = refWrapper.cloneNode(false) as HTMLElement;
    itemWrapper.classList.add('twtbk-item-wrapper');

    // ── Idempotency markers (Hardening Roadmap #4) ─────────────────────
    itemWrapper.dataset.twtbkInjected = '1';
    itemWrapper.dataset.twtbkAdapterVersion = String(DATA_VERSION);
    itemWrapper.dataset.twtbkTweetId = tweetId;
    itemWrapper.dataset.twtbkMode = mode;
    itemWrapper.dataset.twtbkPlacement = placement;

    // Enforce equal flex distribution and alignment across all action items
    itemWrapper.style.display = 'flex';
    itemWrapper.style.alignItems = 'center';
    itemWrapper.style.flex = '1 1 0%';
    itemWrapper.style.justifyContent = settingButtonAlignment === 'left' ? 'flex-start'
      : settingButtonAlignment === 'right' ? 'flex-end'
      : 'center';

    // Clone refBtn (deep) to inherit X's native hover circle, alignment, padding, and transitions
    const btnContainer = refBtn.cloneNode(true) as HTMLElement;
    btnContainer.classList.add('twtbk-save-btn');
    btnContainer.removeAttribute('data-testid');
    btnContainer.setAttribute('title', 'Save to XMarks');

    // Strip any numeric count labels from cloned button
    btnContainer.querySelectorAll('span').forEach(span => {
      if (span.textContent && /^\d+/.test(span.textContent.trim())) {
        span.remove();
      }
    });

    // Replace inner SVG with XMarks icon
    const svgEl = btnContainer.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('viewBox', '0 0 24 24');
      svgEl.style.color = '#71767b';
      svgEl.style.transition = 'color 0.2s, fill 0.2s';

      if (mode === 'arrow') {
        // Arrow mode: small dropdown-affordance chevron alongside the native bookmark
        svgEl.style.fill = 'currentColor';
        svgEl.innerHTML = `<path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>`;
      } else {
        // injected / augment: save bookmark icon
        svgEl.style.fill = 'none';
        svgEl.style.stroke = 'currentColor';
        svgEl.style.strokeWidth = '2';
        svgEl.innerHTML = `
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-linecap="round" stroke-linejoin="round"/>
        `;
      }
    }

    btnContainer.addEventListener('mouseover', () => {
      const svg = btnContainer.querySelector('svg');
      if (svg) svg.style.color = currentAccentColor;
    });

    btnContainer.addEventListener('mouseout', () => {
      const svg = btnContainer.querySelector('svg');
      if (svg) {
        svg.style.color = btnContainer.dataset.saved === 'true' ? currentAccentColor : '#71767b';
      }
    });

    // ── Mode-specific click handler ────────────────────────────────────
    // Injected / arrow / augment: the XMarks button always calls saveTweet.
    btnContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!chrome.runtime?.id) {
        alert("Extension context was updated. Please refresh the page to save bookmarks!");
        return;
      }
      saveTweet(tweet, btnContainer);
    });

    // Check if this tweet is already saved in XMarks DB (C1)
    if (tweetId && chrome.runtime?.id) {
      try {
        chrome.runtime.sendMessage({ type: MSG.CHECK_TWEET_SAVED, payload: { id: tweetId } }, (res) => {
          if (chrome.runtime.lastError) return;
          if (res?.saved) {
            markButtonAsSaved(btnContainer);
          }
        });
      } catch {
        // Context invalidated safely ignored
      }
    }

    itemWrapper.appendChild(btnContainer);

    // ── Placement ─────────────────────────────────────────────────────
    const insertWrapperAfterTestId = (testId: string) => {
      const target = findActionItem(actionBar, testId);
      if (target) {
        const siblingWrapper = getDirectChildWrapper(actionBar, target);
        if (siblingWrapper.nextElementSibling) {
          actionBar.insertBefore(itemWrapper, siblingWrapper.nextElementSibling);
        } else {
          actionBar.appendChild(itemWrapper);
        }
      } else {
        actionBar.appendChild(itemWrapper);
      }
    };

    if (mode === 'arrow') {
      // Arrow mode: inject after the native bookmark so the chevron sits next to it.
      const bookmarkBtn = findActionItem(actionBar, 'bookmark') || findActionItem(actionBar, 'share');
      if (bookmarkBtn) {
        const siblingWrapper = getDirectChildWrapper(actionBar, bookmarkBtn);
        const nextEl = siblingWrapper.nextElementSibling;
        if (nextEl) {
          actionBar.insertBefore(itemWrapper, nextEl);
        } else {
          actionBar.appendChild(itemWrapper);
        }
      }
    } else if (settingInjectedPosition === 'leftmost') {
      actionBar.insertBefore(itemWrapper, actionBar.firstElementChild);
    } else if (settingInjectedPosition === 'after-reply') {
      insertWrapperAfterTestId('reply');
    } else if (settingInjectedPosition === 'after-retweet') {
      insertWrapperAfterTestId('retweet');
    } else if (settingInjectedPosition === 'after-like') {
      insertWrapperAfterTestId('like');
    } else if (settingInjectedPosition === 'after-views') {
      insertWrapperAfterTestId('views');
    } else if (settingInjectedPosition === 'next-to-bookmark') {
      const bookmarkBtn = findActionItem(actionBar, 'bookmark');
      if (bookmarkBtn) {
        const bookmarkWrapper = getDirectChildWrapper(actionBar, bookmarkBtn);
        if (bookmarkWrapper.nextElementSibling) {
          actionBar.insertBefore(itemWrapper, bookmarkWrapper.nextElementSibling);
        } else {
          actionBar.appendChild(itemWrapper);
        }
      } else {
        const shareBtn = findActionItem(actionBar, 'share');
        if (shareBtn) {
          const shareWrapper = getDirectChildWrapper(actionBar, shareBtn);
          actionBar.insertBefore(itemWrapper, shareWrapper);
        } else {
          actionBar.appendChild(itemWrapper);
        }
      }
    } else {
      // rightmost — after share
      insertWrapperAfterTestId('share');
    }

    // ── Track state for future health checks ──────────────────────────
    injectionStates.set(tweet, {
      wrapper: itemWrapper,
      tweetId,
      adapterVersion: DATA_VERSION,
      mode,
      placement,
      builtAt: Date.now(),
    });
  });
}

export function saveTweet(tweetElement: Element, anchorEl: HTMLElement) {
  const data = extractTweetData(tweetElement);
  if (!data) return;
  showCategoryPopover(data, anchorEl);
}

export let injectAnimationFrame: number | null = null;
export const debouncedInjectSaveButtons = () => {
  if (injectAnimationFrame !== null) return;
  injectAnimationFrame = requestAnimationFrame(() => {
    injectAnimationFrame = null;
    injectSaveButtons();
  });
};
