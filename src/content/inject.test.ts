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

import { findActionItem, getDirectChildWrapper, injectSaveButtons } from './inject';
import { setSettingNativeOverrideAction, setSettingSaveMode, setSettingInjectedPosition } from './settings';

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
});
