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
import { showToast } from './toast';
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

  // Verify DOM position hasn't drifted (e.g. if native Bookmark button loaded AFTER us)
  const anchor = resolvePlacementAnchor(actionBar, mode);
  if (!anchor) return false;

  if (anchor.kind === 'edge') {
    if (actionBar.firstElementChild !== wrapper) return false;
  } else {
    const neighborWrapper = getDirectChildWrapper(actionBar, anchor.neighbor);
    if (!neighborWrapper) return false;
    
    if (anchor.position === 'before') {
      if (wrapper.nextElementSibling !== neighborWrapper) return false;
    } else {
      if (wrapper.previousElementSibling !== neighborWrapper) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Button rendering
// ---------------------------------------------------------------------------

export function markButtonAsSaved(btnContainer: HTMLElement) {
  btnContainer.dataset.saved = 'true';
  btnContainer.setAttribute('title', 'Saved in XMarks');
  btnContainer.setAttribute('aria-label', 'Saved to XMarks');

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
  // Fallback for unrecognized testIds: try to use xDomAdapter logic or just fail safely
  // by integrating into the adapter structure instead of raw querySelector.
  // We'll leave it as querySelector for completely unknown ones, but log a warning.
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[XMarks] Unrecognized testId '${testId}' passed to findActionItem.`);
  }
  return actionBar.querySelector(`[data-testid="${testId}"]`);
}

// ---------------------------------------------------------------------------
// Placement resolution
// ---------------------------------------------------------------------------
//
// X's action bar is not one uniform flex row: reply/retweet/like/views grow
// evenly to fill space, while bookmark/share sit in their own fixed-width,
// right-aligned pair. The anchor we resolve here is later used BOTH to clone
// the correct neighbor's wrapper (so the injected cell inherits the right
// flex/alignment rules for wherever it lands) and to perform the actual DOM
// insertion — keeping the two in agreement instead of guessing separately.

export type PlacementAnchor =
  | { kind: 'edge' }
  | { kind: 'wrapper'; neighbor: Element; position: 'before' | 'after' };

/** Resolve where the save button should sit for the current settings. */
export function resolvePlacementAnchor(actionBar: Element, mode: InjectMode): PlacementAnchor | null {
  // Insert immediately after `testId`'s native item; if that item is missing
  // on this tweet, sit just before Share, otherwise append at the very end.
  const insertAfter = (testId: string): PlacementAnchor | null => {
    const target = findActionItem(actionBar, testId);
    if (target) return { kind: 'wrapper', neighbor: target, position: 'after' };
    if (testId !== 'share') {
      const share = findActionItem(actionBar, 'share');
      if (share) return { kind: 'wrapper', neighbor: share, position: 'before' };
    }
    return actionBar.lastElementChild
      ? { kind: 'wrapper', neighbor: actionBar.lastElementChild, position: 'after' }
      : null;
  };

  if (mode === 'arrow') return insertAfter('bookmark');

  switch (settingInjectedPosition) {
    case 'leftmost':
      return { kind: 'edge' };
    case 'after-reply':
      return insertAfter('reply');
    case 'after-retweet':
      return insertAfter('retweet');
    case 'after-like':
      return insertAfter('like');
    case 'after-views': {
      const views = findActionItem(actionBar, 'views');
      if (views) return { kind: 'wrapper', neighbor: views, position: 'after' };
      // Views isn't rendered for this viewer/tweet — sit just before Bookmark, then Share.
      const bookmark = findActionItem(actionBar, 'bookmark');
      if (bookmark) return { kind: 'wrapper', neighbor: bookmark, position: 'before' };
      const share = findActionItem(actionBar, 'share');
      return share ? { kind: 'wrapper', neighbor: share, position: 'before' } : null;
    }
    case 'next-to-bookmark':
      return insertAfter('bookmark');
    default: // rightmost
      return insertAfter('share');
  }
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
    const score = scoreActionGroup(actionBar);
    if (score < MIN_ACTION_BAR_SCORE) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[XMarks] Skipping action bar injection: score (${score}) is below MIN_ACTION_BAR_SCORE (${MIN_ACTION_BAR_SCORE}).`, actionBar);
      }
      return;
    }

    // ── Resolve where the button goes, and what to clone it from ───────
    // The wrapper we clone MUST be the one actually neighboring the final
    // insertion point — X mixes an evenly-grown group (reply/retweet/like/
    // views) with a fixed-width, right-aligned pair (bookmark/share), so
    // cloning the wrong neighbor's classes (or forcing a flex value that
    // doesn't match) misaligns or over-widens the injected cell.
    const anchor = resolvePlacementAnchor(actionBar, mode);
    if (!anchor) return;

    const neighborWrapper = (
      anchor.kind === 'edge' ? actionBar.firstElementChild : getDirectChildWrapper(actionBar, anchor.neighbor)
    ) as HTMLElement | null;
    if (!neighborWrapper) return;

    // refBtn is only used to clone the button's own icon/hover-circle markup —
    // unrelated to the flex/positioning inherited from neighborWrapper above.
    const refBtn = findActionItem(actionBar, 'bookmark')
      || findActionItem(actionBar, 'like')
      || findActionItem(actionBar, 'reply');

    if (!refBtn) return;

    // Extract tweet ID for saved check
    const tweetIdResult = getTweetId(tweet);
    const tweetId = tweetIdResult.element ?? '';

    if (!tweetId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[XMarks] Skipping injection: unable to extract tweet ID for tweet element.', tweet);
      }
      return; // gracefully skip instead of failing validation every frame
    }

    // ── Build the button itself ─────────────────────────────────────────
    // Clone refBtn (deep) to inherit X's native hover circle, alignment, padding, and transitions
    const btnContainer = refBtn.cloneNode(true) as HTMLElement;
    btnContainer.classList.add('twtbk-save-btn');

    // Deep clone neighborWrapper to inherit its exact item wrapper styling, flex attributes, AND any intermediate inner divs
    const itemWrapper = neighborWrapper.cloneNode(true) as HTMLElement;
    itemWrapper.classList.add('twtbk-item-wrapper');

    // Find the original action button inside the cloned wrapper and swap it with our generated button
    const nativeBtnInWrapper = itemWrapper.querySelector('button, a[role="link"], [role="button"]') || itemWrapper.firstElementChild;
    if (nativeBtnInWrapper) {
      nativeBtnInWrapper.replaceWith(btnContainer);
    } else {
      itemWrapper.appendChild(btnContainer);
    }
    
    // Clean up intermediate wrappers
    itemWrapper.querySelectorAll('[data-testid], [aria-label]').forEach(el => {
      if (!el.classList.contains('twtbk-save-btn') && !btnContainer.contains(el)) {
        el.removeAttribute('data-testid');
        el.removeAttribute('aria-label');
      }
    });

    // ── Idempotency markers (Hardening Roadmap #4) ─────────────────────
    itemWrapper.dataset.twtbkInjected = '1';
    itemWrapper.dataset.twtbkAdapterVersion = String(DATA_VERSION);
    itemWrapper.dataset.twtbkTweetId = tweetId;
    itemWrapper.dataset.twtbkMode = mode;
    itemWrapper.dataset.twtbkPlacement = placement;

    // Preserve X's native computed alignment/flex from the cloned neighbor —
    // do NOT force a flex value here; it must match whichever group (evenly
    // grown vs fixed-width) the neighbor actually belongs to.

    // Strip data-testid and aria-label from btnContainer and ALL descendants to prevent selector collisions
    btnContainer.removeAttribute('data-testid');
    btnContainer.removeAttribute('aria-pressed');
    btnContainer.querySelectorAll('[data-testid]').forEach(el => el.removeAttribute('data-testid'));
    btnContainer.querySelectorAll('[aria-label]').forEach(el => el.removeAttribute('aria-label'));

    btnContainer.setAttribute('aria-label', 'Save to XMarks');
    btnContainer.setAttribute('aria-haspopup', 'dialog');
    btnContainer.setAttribute('title', 'Save to XMarks');

    // Deeply strip any count labels, text nodes, or count wrapper elements from cloned button
    const initialSvg = btnContainer.querySelector('svg');
    if (initialSvg) {
      // Remove all siblings of the icon container inside its parent wrapper
      const iconCircle = initialSvg.closest('div') || initialSvg.parentElement;
      if (iconCircle && iconCircle.parentElement) {
        Array.from(iconCircle.parentElement.children).forEach(sibling => {
          if (sibling !== iconCircle && !sibling.contains(initialSvg)) {
            sibling.remove();
          }
        });
      }
    }
    // Remove any remaining text-bearing spans or containers inside btnContainer
    btnContainer.querySelectorAll('span, div[dir="auto"], div[data-testid*="count"]').forEach(el => {
      if (!el.querySelector('svg')) {
        el.remove();
      }
    });

    // When placed among count-bearing items (reply, retweet, like, views),
    // the preceding item's count label extends rightward into its flex column.
    // Adding an 8px left margin centers our icon in the visual gap between
    // the preceding number label and the following action icon.
    if (['after-reply', 'after-retweet', 'after-like', 'after-views'].includes(placement)) {
      btnContainer.style.marginLeft = '8px';
    }

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
        showToast("Extension updated. Please refresh page to save!", false);
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

    // ── Placement ─────────────────────────────────────────────────────
    // Insert relative to the SAME neighborWrapper we cloned from above, so
    // styling and position always agree.
    if (anchor.kind === 'edge') {
      actionBar.insertBefore(itemWrapper, actionBar.firstElementChild);
    } else if (anchor.position === 'before') {
      actionBar.insertBefore(itemWrapper, neighborWrapper);
    } else if (neighborWrapper.nextElementSibling) {
      actionBar.insertBefore(itemWrapper, neighborWrapper.nextElementSibling);
    } else {
      actionBar.appendChild(itemWrapper);
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
