// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Define global.chrome BEFORE importing modules that touch chrome at top-level
(globalThis as any).chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn(),
    lastError: undefined,
  },
  storage: {
    sync: {
      get: vi.fn((_keys, cb) => cb && cb({})),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
};

import { findActionItem, injectSaveButtons, resolveInjectMode, DATA_VERSION } from './inject';
import { setSettingNativeOverrideAction, setSettingSaveMode, setSettingInjectedPosition } from './settings';
import { getActionState } from './xDomAdapter';
import {
  buildTimelineTweet,
  buildDetailTweet,
  buildQuoteTweet,
  buildSavedBookmarkTweet,
} from './__fixtures__/tweets';

// Helper to construct mock tweet DOM for different X.com views
function createMockTweet(options: {
  includeViews?: boolean;
  bookmarkAriaLabel?: string;
  shareAriaLabel?: string;
}) {
  const tweetEl = document.createElement('div');
  tweetEl.setAttribute('data-testid', 'tweet');

  const actionBar = document.createElement('div');
  actionBar.setAttribute('role', 'group');
  actionBar.className = 'css-175oi2r r-18u37iz r-1h0z52e r-13qz1uu'; // X native flex group classes

  // 1. Reply
  const replyWrapper = document.createElement('div');
  replyWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e reply-wrap';
  const replyBtn = document.createElement('button');
  replyBtn.setAttribute('data-testid', 'reply');
  const replySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  replyBtn.appendChild(replySvg);
  const replySpan = document.createElement('span');
  replySpan.textContent = '15';
  replyBtn.appendChild(replySpan);
  replyWrapper.appendChild(replyBtn);
  actionBar.appendChild(replyWrapper);

  // 2. Retweet
  const retweetWrapper = document.createElement('div');
  retweetWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e retweet-wrap';
  const retweetBtn = document.createElement('button');
  retweetBtn.setAttribute('data-testid', 'retweet');
  const retweetSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  retweetBtn.appendChild(retweetSvg);
  retweetWrapper.appendChild(retweetBtn);
  actionBar.appendChild(retweetWrapper);

  // 3. Like
  const likeWrapper = document.createElement('div');
  likeWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e like-wrap';
  const likeBtn = document.createElement('button');
  likeBtn.setAttribute('data-testid', 'like');
  const likeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  likeBtn.appendChild(likeSvg);
  likeWrapper.appendChild(likeBtn);
  actionBar.appendChild(likeWrapper);

  // 4. Views (optional, e.g. Timeline & Reply views have Views, Main Tweet view omits it)
  if (options.includeViews) {
    const viewsWrapper = document.createElement('div');
    viewsWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e views-wrap';
    const viewsBtn = document.createElement('a');
    viewsBtn.setAttribute('data-testid', 'analytics');
    const viewsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    viewsBtn.appendChild(viewsSvg);
    const viewsSpan = document.createElement('span');
    viewsSpan.textContent = '16K';
    viewsBtn.appendChild(viewsSpan);
    viewsWrapper.appendChild(viewsBtn);
    actionBar.appendChild(viewsWrapper);
  }

  // 5. Official Bookmark
  const bookmarkWrapper = document.createElement('div');
  bookmarkWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e bookmark-wrap';
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.setAttribute('data-testid', 'bookmark');
  if (options.bookmarkAriaLabel) {
    bookmarkBtn.setAttribute('aria-label', options.bookmarkAriaLabel);
  }
  const bookmarkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  bookmarkBtn.appendChild(bookmarkSvg);
  bookmarkWrapper.appendChild(bookmarkBtn);
  actionBar.appendChild(bookmarkWrapper);

  // 6. Share
  const shareWrapper = document.createElement('div');
  shareWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e share-wrap';
  const shareBtn = document.createElement('button');
  shareBtn.setAttribute('data-testid', 'share');
  shareBtn.setAttribute('aria-label', options.shareAriaLabel || 'Share post');
  const shareSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  shareBtn.appendChild(shareSvg);
  shareWrapper.appendChild(shareBtn);
  actionBar.appendChild(shareWrapper);

  tweetEl.appendChild(actionBar);
  return { tweetEl, actionBar, replyWrapper, retweetWrapper, likeWrapper, bookmarkWrapper, shareWrapper };
}

// Helper to simulate a hard page refresh & full DOM re-injection test
function simulateHardRefreshAndTest(
  positionSetting: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost',
  includeViews: boolean
) {
  // 1. Wipe DOM completely (hard refresh simulation)
  document.body.innerHTML = '';

  // 2. Set placement setting in configuration
  setSettingSaveMode('injected');
  setSettingInjectedPosition(positionSetting);

  // 3. Re-render fresh tweet action bar on page reload
  const { tweetEl, actionBar, replyWrapper, retweetWrapper, likeWrapper, bookmarkWrapper, shareWrapper } = createMockTweet({ includeViews });
  document.body.appendChild(tweetEl);

  // 4. Trigger fresh content script injection cycle
  injectSaveButtons();

  const injectedWrapper = actionBar.querySelector('.twtbk-item-wrapper');
  expect(injectedWrapper).not.toBeNull();

  const children = Array.from(actionBar.children);
  const injectedIdx = children.indexOf(injectedWrapper as Element);

  return {
    children,
    injectedIdx,
    injectedWrapper: injectedWrapper as HTMLElement,
    replyIdx: children.indexOf(replyWrapper),
    retweetIdx: children.indexOf(retweetWrapper),
    likeIdx: children.indexOf(likeWrapper),
    bookmarkIdx: children.indexOf(bookmarkWrapper),
    shareIdx: children.indexOf(shareWrapper),
  };
}

describe('X Action Bar Hard Refresh & Re-Test Suite Across All Placements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('1. Hard Refresh Retest: "next-to-bookmark" (After Official Bookmark, Before Share)', () => {
    it('TIMELINE & REPLY VIEW: After hard refresh, button is strictly index 5 (between Official Bookmark at 4 and Share at 6)', () => {
      const res = simulateHardRefreshAndTest('next-to-bookmark', true);

      expect(res.bookmarkIdx).toBe(4);
      expect(res.injectedIdx).toBe(5);
      expect(res.shareIdx).toBe(6);

      // Verify strict order: Official Bookmark < XMarks Button < Share
      expect(res.injectedIdx).toBe(res.bookmarkIdx + 1);
      expect(res.shareIdx).toBe(res.injectedIdx + 1);
    });

    it('MAIN TWEET VIEW: After hard refresh, button is strictly index 4 (between Official Bookmark at 3 and Share at 5)', () => {
      const res = simulateHardRefreshAndTest('next-to-bookmark', false);

      expect(res.bookmarkIdx).toBe(3);
      expect(res.injectedIdx).toBe(4);
      expect(res.shareIdx).toBe(5);

      expect(res.injectedIdx).toBe(res.bookmarkIdx + 1);
      expect(res.shareIdx).toBe(res.injectedIdx + 1);
    });
  });

  describe('2. Hard Refresh Retest: All Placement Modes', () => {
    it('leftmost: After hard refresh, button is strictly index 0 (before Reply)', () => {
      const res = simulateHardRefreshAndTest('leftmost', true);
      expect(res.injectedIdx).toBe(0);
      expect(res.replyIdx).toBe(1);
    });

    it('after-reply: After hard refresh, button is strictly index 1 (between Reply and Retweet)', () => {
      const res = simulateHardRefreshAndTest('after-reply', true);
      expect(res.replyIdx).toBe(0);
      expect(res.injectedIdx).toBe(1);
      expect(res.retweetIdx).toBe(2);
    });

    it('after-retweet: After hard refresh, button is strictly index 2 (between Retweet and Like)', () => {
      const res = simulateHardRefreshAndTest('after-retweet', true);
      expect(res.retweetIdx).toBe(1);
      expect(res.injectedIdx).toBe(2);
      expect(res.likeIdx).toBe(3);
    });

    it('after-like: After hard refresh, button is strictly index 3 (between Like and Views)', () => {
      const res = simulateHardRefreshAndTest('after-like', true);
      expect(res.likeIdx).toBe(2);
      expect(res.injectedIdx).toBe(3);
    });

    it('after-views: After hard refresh, button is strictly index 4 (between Views and Official Bookmark)', () => {
      const res = simulateHardRefreshAndTest('after-views', true);
      expect(res.injectedIdx).toBe(4);
      expect(res.bookmarkIdx).toBe(5);
      expect(res.injectedIdx).toBeLessThan(res.bookmarkIdx);
    });

    it('after-views without a Views action stays before Bookmark instead of moving after Share', () => {
      const res = simulateHardRefreshAndTest('after-views', false);
      expect(res.injectedIdx).toBe(3);
      expect(res.bookmarkIdx).toBe(4);
      expect(res.shareIdx).toBe(5);
    });

    it('rightmost: After hard refresh, button is strictly at end (after Share)', () => {
      const res = simulateHardRefreshAndTest('rightmost', true);
      expect(res.shareIdx).toBe(5);
      expect(res.injectedIdx).toBe(6);
    });
  });

  describe('3. Multi-Cycle Consecutive Hard Refresh & Re-Injection Retest', () => {
    it('Executes 5 consecutive hard refresh cycles on next-to-bookmark to ensure zero duplicate buttons and zero position drift', () => {
      for (let cycle = 1; cycle <= 5; cycle++) {
        const res = simulateHardRefreshAndTest('next-to-bookmark', true);
        expect(res.bookmarkIdx).toBe(4);
        expect(res.injectedIdx).toBe(5);
        expect(res.shareIdx).toBe(6);
        expect(res.children.length).toBe(7); // 6 native + 1 injected
      }
    });
  });

  describe('4. Native modes and X bookmark states', () => {
    it('recognizes X\'s removeBookmark state as the bookmark action', () => {
      const { actionBar, bookmarkWrapper } = createMockTweet({ includeViews: true });
      const bookmark = bookmarkWrapper.querySelector('[data-testid="bookmark"]') as HTMLElement;
      bookmark.setAttribute('data-testid', 'removeBookmark');

      expect(findActionItem(actionBar, 'bookmark')).toBe(bookmark);
    });

    it('does not inject a clone in native replace mode', () => {
      setSettingSaveMode('native-override');
      setSettingNativeOverrideAction('replace');
      const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
      document.body.appendChild(tweetEl);

      injectSaveButtons();

      expect(actionBar.querySelector('.twtbk-item-wrapper')).toBeNull();
    });

    it('injects the arrow control in native arrow mode', () => {
      setSettingSaveMode('native-override');
      setSettingNativeOverrideAction('arrow');
      const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
      document.body.appendChild(tweetEl);

      injectSaveButtons();

      expect(actionBar.querySelector('.twtbk-item-wrapper .twtbk-save-btn')).not.toBeNull();
    });
  });

  it('does not inject with defaults while persisted settings are still loading', async () => {
    vi.resetModules();
    document.body.innerHTML = '';
    let completeLoad: ((value: Record<string, unknown>) => void) | undefined;
    (globalThis as any).chrome.storage.sync.get = vi.fn((_keys: unknown, callback: (value: Record<string, unknown>) => void) => {
      completeLoad = callback;
    });

    const delayedInject = await import('./inject');
    const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
    document.body.appendChild(tweetEl);

    delayedInject.injectSaveButtons();
    expect(actionBar.querySelector('.twtbk-item-wrapper')).toBeNull();

    completeLoad?.({ saveMode: 'native-override', nativeOverrideAction: 'replace' });
    delayedInject.injectSaveButtons();
    expect(actionBar.querySelector('.twtbk-item-wrapper')).toBeNull();
  });

  describe('5. Idempotent injection (Hardening Roadmap #4)', () => {
    it('5 consecutive injectSaveButtons() calls on the SAME DOM produce exactly one wrapper', () => {
      setSettingSaveMode('injected');
      setSettingInjectedPosition('next-to-bookmark');
      const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
      document.body.appendChild(tweetEl);

      for (let i = 0; i < 5; i++) {
        injectSaveButtons();
      }

      const wrappers = actionBar.querySelectorAll('.twtbk-item-wrapper');
      expect(wrappers.length).toBe(1);
    });

    it('repeated calls do not remove and rebuild the wrapper', () => {
      setSettingSaveMode('injected');
      setSettingInjectedPosition('next-to-bookmark');
      const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
      document.body.appendChild(tweetEl);

      injectSaveButtons();
      const firstWrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
      expect(firstWrapper).not.toBeNull();

      // Second call must return the same DOM element (no remove + rebuild).
      injectSaveButtons();
      const secondWrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
      expect(secondWrapper).toBe(firstWrapper);
    });

    it('sets identity dataset attrs on the injected wrapper', () => {
      setSettingSaveMode('injected');
      setSettingInjectedPosition('next-to-bookmark');
      const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
      document.body.appendChild(tweetEl);

      // Add a /status/ link so tweet ID is detectable
      const link = document.createElement('a');
      link.setAttribute('href', '/tester/status/123456789');
      tweetEl.insertBefore(link, actionBar);

      injectSaveButtons();

      const wrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
      expect(wrapper).not.toBeNull();
      expect(wrapper.dataset.twtbkInjected).toBe('1');
      expect(wrapper.dataset.twtbkAdapterVersion).toBe(String(DATA_VERSION));
      expect(wrapper.dataset.twtbkTweetId).toBe('123456789');
      expect(wrapper.dataset.twtbkMode).toBe('injected');
      expect(wrapper.dataset.twtbkPlacement).toBe('next-to-bookmark');
    });

    it('rebuilds wrapper when the old one is detached from the action bar', () => {
      setSettingSaveMode('injected');
      setSettingInjectedPosition('next-to-bookmark');
      const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
      document.body.appendChild(tweetEl);

      injectSaveButtons();
      const firstWrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
      expect(firstWrapper).not.toBeNull();

      // Simulate detach: remove wrapper from DOM without WeakMap cleanup
      firstWrapper.remove();

      injectSaveButtons();
      const newWrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
      expect(newWrapper).not.toBeNull();
      expect(newWrapper).not.toBe(firstWrapper); // rebuilt
      // Still exactly one wrapper
      expect(actionBar.querySelectorAll('.twtbk-item-wrapper').length).toBe(1);
    });
  });

  it('gives the injected control its own accessible save semantics', () => {
    setSettingSaveMode('injected');
    setSettingInjectedPosition('next-to-bookmark');
    const { tweetEl, actionBar } = createMockTweet({ includeViews: true });
    const bookmark = actionBar.querySelector('[data-testid="bookmark"]')!;
    bookmark.setAttribute('aria-pressed', 'false');
    document.body.appendChild(tweetEl);

    injectSaveButtons();

    const button = actionBar.querySelector('.twtbk-save-btn') as HTMLElement;
    expect(button.getAttribute('aria-label')).toBe('Save to XMarks');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.hasAttribute('aria-pressed')).toBe(false);
  });

  describe('6. resolveInjectMode (Hardening Roadmap #6)', () => {
    it('returns "injected" when saveMode is injected', () => {
      setSettingSaveMode('injected');
      expect(resolveInjectMode()).toBe('injected');
    });

    it('returns "replace" when saveMode is native-override and action is replace', () => {
      setSettingSaveMode('native-override');
      setSettingNativeOverrideAction('replace');
      expect(resolveInjectMode()).toBe('replace');
    });

    it('returns "arrow" when saveMode is native-override and action is arrow', () => {
      setSettingSaveMode('native-override');
      setSettingNativeOverrideAction('arrow');
      expect(resolveInjectMode()).toBe('arrow');
    });
  });

  it('native replace prevents X from receiving the bookmark click', async () => {
    vi.resetModules();
    document.body.innerHTML = '';
    (globalThis as any).chrome.storage.sync.get = vi.fn((_keys: unknown, callback: (value: Record<string, unknown>) => void) => {
      callback({ saveMode: 'native-override', nativeOverrideAction: 'replace' });
    });
    (globalThis as any).chrome.runtime.sendMessage = vi.fn((message: { type: string }, callback?: (value: unknown) => void) => {
      if (message.type === 'GET_CATEGORIES') callback?.([]);
    });

    await import('./index');

    const tweet = document.createElement('article');
    tweet.setAttribute('data-testid', 'tweet');
    tweet.innerHTML = `
      <a href="/tester/status/123"><time datetime="2026-01-01T00:00:00.000Z"></time></a>
      <div role="group"><button data-testid="removeBookmark"><svg></svg></button></div>
    `;
    const bookmark = tweet.querySelector('[data-testid="removeBookmark"]') as HTMLButtonElement;
    const nativeHandler = vi.fn();
    bookmark.addEventListener('click', nativeHandler);
    document.body.appendChild(tweet);

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    bookmark.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(nativeHandler).not.toHaveBeenCalled();
    expect(document.getElementById('twtbk-picker')).not.toBeNull();
  });

// ---------------------------------------------------------------------------
// Fixture-driven injection tests (Hardening Roadmap #7)
// ---------------------------------------------------------------------------

describe('7. Fixture-driven placement tests', () => {
  /** Helper: inject into a fixture with the given placement and return indices. */
  function injectIntoFixture(
    buildFn: () => HTMLElement,
    placement: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost',
  ) {
    document.body.innerHTML = '';
    setSettingSaveMode('injected');
    setSettingInjectedPosition(placement);

    const tweet = buildFn();
    document.body.appendChild(tweet);

    injectSaveButtons();

    const actionBar = tweet.querySelector('[role="group"]')!;
    const children = Array.from(actionBar.children);
    const injectedWrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
    const injectedIdx = injectedWrapper ? children.indexOf(injectedWrapper) : -1;

    // Helper to find a child wrapper index by its action testId (handles aria-label too)
    function idxOf(testId: string): number {
      const el = findActionItem(actionBar, testId);
      if (!el) return -1;
      let curr: HTMLElement | null = el as HTMLElement;
      while (curr && curr.parentElement !== actionBar) {
        curr = curr.parentElement;
      }
      return curr ? children.indexOf(curr) : -1;
    }

    return {
      children,
      injectedIdx,
      injectedWrapper,
      replyIdx: idxOf('reply'),
      retweetIdx: idxOf('retweet'),
      likeIdx: idxOf('like'),
      bookmarkIdx: idxOf('bookmark'),
      shareIdx: idxOf('share'),
      viewsIdx: idxOf('analytics'),
    };
  }

  it('leftmost on timeline fixture (with views)', () => {
    const res = injectIntoFixture(buildTimelineTweet, 'leftmost');
    expect(res.injectedIdx).toBe(0);
    expect(res.replyIdx).toBe(1);
  });

  it('leftmost on detail fixture (no views)', () => {
    const res = injectIntoFixture(buildDetailTweet, 'leftmost');
    expect(res.injectedIdx).toBe(0);
    expect(res.replyIdx).toBe(1);
  });

  it('after-reply on timeline fixture', () => {
    const res = injectIntoFixture(buildTimelineTweet, 'after-reply');
    expect(res.replyIdx).toBe(0);
    expect(res.injectedIdx).toBe(1);
    expect(res.retweetIdx).toBe(2);
  });

  it('after-retweet on timeline fixture', () => {
    const res = injectIntoFixture(buildTimelineTweet, 'after-retweet');
    expect(res.retweetIdx).toBe(1);
    expect(res.injectedIdx).toBe(2);
    expect(res.likeIdx).toBe(3);
  });

  it('after-like on timeline fixture', () => {
    const res = injectIntoFixture(buildTimelineTweet, 'after-like');
    expect(res.likeIdx).toBe(2);
    expect(res.injectedIdx).toBe(3);
  });

  it('after-views on timeline fixture', () => {
    const res = injectIntoFixture(buildTimelineTweet, 'after-views');
    expect(res.viewsIdx).toBe(3);
    expect(res.injectedIdx).toBe(4);
    expect(res.bookmarkIdx).toBe(5);
  });

  it('next-to-bookmark on timeline fixture', () => {
    const res = injectIntoFixture(buildTimelineTweet, 'next-to-bookmark');
    expect(res.bookmarkIdx).toBe(4);
    expect(res.injectedIdx).toBe(5);
  });

  it('rightmost on timeline fixture (after share)', () => {
    const res = injectIntoFixture(buildTimelineTweet, 'rightmost');
    expect(res.injectedIdx).toBe(6);
    expect(res.shareIdx).toBe(5);
  });

  it('rightmost on detail fixture (no views)', () => {
    const res = injectIntoFixture(buildDetailTweet, 'rightmost');
    expect(res.injectedIdx).toBe(5);
    expect(res.shareIdx).toBe(4);
  });
});

describe('8. Quote tweet non-injection into inner group', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setSettingSaveMode('injected');
    setSettingInjectedPosition('next-to-bookmark');
  });

  it('injects exactly one .twtbk-item-wrapper in outer tweet, zero inside inner quote', () => {
    const tweet = buildQuoteTweet();
    document.body.appendChild(tweet);

    injectSaveButtons();

    // Count all wrappers in the outer tweet
    const allWrappers = tweet.querySelectorAll('.twtbk-item-wrapper');
    expect(allWrappers.length).toBe(1);

    // Count wrappers inside the inner quote tweet (should be zero)
    const innerTweet = tweet.querySelector('[data-testid="tweet"]:not(:first-child) [role="group"]');
    const wrappersInInnerQuote = innerTweet
      ? innerTweet.querySelectorAll('.twtbk-item-wrapper').length
      : 0;
    expect(wrappersInInnerQuote).toBe(0);

    // The wrapper should be in the outer action bar
    const outerActionBar = tweet.querySelector(':scope > [role="group"]');
    expect(outerActionBar?.querySelector('.twtbk-item-wrapper')).not.toBeNull();
  });
});

describe('9. Rerender recovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setSettingSaveMode('injected');
    setSettingInjectedPosition('next-to-bookmark');
  });

  it('rebuilds wrapper after action bar children are wiped (simulated X rerender)', () => {
    const tweet = buildTimelineTweet();
    document.body.appendChild(tweet);

    // First injection
    injectSaveButtons();
    const actionBar = tweet.querySelector('[role="group"]')!;
    const firstWrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
    expect(firstWrapper).not.toBeNull();

    // Simulate X rerender: clone action bar children without the injected wrapper
    const nativeChildren = Array.from(actionBar.children).filter(
      c => !c.classList.contains('twtbk-item-wrapper'),
    );
    // Wipe and re-add only native children
    actionBar.innerHTML = '';
    nativeChildren.forEach(c => actionBar.appendChild(c.cloneNode(true)));

    // Second injection — should rebuild
    injectSaveButtons();
    const secondWrapper = actionBar.querySelector('.twtbk-item-wrapper') as HTMLElement;
    expect(secondWrapper).not.toBeNull();
    expect(secondWrapper).not.toBe(firstWrapper);
    expect(actionBar.querySelectorAll('.twtbk-item-wrapper').length).toBe(1);
    expect(secondWrapper.dataset.twtbkAdapterVersion).toBe(String(DATA_VERSION));
  });
});

describe('10. Idempotency on same DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setSettingSaveMode('injected');
    setSettingInjectedPosition('next-to-bookmark');
  });

  it('three consecutive injectSaveButtons calls produce exactly one wrapper with stable identity', () => {
    const tweet = buildTimelineTweet();
    document.body.appendChild(tweet);

    injectSaveButtons();
    const firstWrapper = tweet.querySelector('.twtbk-item-wrapper') as HTMLElement;
    expect(firstWrapper).not.toBeNull();

    // Second call — same wrapper
    injectSaveButtons();
    const secondWrapper = tweet.querySelector('.twtbk-item-wrapper') as HTMLElement;
    expect(secondWrapper).toBe(firstWrapper);

    // Third call — still same wrapper
    injectSaveButtons();
    const thirdWrapper = tweet.querySelector('.twtbk-item-wrapper') as HTMLElement;
    expect(thirdWrapper).toBe(firstWrapper);

    // Still exactly one
    expect(tweet.querySelectorAll('.twtbk-item-wrapper').length).toBe(1);
  });
});

describe('11. Saved-state fixture recognition', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('getActionState returns "saved" for buildSavedBookmarkTweet', () => {
    const tweet = buildSavedBookmarkTweet();
    document.body.appendChild(tweet);

    const actionBar = tweet.querySelector('[role="group"]')!;
    expect(getActionState(actionBar, 'bookmark')).toBe('saved');
  });

  it('findActionItem("bookmark") finds the removeBookmark element', () => {
    const tweet = buildSavedBookmarkTweet();
    document.body.appendChild(tweet);

    const actionBar = tweet.querySelector('[role="group"]')!;
    const found = findActionItem(actionBar, 'bookmark');
    expect(found).not.toBeNull();
    expect(found?.getAttribute('data-testid')).toBe('removeBookmark');
  });

  it('getActionState returns "unsaved" for buildTimelineTweet (normal bookmark)', () => {
    const tweet = buildTimelineTweet();
    document.body.appendChild(tweet);

    const actionBar = tweet.querySelector('[role="group"]')!;
    expect(getActionState(actionBar, 'bookmark')).toBe('unsaved');
  });
});
});
