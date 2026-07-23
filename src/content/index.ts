let settingSaveMode: 'injected' | 'native-override' = 'injected';
let settingInjectedPosition: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost' = 'rightmost';
let settingNativeOverrideAction: 'replace' | 'arrow' = 'replace';
let settingButtonAlignment: 'left' | 'center' | 'right' = 'center';
let currentAccentColor = '#1d9bf0';

chrome.storage.sync.get(['saveMode', 'injectedPosition', 'nativeOverrideAction', 'accentColor', 'buttonAlignment'], (result) => {
  if (result.saveMode) {
    settingSaveMode = result.saveMode as 'injected' | 'native-override';
  }
  if (result.injectedPosition) {
    settingInjectedPosition = result.injectedPosition as typeof settingInjectedPosition;
  }
  if (result.nativeOverrideAction) {
    settingNativeOverrideAction = result.nativeOverrideAction as 'replace' | 'arrow';
  }
  if (result.accentColor) {
    currentAccentColor = result.accentColor as string;
    document.documentElement.style.setProperty('--twtbk-accent', currentAccentColor);
    document.documentElement.style.setProperty('--twtbk-accent-hover', currentAccentColor + 'CC');
  }
  if (result.buttonAlignment) {
    settingButtonAlignment = result.buttonAlignment as 'left' | 'center' | 'right';
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    let changed = false;
    if (changes.saveMode) {
      settingSaveMode = changes.saveMode.newValue as 'injected' | 'native-override';
      changed = true;
    }
    if (changes.injectedPosition) {
      settingInjectedPosition = changes.injectedPosition.newValue as typeof settingInjectedPosition;
      changed = true;
    }
    if (changes.nativeOverrideAction) {
      settingNativeOverrideAction = changes.nativeOverrideAction.newValue as 'replace' | 'arrow';
      changed = true;
    }
    if (changes.buttonAlignment) {
      settingButtonAlignment = changes.buttonAlignment.newValue as 'left' | 'center' | 'right';
      changed = true;
    }
    if (changes.accentColor) {
      currentAccentColor = changes.accentColor.newValue as string;
      document.documentElement.style.setProperty('--twtbk-accent', currentAccentColor);
      document.documentElement.style.setProperty('--twtbk-accent-hover', currentAccentColor + 'CC');
    }
    if (changed) {
      // Clear old buttons and re-evaluate injection
      document.querySelectorAll('.twtbk-save-btn').forEach(el => el.remove());
      if (settingSaveMode === 'injected' || (settingSaveMode === 'native-override' && settingNativeOverrideAction === 'arrow')) {
        injectSaveButtons();
      }
    }
  }
});

function injectSaveButtons() {
  if (settingSaveMode === 'native-override' && settingNativeOverrideAction !== 'arrow') return;
  
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  tweets.forEach(tweet => {
    // Prevent double injection
    if (tweet.querySelector('.twtbk-save-btn')) return;

    // The action bar is typically a role="group" inside the tweet
    const actionBar = tweet.querySelector('[role="group"]');
    if (!actionBar) return;

    // Create our button
    const btnContainer = document.createElement('div');
    btnContainer.className = 'twtbk-save-btn';
    btnContainer.style.display = 'flex';
    btnContainer.style.alignItems = 'center';
    btnContainer.style.justifyContent = 'center';
    btnContainer.style.cursor = 'pointer';
    btnContainer.style.width = settingSaveMode === 'native-override' ? '24px' : '34.75px';
    btnContainer.style.height = '34.75px';
    btnContainer.style.borderRadius = '9999px';
    btnContainer.style.transition = 'background-color 0.2s';
    
    if (settingSaveMode === 'native-override') {
      btnContainer.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 16px; height: 16px; fill: currentColor; color: #71767b;">
          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
        </svg>
      `;
    } else {
      // Premium open-book / library icon
      btnContainer.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 18.75px; height: 18.75px; fill: none; stroke: currentColor; stroke-width: 2; color: #71767b;">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }

    btnContainer.addEventListener('mouseover', () => {
      // Use hex color with 1A alpha (roughly 10%)
      btnContainer.style.backgroundColor = currentAccentColor + '1A';
      const svg = btnContainer.querySelector('svg');
      if (svg) svg.style.color = currentAccentColor;
    });
    
    btnContainer.addEventListener('mouseout', () => {
      btnContainer.style.backgroundColor = 'transparent';
      const svg = btnContainer.querySelector('svg');
      if (svg) svg.style.color = '#71767b';
    });

    btnContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!chrome.runtime?.id) {
        alert("Extension context was updated. Please refresh the page to save bookmarks!");
        return;
      }
      saveTweet(tweet, btnContainer);
    });

    // Apply button alignment margins if not in native-override mode
    if (settingSaveMode === 'injected') {
      if (settingButtonAlignment === 'left') {
        btnContainer.style.marginRight = 'auto';
        btnContainer.style.marginLeft = '0px';
      } else if (settingButtonAlignment === 'right') {
        btnContainer.style.marginLeft = 'auto';
        btnContainer.style.marginRight = '0px';
      } else {
        btnContainer.style.marginLeft = 'auto';
        btnContainer.style.marginRight = 'auto';
      }
    }

    // Position according to user settings
    const insertAfterTestId = (testId: string) => {
      const target = actionBar.querySelector(`[data-testid="${testId}"]`);
      if (target) {
        target.parentNode?.insertBefore(btnContainer, target.nextSibling);
      } else {
        actionBar.appendChild(btnContainer);
      }
    };

    if (settingSaveMode === 'native-override') {
      const bookmarkBtn = actionBar.querySelector('[data-testid="bookmark"]') || actionBar.querySelector('[data-testid="share"]');
      if (bookmarkBtn) {
        (bookmarkBtn.parentNode as HTMLElement).style.display = 'flex';
        bookmarkBtn.parentNode?.insertBefore(btnContainer, bookmarkBtn.nextSibling);
      }
    } else if (settingInjectedPosition === 'leftmost') {
      actionBar.insertBefore(btnContainer, actionBar.firstChild);
    } else if (settingInjectedPosition === 'after-reply') {
      insertAfterTestId('reply');
    } else if (settingInjectedPosition === 'after-retweet') {
      insertAfterTestId('retweet');
    } else if (settingInjectedPosition === 'after-like') {
      insertAfterTestId('like');
    } else if (settingInjectedPosition === 'after-views') {
      const target = actionBar.querySelector('[data-testid="analytics"]') || actionBar.querySelector('[data-testid="views"]');
      if (target) {
        target.parentNode?.insertBefore(btnContainer, target.nextSibling);
      } else {
        insertAfterTestId('like');
      }
    } else if (settingInjectedPosition === 'next-to-bookmark') {
      insertAfterTestId('bookmark');
    } else {
      // rightmost — after share
      actionBar.appendChild(btnContainer);
    }
  });
}

function extractTweetData(tweetElement: Element) {
  try {
    const textEl = tweetElement.querySelector('[data-testid="tweetText"]');
    const text = textEl ? (textEl as HTMLElement).innerText : '';

    const userEls = tweetElement.querySelectorAll('[data-testid="User-Name"] a');
    let authorName = '';
    let authorHandle = '';
    if (userEls.length >= 2) {
      authorName = (userEls[0] as HTMLElement).innerText;
      authorHandle = (userEls[1] as HTMLElement).innerText.replace('@', '');
    }

    // Attempt to extract tweet ID from the time link
    const timeLink = tweetElement.querySelector('a[href*="/status/"]');
    let id = '';
    let url = '';
    if (timeLink) {
      const href = timeLink.getAttribute('href') || '';
      url = 'https://x.com' + href;
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        id = match[1];
      }
    }

    // Skip saving when ID can't be resolved rather than synthesizing fake timestamps
    if (!id) {
      return null;
    }

    // Extract author avatar — use the resolved .src property (not getAttribute) so
    // we always get the absolute URL, even if Twitter lazily sets the attribute.
    const avatarImgEl = (
      tweetElement.querySelector('[data-testid="Tweet-User-Avatar"] img') ||
      tweetElement.querySelector('[data-testid="UserAvatar-Container"] img') ||
      tweetElement.querySelector('a[href="/' + authorHandle + '"] img[src*="profile_images"]') ||
      tweetElement.querySelector('img[src*="profile_images"]')
    ) as HTMLImageElement | null;
    // .src gives the fully-resolved absolute URL; fall back to attribute
    let authorAvatarUrl = avatarImgEl?.src || avatarImgEl?.getAttribute('src') || '';
    // Upgrade to higher resolution (_normal → _bigger)
    if (authorAvatarUrl) {
      authorAvatarUrl = authorAvatarUrl.replace(/_normal\.(jpg|jpeg|png|webp)/i, '_bigger.$1');
    }

    // Extract media items (images, videos, gifs)
    const media: { type: "image" | "video" | "gif"; url: string; previewUrl?: string }[] = [];
    
    // Scrape tweet photos
    const photoEls = tweetElement.querySelectorAll('[data-testid="tweetPhoto"] img');
    photoEls.forEach(el => {
      const img = el as HTMLImageElement;
      const src = img.src || img.getAttribute('src');
      if (src && !media.some(m => m.url === src)) {
        media.push({
          type: 'image',
          url: src
        });
      }
    });

    // Scrape tweet videos/GIFs
    const videoEls = tweetElement.querySelectorAll('video');
    videoEls.forEach(el => {
      const v = el as HTMLVideoElement;
      const poster = v.getAttribute('poster') || v.poster || '';
      const src = v.src || v.querySelector('source')?.src || '';
      if (src || poster) {
        // If it's a chunked video stream (blob URL or m3u8) we store the poster as the main url for display fallback
        const finalUrl = (src && !src.startsWith('blob:')) ? src : poster;
        if (finalUrl && !media.some(m => m.url === finalUrl)) {
          media.push({
            type: 'video',
            url: finalUrl,
            previewUrl: poster || undefined
          });
        }
      }
    });

    // Extract Quoted Tweet (if present)
    let quotedTweet: {
      id?: string;
      authorHandle: string;
      authorName?: string;
      authorAvatarUrl?: string;
      text?: string;
      tweetUrl?: string;
    } | undefined = undefined;

    const quoteContainer = tweetElement.querySelector('div[role="link"] div[aria-labelledby], [data-testid="quoteTweet"], div[class*="css-175oi2r"][role="link"]');
    if (quoteContainer) {
      let qHandle = '';
      let qName = '';
      quoteContainer.querySelectorAll('span').forEach(span => {
        const txt = (span as HTMLElement).innerText || '';
        if (txt.startsWith('@') && !qHandle) {
          qHandle = txt.replace('@', '');
        }
      });
      const qNameEl = quoteContainer.querySelector('[data-testid="User-Name"]');
      if (qNameEl) {
        qName = (qNameEl as HTMLElement).innerText.split('\n')[0] || '';
      }

      const qTextEl = quoteContainer.querySelector('[data-testid="tweetText"]');
      const qText = qTextEl ? (qTextEl as HTMLElement).innerText : '';

      const qTimeLink = quoteContainer.querySelector('a[href*="/status/"]');
      let qUrl = '';
      let qId = '';
      if (qTimeLink) {
        const qHref = qTimeLink.getAttribute('href') || '';
        qUrl = qHref.startsWith('http') ? qHref : 'https://x.com' + qHref;
        const qMatch = qHref.match(/\/status\/(\d+)/);
        if (qMatch) qId = qMatch[1];
      }

      const qAvatarImg = quoteContainer.querySelector('img[src*="profile_images"]') as HTMLImageElement | null;
      let qAvatar = qAvatarImg?.src || qAvatarImg?.getAttribute('src') || '';
      if (qAvatar) qAvatar = qAvatar.replace(/_normal\.(jpg|jpeg|png|webp)/i, '_bigger.$1');

      if (qHandle || qText || qUrl) {
        quotedTweet = {
          id: qId || undefined,
          authorHandle: qHandle,
          authorName: qName || undefined,
          authorAvatarUrl: qAvatar || undefined,
          text: qText || undefined,
          tweetUrl: qUrl || undefined
        };
      }
    }

    // Extract Articles / Card Links
    const articles: { url: string; title?: string; domain?: string; snippet?: string; thumbnailUrl?: string }[] = [];
    const cardEls = tweetElement.querySelectorAll('[data-testid="card.wrapper"], [data-testid="article-card"], [data-testid="card.layoutLarge.detail"], [data-testid="card.layoutSmall.detail"]');
    
    cardEls.forEach(card => {
      const cardLink = (card.tagName === 'A' ? card : card.querySelector('a[href]')) as HTMLAnchorElement | null;
      const href = cardLink?.getAttribute('href') || cardLink?.href || '';
      
      const isXArticle = href.includes('/i/article/');
      const isParentStatus = url && id && href.includes(id);
      const isUserProfile = href.match(/^https?:\/\/(x|twitter)\.com\/[^\/]+$/);

      if (href && !isParentStatus && !isUserProfile) {
        let domain = isXArticle ? 'X Article' : '';
        if (!domain) {
          try {
            const parsed = new URL(href.startsWith('http') ? href : 'https://x.com' + href);
            domain = parsed.hostname.replace(/^www\./, '');
          } catch {}
        }

        let title = '';
        const titleCandidates = card.querySelectorAll('span, div');
        titleCandidates.forEach(el => {
          const t = (el as HTMLElement).innerText?.trim();
          if (t && !title && t.length > 3 && t !== domain && !t.startsWith('http')) {
            title = t;
          }
        });

        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const thumbnailUrl = imgEl?.src || imgEl?.getAttribute('src') || undefined;

        const finalUrl = href.startsWith('http') ? href : 'https://x.com' + href;
        if (!articles.some(a => a.url === finalUrl)) {
          articles.push({
            url: finalUrl,
            title: title || (isXArticle ? 'X Article' : undefined),
            domain: domain || undefined,
            thumbnailUrl
          });
        }
      }
    });

    // Fallback: If main text is empty (common for link-only tweets or article posts), generate text from article title or quoted tweet!
    let finalText = text;
    if (!finalText || finalText.trim() === '') {
      if (articles.length > 0 && articles[0].title) {
        finalText = articles[0].title;
      } else if (quotedTweet && quotedTweet.text) {
        finalText = quotedTweet.text;
      }
    }

    return {
      id,
      tweetUrl: url,
      authorHandle,
      authorName,
      text: finalText,
      authorAvatarUrl,
      media,
      quotedTweet,
      articles: articles.length > 0 ? articles : undefined,
      source: 'extension'
    };
  } catch (error) {
    console.error("Failed to extract tweet data", error);
    return null;
  }
}

// Inject CSS styles for extension overlay elements (with light/dark theme support)
const styleTag = document.createElement('style');
styleTag.textContent = `
  :root {
    --twtbk-bg: #ffffff;
    --twtbk-text: #0f1419;
    --twtbk-text-muted: #536471;
    --twtbk-border: #eff3f4;
    --twtbk-accent: #1d9bf0;
    --twtbk-accent-hover: #1a8cd8;
    --twtbk-shadow: rgba(101, 119, 134, 0.2) 0px 0px 15px, rgba(101, 119, 134, 0.15) 0px 0px 3px 1px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --twtbk-bg: #000000;
      --twtbk-text: #e7e9ea;
      --twtbk-text-muted: #71767b;
      --twtbk-border: #2f3336;
      --twtbk-shadow: rgba(255,255,255,0.2) 0px 0px 15px, rgba(255,255,255,0.15) 0px 0px 3px 1px;
    }
  }
  /* ── TWTBK POPOVER ── */
  .twtbk-popover * { box-sizing: border-box; }
  .twtbk-popover {
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    position: fixed !important;
    background-color: var(--twtbk-bg);
    color: var(--twtbk-text);
    border: 1px solid var(--twtbk-border);
    border-radius: 16px;
    box-shadow: var(--twtbk-shadow);
    padding: 4px 0;
    z-index: 99999;
    width: 290px;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
  }
  /* Upward-pointing arrow */
  .twtbk-popover::before {
    content: "";
    position: absolute;
    top: -7px;
    right: 12px;
    border-width: 0 7px 7px 7px;
    border-style: solid;
    border-color: transparent transparent var(--twtbk-border) transparent;
  }
  .twtbk-popover::after {
    content: "";
    position: absolute;
    top: -6px;
    right: 13px;
    border-width: 0 6px 6px 6px;
    border-style: solid;
    border-color: transparent transparent var(--twtbk-bg) transparent;
  }
  /* New category row at top */
  .twtbk-new-cat-row {
    display: flex;
    gap: 0;
    padding: 4px 12px 4px 12px;
    border-bottom: 1px solid var(--twtbk-border);
    margin-bottom: 4px;
  }
  .twtbk-new-cat-row input {
    flex: 1;
    background: transparent;
    color: var(--twtbk-text);
    border: none;
    outline: none;
    font-size: 15px;
    font-family: inherit;
    padding: 10px 0;
  }
  .twtbk-new-cat-row input::placeholder { color: var(--twtbk-text-muted); }
  .twtbk-add-btn {
    background: var(--twtbk-accent);
    color: #fff;
    border: none;
    border-radius: 9999px;
    padding: 4px 14px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    align-self: center;
    font-family: inherit;
    flex-shrink: 0;
  }
  .twtbk-add-btn:hover { background: var(--twtbk-accent-hover); }
  /* Category list items — match X's native menu row style */
  .twtbk-cat-list {
    max-height: 220px;
    overflow-y: auto;
    padding: 4px 0;
  }
  .twtbk-cat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 400;
    color: var(--twtbk-text);
    transition: background 0.15s;
    user-select: none;
  }
  .twtbk-cat-item:hover { background: rgba(128,128,128,0.1); }
  .twtbk-cat-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  /* Note area */
  .twtbk-note-row {
    border-top: 1px solid var(--twtbk-border);
    padding: 8px 16px;
    margin-top: 4px;
  }
  .twtbk-note-row textarea {
    width: 100%;
    background: transparent;
    color: var(--twtbk-text);
    border: none;
    outline: none;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    height: 44px;
  }
  .twtbk-note-row textarea::placeholder { color: var(--twtbk-text-muted); }
  
  /* ── TWTBK PANEL (Importer) ── */
  .twtbk-panel {
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--twtbk-bg);
    color: var(--twtbk-text);
    border: 1px solid var(--twtbk-border);
    border-radius: 16px;
    box-shadow: var(--twtbk-shadow);
    padding: 16px;
    z-index: 99999;
    box-sizing: border-box;
  }
  .twtbk-btn {
    border: none;
    border-radius: 9999px;
    padding: 8px 16px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.2s, opacity 0.2s;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .twtbk-btn-primary {
    background-color: var(--twtbk-accent);
    color: #ffffff;
  }
  .twtbk-btn-primary:hover {
    background-color: var(--twtbk-accent-hover);
  }
  @keyframes twtbk-pop-in {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;
document.head.appendChild(styleTag);

function showCategoryPopover(data: any, anchorEl: HTMLElement) {
  // Remove any existing popovers
  const existing = document.getElementById('twtbk-picker');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'twtbk-picker';
  container.className = 'twtbk-popover';

  // Helper: position popover relative to anchor using viewport coords
  const reposition = () => {
    const rect = anchorEl.getBoundingClientRect();
    const popoverWidth = 290;
    // Try to anchor right-edge of popover to right-edge of button
    let left = rect.right - popoverWidth;
    // Clamp to viewport
    if (left < 8) left = 8;
    if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8;
    container.style.top = (rect.bottom + 8) + 'px';
    container.style.left = left + 'px';
  };

  // Request categories from background script
  chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' }, (categories: any[]) => {
    const safeCats = categories || [];
    const categoryColors = ['#1d9bf0', '#9333ea', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
    const getCategoryColor = (id: string) => categoryColors[id.charCodeAt(id.length - 1) % categoryColors.length];

    container.innerHTML = `
      <div class="twtbk-new-cat-row">
        <input type="text" id="twtbk-new-cat" placeholder="New category..." autocomplete="off" />
        <button id="twtbk-add-cat" class="twtbk-add-btn">Add</button>
      </div>

      <div class="twtbk-cat-list" id="twtbk-cat-list">
        <div class="twtbk-cat-item" data-cat-id="">
          <span class="twtbk-cat-dot" style="background:#71767b;"></span>
          <span>No Category</span>
        </div>
        ${safeCats.map(cat => `
          <div class="twtbk-cat-item" data-cat-id="${cat.id}">
            <span class="twtbk-cat-dot" style="background:${getCategoryColor(cat.id)};"></span>
            <span>${cat.name}</span>
          </div>
        `).join('')}
      </div>

      <div class="twtbk-note-row">
        <textarea id="twtbk-note" placeholder="Add a note..."></textarea>
      </div>
    `;

    document.body.appendChild(container);
    reposition(); // initial position

    // Re-position on scroll so the popover tracks the button
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });

    const newCatInput = document.getElementById('twtbk-new-cat') as HTMLInputElement;
    const catList = document.getElementById('twtbk-cat-list') as HTMLDivElement;

    // Handle dynamically creating a category
    document.getElementById('twtbk-add-cat')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = newCatInput.value.trim();
      if (!name) return;
      chrome.runtime.sendMessage({ type: 'CREATE_CATEGORY', payload: { name } }, (res) => {
        if (res && res.success) {
          const item = document.createElement('div');
          item.className = 'twtbk-cat-item';
          item.setAttribute('data-cat-id', res.category.id);
          const color = getCategoryColor(res.category.id);
          item.innerHTML = `
            <span class="twtbk-cat-dot" style="background:${color};"></span>
            <span>${res.category.name}</span>
          `;
          item.addEventListener('click', (evt) => {
            evt.stopPropagation();
            saveWithCategory(res.category.id);
          });
          catList.appendChild(item);
          newCatInput.value = '';
        } else {
          alert('Failed to create category: ' + (res?.error || 'Unknown error'));
        }
      });
    });

    const saveWithCategory = (catId: string) => {
      const note = (document.getElementById('twtbk-note') as HTMLTextAreaElement).value;
      data.note = note;
      data.categoryIds = catId ? [catId] : [];
      chrome.runtime.sendMessage({ type: 'SAVE_TWEET', payload: data }, (response) => {
        if (!response?.success) {
          alert('Failed to save: ' + response?.error);
        } else {
          showToast("Saved to XMarks!");
        }
        cleanup();
      });
    };

    // Attach click handlers to all list items
    const items = container.querySelectorAll('.twtbk-cat-item');
    items.forEach(item => {
      item.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const catId = item.getAttribute('data-cat-id') || '';
        saveWithCategory(catId);
      });
    });

    const cleanup = () => {
      container.remove();
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('click', onClickOutside);
    };

    const onClickOutside = (e: MouseEvent) => {
      if (!container.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        cleanup();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', onClickOutside);
    }, 10);
  });
}

function saveTweet(tweetElement: Element, anchorEl: HTMLElement) {
  const data = extractTweetData(tweetElement);
  if (!data) return;
  showCategoryPopover(data, anchorEl);
}

let injectAnimationFrame: number | null = null;
const debouncedInjectSaveButtons = () => {
  if (injectAnimationFrame !== null) return;
  injectAnimationFrame = requestAnimationFrame(() => {
    injectAnimationFrame = null;
    injectSaveButtons();
  });
};

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
    if (mutation.addedNodes.length > 0) {
      shouldInject = true;
      break;
    }
  }
  if (shouldInject) {
    debouncedInjectSaveButtons();
    checkNavigation();
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

// Initial injection
debouncedInjectSaveButtons();
checkBookmarkPage();

let isImporting = false;
let totalImported = 0;
let lastScrollHeight = 0;
let sameHeightCount = 0;

// Check for bookmark import page
function checkBookmarkPage() {
  const isBookmarkPage = window.location.pathname.includes('/i/bookmarks');
  if (isBookmarkPage) {
    injectImporterSidebarUI();
  } else {
    const container = document.getElementById('twtbk-sidebar-importer-container');
    if (container) container.remove();
    const panel = document.getElementById('twtbk-importer-panel');
    if (panel) panel.remove();
  }
}

function getXTheme() {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  if (bodyBg === 'rgb(0, 0, 0)') {
    return {
      bg: '#000000',
      text: '#e7e9ea',
      border: '#2f3336',
      textMuted: '#71767b',
      bgHover: 'rgba(231, 233, 234, 0.1)'
    };
  } else if (bodyBg === 'rgb(21, 32, 43)') {
    return {
      bg: '#15202b',
      text: '#ffffff',
      border: '#38444d',
      textMuted: '#8899a6',
      bgHover: 'rgba(255, 255, 255, 0.1)'
    };
  } else {
    return {
      bg: '#ffffff',
      text: '#0f1419',
      border: '#eff3f4',
      textMuted: '#536471',
      bgHover: 'rgba(15, 20, 25, 0.1)'
    };
  }
}

function injectImporterSidebarUI() {
  if (document.getElementById('twtbk-sidebar-importer-container')) return;

  const postBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') || document.querySelector('a[href="/compose/post"]');
  if (!postBtn) {
    console.warn("XMarks: Sync Bookmarks sidebar button could not be injected — Post button selector did not match on this page.");
    return;
  }

  const theme = getXTheme();

  const postBtnContainer = postBtn.closest('div') || postBtn.parentElement;

  const btnContainer = document.createElement('div');
  btnContainer.id = 'twtbk-sidebar-importer-container';
  
  if (postBtnContainer) {
    // Copy X's layout classes and styles to align perfectly with the Post button
    btnContainer.className = postBtnContainer.className;
    btnContainer.setAttribute('style', postBtnContainer.getAttribute('style') || '');
  }
  
  // Custom adjustments for sidebar flow
  btnContainer.style.marginTop = '12px';
  btnContainer.style.marginBottom = '0px';
  btnContainer.style.display = 'flex';
  btnContainer.style.justifyContent = 'center';

  const btn = document.createElement('button');
  btn.id = 'twtbk-sidebar-importer-btn';
  btn.innerHTML = `
    <div class="twtbk-sidebar-icon" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: ${theme.text};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>
      </svg>
    </div>
    <span class="twtbk-sidebar-label" style="margin-left: 16px; font-weight: 700; font-size: 17px; color: ${theme.text}; white-space: nowrap;">Sync Bookmarks</span>
  `;

  btn.style.cssText = `
    display: flex;
    align-items: center;
    background: transparent;
    border: 1px solid ${theme.border};
    border-radius: 9999px;
    height: 52px;
    width: 100%;
    padding: 0 16px;
    cursor: pointer;
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    transition: background-color 0.2s;
    box-sizing: border-box;
  `;

  btn.onmouseenter = () => {
    btn.style.backgroundColor = theme.bgHover;
  };
  btn.onmouseleave = () => {
    btn.style.backgroundColor = 'transparent';
  };

  if (!document.getElementById('twtbk-responsive-styles')) {
    const style = document.createElement('style');
    style.id = 'twtbk-responsive-styles';
    style.innerHTML = `
      @media (max-width: 1280px) {
        #twtbk-sidebar-importer-container {
          width: 52px !important;
          margin-top: 12px !important;
        }
        #twtbk-sidebar-importer-btn {
          width: 52px !important;
          padding: 0 !important;
          justify-content: center !important;
          border-radius: 50% !important;
        }
        .twtbk-sidebar-label {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  btn.onclick = (e) => {
    e.stopPropagation();
    toggleImporterPanel(btn);
  };

  btnContainer.appendChild(btn);

  // Prefer appending into the primary left nav so the button is a proper flex
  // child of the sidebar column. X's header/nav containers can otherwise hide
  // `after()` siblings or push them off-screen. Fall back to inserting next to
  // the Post button's wrapper, then directly after the button itself.
  const primaryNav =
    (postBtn.closest('nav') as HTMLElement | null) ||
    (postBtn.closest('header[role="banner"]') as HTMLElement | null) ||
    (postBtnContainer?.parentElement as HTMLElement | null);

  if (primaryNav && primaryNav !== postBtnContainer && primaryNav.contains(postBtn)) {
    primaryNav.appendChild(btnContainer);
  } else if (postBtnContainer && postBtnContainer.parentNode) {
    postBtnContainer.after(btnContainer);
  } else if (postBtn.parentNode) {
    postBtn.after(btnContainer);
  } else {
    console.warn("XMarks: No suitable container found for the Sync Bookmarks sidebar button.");
    return;
  }
}

function updatePanelUI() {
  const panel = document.getElementById('twtbk-importer-panel');
  if (!panel) return;

  const startBtn = document.getElementById('twtbk-start-import-btn');
  const desc = panel.querySelector('p');
  const title = panel.querySelector('h3');

  if (isImporting) {
    if (title) title.textContent = "Syncing Bookmarks...";
    if (desc) desc.textContent = `Sync in progress. Total saved: ${totalImported}`;
    if (startBtn) {
      startBtn.textContent = "Stop Sync";
      startBtn.style.backgroundColor = "#f4212e"; // Red
    }
  } else {
    if (title) title.textContent = "Auto-Import Bookmarks";
    if (desc) desc.textContent = "This will scroll through your bookmarks and save them locally.";
    if (startBtn) {
      startBtn.textContent = "Start Sync";
      startBtn.style.backgroundColor = "var(--twtbk-accent, #1d9bf0)";
    }
  }
}

function toggleImporterPanel(btn: HTMLElement) {
  let panel = document.getElementById('twtbk-importer-panel');
  if (panel) {
    panel.remove();
    return;
  }

  const theme = getXTheme();
  panel = document.createElement('div');
  panel.id = 'twtbk-importer-panel';
  const rect = btn.getBoundingClientRect();
  
  // Create panel hidden first to calculate exact height for space-aware positioning
  panel.style.cssText = `
    position: fixed;
    width: 280px;
    background: ${theme.bg};
    color: ${theme.text};
    border: 1px solid ${theme.border};
    border-radius: 16px;
    padding: 16px;
    z-index: 10000;
    box-shadow: rgba(0, 0, 0, 0.15) 0px 4px 12px;
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  `;

  panel.innerHTML = `
    <h3 style="margin-top:0; margin-bottom: 8px; font-size: 16px; font-weight: 700; color: ${theme.text};">Auto-Import Bookmarks</h3>
    <p style="font-size: 13px; color: ${theme.textMuted}; margin-bottom: 16px; line-height: 1.4;">This will scroll through your bookmarks and save them locally.</p>
    <button id="twtbk-start-import-btn" style="width:100%; color: white; border: none; border-radius: 9999px; padding: 10px 16px; font-weight: 700; cursor: pointer; display: flex; justify-content: center; font-family: inherit; transition: background-color 0.2s;"></button>
  `;

  document.body.appendChild(panel);
  updatePanelUI();

  // Measure dynamic panel height
  const panelHeight = panel.offsetHeight;

  // Space awareness check (above vs below)
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top = 0;
  if (spaceBelow >= panelHeight + 12) {
    // Open directly below the button
    top = rect.bottom + 8;
  } else if (spaceAbove >= panelHeight + 12) {
    // Open upwards (directly above the button)
    top = rect.top - panelHeight - 8;
  } else {
    // Open where there's more space
    top = spaceBelow > spaceAbove ? rect.bottom + 8 : Math.max(10, rect.top - panelHeight - 8);
  }

  panel.style.top = `${top}px`;
  panel.style.left = `${rect.left}px`;
  panel.style.opacity = '1';
  panel.style.pointerEvents = 'auto';

  const startBtn = document.getElementById('twtbk-start-import-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      if (isImporting) {
        isImporting = false;
        showToast("Import stopped.");
        updatePanelUI();
      } else {
        isImporting = true;
        totalImported = 0;
        lastScrollHeight = 0;
        sameHeightCount = 0;
        showToast("Starting Bookmarks Auto-Import...");
        updatePanelUI();
        setTimeout(() => runImportLoop(), 1500);
      }
    };
  }

  const onClickOutside = (e: MouseEvent) => {
    if (panel && !panel.contains(e.target as Node) && !btn.contains(e.target as Node)) {
      panel.remove();
      document.removeEventListener('click', onClickOutside);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', onClickOutside);
  }, 10);
}

const processedImportIds = new Set<string>();

const runImportLoop = async () => {
  if (!isImporting) {
    updatePanelUI();
    return;
  }
  
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  const batch: any[] = [];

  tweets.forEach(tweet => {
    const data = extractTweetData(tweet);
    if (data && data.id && !processedImportIds.has(data.id)) {
      processedImportIds.add(data.id);
      batch.push(data);
    }
  });

  if (batch.length === 0) {
    const currentScrollHeight = document.documentElement.scrollHeight;
    const isAtBottom = (window.innerHeight + window.scrollY) >= (currentScrollHeight - 150);

    if (isAtBottom) {
      if (currentScrollHeight === lastScrollHeight) {
        sameHeightCount++;
      } else {
        sameHeightCount = 0;
      }
    } else {
      sameHeightCount = 0;
    }

    lastScrollHeight = currentScrollHeight;

    if (sameHeightCount >= 5) {
      isImporting = false;
      showToast('Import finished! Added ' + totalImported + ' new bookmarks.');
      updatePanelUI();
      return;
    }

    if (isImporting) {
      window.scrollBy(0, window.innerHeight * 1.5);
      setTimeout(runImportLoop, 1000);
    }
    return;
  }

  chrome.runtime.sendMessage({ type: 'IMPORT_BATCH', payload: batch }, (res: any) => {
    if (res && res.success === false) {
      isImporting = false;
      showToast("Import Error: " + res.error);
      updatePanelUI();
      return;
    }

    if (res?.count > 0) {
      totalImported += res.count;
      updatePanelUI();
    }

    const currentScrollHeight = document.documentElement.scrollHeight;
    const isAtBottom = (window.innerHeight + window.scrollY) >= (currentScrollHeight - 150);

    if (isAtBottom) {
      if (currentScrollHeight === lastScrollHeight) {
        sameHeightCount++;
      } else {
        sameHeightCount = 0;
      }
    } else {
      sameHeightCount = 0;
    }

    lastScrollHeight = currentScrollHeight;

    if (sameHeightCount >= 5) {
      isImporting = false;
      showToast('Import finished! Added ' + totalImported + ' new bookmarks.');
      updatePanelUI();
      return;
    }

    if (isImporting) {
      window.scrollBy(0, window.innerHeight * 1.5);
      setTimeout(runImportLoop, 1500);
    }
  });
};



// Phase 4: Native Bookmark Listener
document.addEventListener('click', (e) => {
  try {
    const target = e.target as HTMLElement;
    const bookmarkBtn = target.closest('[data-testid="bookmark"]');
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
        // Multi-purpose: Let X save it natively, and also show our categorization popover next to it!
        showCategoryPopover(data, bookmarkBtn as HTMLElement);
      } else {
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

function showToast(message: string) {
  const existing = document.getElementById('twtbk-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'twtbk-toast';
  
  // Style it to look EXACTLY like X's native bottom toast notification
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background-color: var(--twtbk-accent);
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 9999px;
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    font-weight: 700;
    z-index: 100000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: opacity 0.25s, transform 0.25s;
    opacity: 0;
    pointer-events: auto;
  `;

  toast.innerHTML = `
    <span>${message}</span>
    <button style="background: none; border: none; color: #ffffff; text-decoration: underline; font-weight: 800; cursor: pointer; padding: 0; font-family: inherit; font-size: inherit;">View</button>
  `;

  toast.querySelector('button')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    toast.remove();
  });

  document.body.appendChild(toast);

  // Trigger animation frame
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}
