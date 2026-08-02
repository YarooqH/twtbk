// @vitest-environment jsdom
/**
 * Fixture-driven unit tests for xDomAdapter.
 *
 * JSDOM cannot model React synthetic event delegation or X's production event
 * delegation; a browser smoke test against live X.com is still required before
 * shipping selector-dependent changes. These fixtures validate adapter
 * recognition, placement, rerender recovery, and idempotency — the layer
 * JSDOM CAN model.
 */
import { describe, it, expect } from 'vitest';
import {
  findTweet,
  findActionBar,
  findAction,
  getActionState,
  getTweetId,
  scoreActionGroup,
  MIN_ACTION_BAR_SCORE,
} from './xDomAdapter';
import {
  buildTimelineTweet,
  buildDetailTweet,
  buildReplyTweet,
  buildSearchTweet,
  buildQuoteTweet,
  buildSavedBookmarkTweet,
} from './__fixtures__/tweets';

describe('findTweet', () => {
  it('returns found:true with high confidence for a timeline tweet', () => {
    const tweet = buildTimelineTweet();
    document.body.appendChild(tweet);
    const result = findTweet();
    expect(result.found).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.element).toBe(tweet);
  });

  it('returns found:false for empty DOM', () => {
    document.body.innerHTML = '';
    const result = findTweet();
    expect(result.found).toBe(false);
    expect(result.confidence).toBe('low');
  });
});

describe('findActionBar', () => {
  it('finds role="group" inside each fixture', () => {
    const fixtures = [buildTimelineTweet(), buildDetailTweet(), buildReplyTweet(), buildSearchTweet(), buildQuoteTweet(), buildSavedBookmarkTweet()];
    for (const tweet of fixtures) {
      document.body.innerHTML = '';
      document.body.appendChild(tweet);
      const result = findActionBar(tweet);
      expect(result.found).toBe(true);
      expect(result.confidence).toBe('high');
    }
  });
});

describe('findAction', () => {
  function getActionBar(tweet: HTMLElement): Element {
    const bar = tweet.querySelector('[role="group"]');
    if (!bar) throw new Error('No action bar found');
    return bar;
  }

  it.each([
    ['timeline', buildTimelineTweet],
    ['detail', buildDetailTweet],
    ['reply', buildReplyTweet],
    ['search', buildSearchTweet],
    ['saved-bookmark', buildSavedBookmarkTweet],
  ] as const)('recognises bookmark on %s fixture', (_, buildFn) => {
    const tweet = buildFn();
    const bar = getActionBar(tweet);
    const result = findAction(bar, 'bookmark');
    expect(result.found).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it.each([
    ['timeline', buildTimelineTweet],
    ['detail', buildDetailTweet],
    ['reply', buildReplyTweet],
    ['search', buildSearchTweet],
    ['saved-bookmark', buildSavedBookmarkTweet],
  ] as const)('recognises like on %s fixture', (_, buildFn) => {
    const tweet = buildFn();
    const bar = getActionBar(tweet);
    const result = findAction(bar, 'like');
    expect(result.found).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it.each([
    ['timeline', buildTimelineTweet],
    ['detail', buildDetailTweet],
    ['reply', buildReplyTweet],
    ['search', buildSearchTweet],
  ] as const)('recognises retweet on %s fixture', (_, buildFn) => {
    const tweet = buildFn();
    const bar = getActionBar(tweet);
    const result = findAction(bar, 'retweet');
    expect(result.found).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it.each([
    ['timeline', buildTimelineTweet],
    ['reply', buildReplyTweet],
    ['search', buildSearchTweet],
    ['saved-bookmark', buildSavedBookmarkTweet],
  ] as const)('recognises views on %s fixture', (_, buildFn) => {
    const tweet = buildFn();
    const bar = getActionBar(tweet);
    const result = findAction(bar, 'views');
    expect(result.found).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it('does not find views on detail fixture (main tweet omits views)', () => {
    const tweet = buildDetailTweet();
    const bar = getActionBar(tweet);
    const result = findAction(bar, 'views');
    expect(result.found).toBe(false);
  });

  it.each([
    ['timeline', buildTimelineTweet],
    ['detail', buildDetailTweet],
    ['reply', buildReplyTweet],
    ['search', buildSearchTweet],
    ['saved-bookmark', buildSavedBookmarkTweet],
  ] as const)('recognises share on %s fixture (aria-label)', (_, buildFn) => {
    const tweet = buildFn();
    const bar = getActionBar(tweet);
    const result = findAction(bar, 'share');
    expect(result.found).toBe(true);
    // share is found via aria-label, so confidence is medium
    expect(result.confidence).toBe('medium');
  });

  it('returns found:false for a non-existent action', () => {
    // A random element with no recognized actions returns found:false.
    const emptyDiv = document.createElement('div');
    const result = findAction(emptyDiv, 'bookmark');
    expect(result.found).toBe(false);
  });
});

describe('getActionState', () => {
  function getActionBar(tweet: HTMLElement): Element {
    const bar = tweet.querySelector('[role="group"]');
    if (!bar) throw new Error('No action bar found');
    return bar;
  }

  it('returns "unsaved" for data-testid="bookmark"', () => {
    const tweet = buildTimelineTweet();
    const bar = getActionBar(tweet);
    expect(getActionState(bar, 'bookmark')).toBe('unsaved');
  });

  it('returns "saved" for data-testid="removeBookmark"', () => {
    const tweet = buildSavedBookmarkTweet();
    const bar = getActionBar(tweet);
    expect(getActionState(bar, 'bookmark')).toBe('saved');
  });

  it('returns "saved" when data-testid is absent but aria-label says "Bookmarked"', () => {
    const tweet = buildSavedBookmarkTweet();
    const bar = getActionBar(tweet);
    // remove data-testid to force aria-label fallback
    const removeBookmark = bar.querySelector('[data-testid="removeBookmark"]');
    if (removeBookmark) removeBookmark.removeAttribute('data-testid');
    expect(getActionState(bar, 'bookmark')).toBe('saved');
  });

  it('returns null when no matching action element exists', () => {
    const div = document.createElement('div');
    expect(getActionState(div, 'bookmark')).toBeNull();
  });
});

describe('getTweetId', () => {
  it('extracts tweet id from each fixture with a status link', () => {
    const cases: [string, HTMLElement, string][] = [
      ['timeline', buildTimelineTweet(), '12345'],
      ['detail', buildDetailTweet(), '67890'],
      ['reply', buildReplyTweet(), '11111'],
      ['search', buildSearchTweet(), '22222'],
      ['quote', buildQuoteTweet(), '33333'],
      ['saved-bookmark', buildSavedBookmarkTweet(), '44444'],
    ];
    for (const [, tweet, expectedId] of cases) {
      const result = getTweetId(tweet);
      expect(result.found).toBe(true);
      expect(result.element).toBe(expectedId);
      expect(result.confidence).toBe('high');
    }
  });

  it('returns found:false on a tweet with no status link', () => {
    const tweet = document.createElement('div');
    tweet.setAttribute('data-testid', 'tweet');
    const result = getTweetId(tweet);
    expect(result.found).toBe(false);
  });
});

describe('scoreActionGroup', () => {
  function getActionBar(tweet: HTMLElement): Element {
    const bar = tweet.querySelector('[role="group"]');
    if (!bar) throw new Error('No action bar found');
    return bar;
  }

  it('scores >= MIN_ACTION_BAR_SCORE for timeline fixture (has all 6 actions)', () => {
    const tweet = buildTimelineTweet();
    const bar = getActionBar(tweet);
    expect(scoreActionGroup(bar)).toBeGreaterThanOrEqual(MIN_ACTION_BAR_SCORE);
  });

  it('scores >= MIN_ACTION_BAR_SCORE for detail fixture (5 actions, no views)', () => {
    const tweet = buildDetailTweet();
    const bar = getActionBar(tweet);
    expect(scoreActionGroup(bar)).toBeGreaterThanOrEqual(MIN_ACTION_BAR_SCORE);
  });

  it('scores >= MIN_ACTION_BAR_SCORE for reply fixture', () => {
    const tweet = buildReplyTweet();
    const bar = getActionBar(tweet);
    expect(scoreActionGroup(bar)).toBeGreaterThanOrEqual(MIN_ACTION_BAR_SCORE);
  });

  it('scores >= MIN_ACTION_BAR_SCORE for search fixture', () => {
    const tweet = buildSearchTweet();
    const bar = getActionBar(tweet);
    expect(scoreActionGroup(bar)).toBeGreaterThanOrEqual(MIN_ACTION_BAR_SCORE);
  });

  it('scores >= MIN_ACTION_BAR_SCORE for saved-bookmark fixture', () => {
    const tweet = buildSavedBookmarkTweet();
    const bar = getActionBar(tweet);
    expect(scoreActionGroup(bar)).toBeGreaterThanOrEqual(MIN_ACTION_BAR_SCORE);
  });

  it('scores < MIN_ACTION_BAR_SCORE for the inner quote tweet role="group" (only 1 recognised action)', () => {
    const tweet = buildQuoteTweet();
    // Find the inner quote's action bar (the one with only reply + unrecognised buttons)
    const allGroups = tweet.querySelectorAll('[role="group"]');
    // first group is outer, the second is the inner quote's action bar (index 1)
    expect(allGroups.length).toBeGreaterThanOrEqual(2);
    const innerGroup = allGroups[1];
    const score = scoreActionGroup(innerGroup);
    expect(score).toBeLessThan(MIN_ACTION_BAR_SCORE);
    // Should be exactly 1 (only reply is recognised)
    expect(score).toBe(1);
  });

  it('scores 0 for the unrelated role="group" inside the quote', () => {
    const tweet = buildQuoteTweet();
    const allGroups = tweet.querySelectorAll('[role="group"]');
    // third group (index 2) is the unrelated metadata group
    expect(allGroups.length).toBeGreaterThanOrEqual(3);
    const unrelatedGroup = allGroups[2];
    expect(scoreActionGroup(unrelatedGroup)).toBe(0);
  });
});
