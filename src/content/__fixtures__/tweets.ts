/**
 * Sanitised DOM fixtures for X (Twitter) tweet views.
 *
 * JSDOM cannot model React synthetic event delegation or X's production event
 * delegation; a browser smoke test against live X.com is still required before
 * shipping selector-dependent changes. These fixtures validate adapter
 * recognition, placement, rerender recovery, and idempotency — the layer
 * JSDOM CAN model.
 *
 * Each builder returns a real DOM Element (div[data-testid="tweet"]) that
 * mirrors the native structure the adapter is designed to recognise.
 */

// ---- Internal helpers ----

function createActionBar(withViews: boolean): {
  actionBar: HTMLElement;
  replyWrapper: HTMLElement;
  retweetWrapper: HTMLElement;
  likeWrapper: HTMLElement;
  viewsWrapper?: HTMLElement;
  bookmarkWrapper: HTMLElement;
  shareWrapper: HTMLElement;
} {
  const actionBar = document.createElement('div');
  actionBar.setAttribute('role', 'group');
  actionBar.className = 'css-175oi2r r-18u37iz r-1h0z52e r-13qz1uu';

  // 1. Reply
  const replyWrapper = document.createElement('div');
  replyWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e';
  const replyBtn = document.createElement('button');
  replyBtn.setAttribute('data-testid', 'reply');
  const replySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  replyBtn.appendChild(replySvg);
  replyWrapper.appendChild(replyBtn);
  actionBar.appendChild(replyWrapper);

  // 2. Retweet
  const retweetWrapper = document.createElement('div');
  retweetWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e';
  const retweetBtn = document.createElement('button');
  retweetBtn.setAttribute('data-testid', 'retweet');
  const retweetSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  retweetBtn.appendChild(retweetSvg);
  retweetWrapper.appendChild(retweetBtn);
  actionBar.appendChild(retweetWrapper);

  // 3. Like
  const likeWrapper = document.createElement('div');
  likeWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e';
  const likeBtn = document.createElement('button');
  likeBtn.setAttribute('data-testid', 'like');
  const likeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  likeBtn.appendChild(likeSvg);
  likeWrapper.appendChild(likeBtn);
  actionBar.appendChild(likeWrapper);

  // 4. Views (optional)
  let viewsWrapper: HTMLElement | undefined;
  if (withViews) {
    viewsWrapper = document.createElement('div');
    viewsWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e';
    const viewsBtn = document.createElement('a');
    viewsBtn.setAttribute('data-testid', 'analytics');
    const viewsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    viewsBtn.appendChild(viewsSvg);
    viewsWrapper.appendChild(viewsBtn);
    actionBar.appendChild(viewsWrapper);
  }

  // 5. Bookmark (unsaved)
  const bookmarkWrapper = document.createElement('div');
  bookmarkWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e';
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.setAttribute('data-testid', 'bookmark');
  const bookmarkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  bookmarkBtn.appendChild(bookmarkSvg);
  bookmarkWrapper.appendChild(bookmarkBtn);
  actionBar.appendChild(bookmarkWrapper);

  // 6. Share
  const shareWrapper = document.createElement('div');
  shareWrapper.className = 'css-175oi2r r-18u37iz r-1h0z52e';
  const shareBtn = document.createElement('button');
  shareBtn.setAttribute('aria-label', 'Share post');
  const shareSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  shareBtn.appendChild(shareSvg);
  shareWrapper.appendChild(shareBtn);
  actionBar.appendChild(shareWrapper);

  return { actionBar, replyWrapper, retweetWrapper, likeWrapper, viewsWrapper, bookmarkWrapper, shareWrapper };
}

function addStatusLink(tweetEl: HTMLElement, id: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.setAttribute('href', `/tester/status/${id}`);
  tweetEl.insertBefore(link, tweetEl.firstChild);
  return link;
}

// ---- Fixture builders ----

/**
 * Build a timeline tweet with full action bar including views.
 * Score = 6 (reply, retweet, like, bookmark, share, views).
 */
export function buildTimelineTweet(): HTMLElement {
  const tweetEl = document.createElement('div');
  tweetEl.setAttribute('data-testid', 'tweet');

  const { actionBar } = createActionBar(true);
  tweetEl.appendChild(actionBar);

  addStatusLink(tweetEl, '12345');
  return tweetEl;
}

/**
 * Build a detail (main tweet) view — same as timeline but without views.
 * Score = 5 (reply, retweet, like, bookmark, share).
 */
export function buildDetailTweet(): HTMLElement {
  const tweetEl = document.createElement('div');
  tweetEl.setAttribute('data-testid', 'tweet');

  const { actionBar } = createActionBar(false);
  tweetEl.appendChild(actionBar);

  addStatusLink(tweetEl, '67890');
  return tweetEl;
}

/**
 * Build a reply tweet — same as timeline with views.
 * Score = 6 (reply, retweet, like, bookmark, share, views).
 */
export function buildReplyTweet(): HTMLElement {
  const tweetEl = document.createElement('div');
  tweetEl.setAttribute('data-testid', 'tweet');

  const { actionBar } = createActionBar(true);
  tweetEl.appendChild(actionBar);

  addStatusLink(tweetEl, '11111');
  return tweetEl;
}

/**
 * Build a search tweet — same action bar as timeline but with aria-label
 * variants for share.
 * Score = 6.
 */
export function buildSearchTweet(): HTMLElement {
  const tweetEl = document.createElement('div');
  tweetEl.setAttribute('data-testid', 'tweet');

  const { actionBar } = createActionBar(true);

  // Override share to use "Share Tweet" aria-label variant
  const shareBtn = actionBar.querySelector('[aria-label="Share post"]');
  if (shareBtn) {
    shareBtn.setAttribute('aria-label', 'Share Tweet');
  }

  tweetEl.appendChild(actionBar);
  addStatusLink(tweetEl, '22222');
  return tweetEl;
}

/**
 * Build a quote tweet — outer tweet with a nested inner tweet (quote).
 * The outer tweet has a full action bar (score = 6).
 * The inner quote has its own role="group" with only 1 recognised action
 * (reply) so scoreActionGroup correctly excludes it.
 * Also includes a second unrelated role="group" inside the quote.
 * Score for outer = 6, inner = 1.
 */
export function buildQuoteTweet(): HTMLElement {
  const outerTweet = document.createElement('div');
  outerTweet.setAttribute('data-testid', 'tweet');

  // Outer action bar (full — will be injected into)
  const { actionBar } = createActionBar(true);
  outerTweet.appendChild(actionBar);

  // --- Inner quote tweet ---
  const innerTweet = document.createElement('div');
  innerTweet.setAttribute('data-testid', 'tweet');
  innerTweet.className = 'css-175oi2r r-1adg3px r-1ny4l3l';

  // Inner action bar with only 1 recognised action (reply) — score < 3
  const innerActionBar = document.createElement('div');
  innerActionBar.setAttribute('role', 'group');
  innerActionBar.className = 'css-175oi2r r-18u37iz r-1h0z52e';

  // Only reply (1 recognised action)
  const replyWrapper = document.createElement('div');
  const replyBtn = document.createElement('button');
  replyBtn.setAttribute('data-testid', 'reply');
  const replySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  replyBtn.appendChild(replySvg);
  replyWrapper.appendChild(replyBtn);
  innerActionBar.appendChild(replyWrapper);

  // Add other buttons that are NOT recognised (no matching data-testid or aria-label)
  const unknownBtn = document.createElement('button');
  unknownBtn.setAttribute('data-testid', 'some-unknown-action');
  const unknownSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  unknownBtn.appendChild(unknownSvg);
  innerActionBar.appendChild(unknownBtn);

  innerTweet.appendChild(innerActionBar);

  // Second role="group" inside the quote — totally unrelated (no recognised actions)
  const unrelatedGroup = document.createElement('div');
  unrelatedGroup.setAttribute('role', 'group');
  unrelatedGroup.className = 'css-175oi2r';
  const someDiv = document.createElement('div');
  someDiv.textContent = 'metadata';
  unrelatedGroup.appendChild(someDiv);
  innerTweet.appendChild(unrelatedGroup);

  outerTweet.appendChild(innerTweet);
  addStatusLink(outerTweet, '33333');
  return outerTweet;
}

/**
 * Build a tweet whose bookmark is in saved state
 * (data-testid="removeBookmark", aria-label="Bookmarked").
 * Score = 6 (still a full action bar, just the bookmark testid differs).
 */
export function buildSavedBookmarkTweet(): HTMLElement {
  const tweetEl = document.createElement('div');
  tweetEl.setAttribute('data-testid', 'tweet');

  const { actionBar } = createActionBar(true);

  // Switch bookmark to saved state
  const bookmarkBtn = actionBar.querySelector('[data-testid="bookmark"]');
  if (bookmarkBtn) {
    bookmarkBtn.setAttribute('data-testid', 'removeBookmark');
    bookmarkBtn.setAttribute('aria-label', 'Bookmarked');
  }

  tweetEl.appendChild(actionBar);
  addStatusLink(tweetEl, '44444');
  return tweetEl;
}
