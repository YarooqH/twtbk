export function extractCleanTweetText(tweetElement: Element): string {
  const allTextEls = Array.from(tweetElement.querySelectorAll('[data-testid="tweetText"]'));
  if (allTextEls.length === 0) return '';

  // If this tweetElement contains a quoted tweet or card, filter out their tweetText elements
  const mainQuoteEl = findQuoteTweetContainer(tweetElement);
  const mainCardEl = tweetElement.querySelector('[data-testid="card.wrapper"], [data-testid="article-card"]');

  const filteredTextEls = allTextEls.filter(el => {
    if (mainQuoteEl && mainQuoteEl.contains(el)) return false;
    if (mainCardEl && mainCardEl.contains(el)) return false;
    return true;
  });

  const targetEls = filteredTextEls.length > 0 ? filteredTextEls : allTextEls;

  return targetEls.map(textEl => {
    const clone = textEl.cloneNode(true) as HTMLElement;

    // 1. Preserve Twitter/X inline emojis (e.g. <img alt="🚨" ...>)
    clone.querySelectorAll('img[alt]').forEach(img => {
      const alt = img.getAttribute('alt');
      if (alt) {
        img.replaceWith(document.createTextNode(alt));
      }
    });

    // 2. Remove ONLY hidden visual URL duplicate prefixes (e.g. hidden "https://" screenreader spans), NOT content text!
    clone.querySelectorAll('span[style*="display: none"], span[style*="display:none"]').forEach(el => {
      const txt = (el.textContent || '').trim();
      if (txt === 'https://' || txt === 'http://' || txt === 'www.') {
        el.remove();
      }
    });

    let raw = clone.innerText || clone.textContent || '';

    // 3. Join http:// or https:// separated from domain by newlines: "http://\ngithub.com" -> "http://github.com"
    raw = raw.replace(/(https?:\/\/)\s*\n+\s*/gi, '$1');

    // 4. Join URL paths split across newlines
    raw = raw.replace(/((?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})\S*?)\n+(\S+)/gi, (match, p1, p2) => {
      if (/^[a-zA-Z0-9_\-\.\/\?%\=\#]+$/.test(p2)) {
        return p1 + p2;
      }
      return match;
    });

    // 5. Clean up accidental single newlines before/after mentions, hashtags, and apostrophes
    const cleaned = raw
      .replace(/([^\n])\n+(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/gi, '$1 $2')
      .replace(/(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)\n+([^\n])/gi, '$1 $2')
      .replace(/([^\n])\n+(['’]s|['’]re|['’]ve|['’]t|['’]m|['’]d|['’]ll)/gi, '$1$2');

    return cleaned.trim();
  }).filter(Boolean).join('\n\n');
}

export function extractQuoteTweetText(quoteContainer: Element): string {
  const qTextEls = Array.from(quoteContainer.querySelectorAll('[data-testid="tweetText"]'));
  if (qTextEls.length > 0) {
    return qTextEls.map(el => {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('img[alt]').forEach(img => {
        const alt = img.getAttribute('alt');
        if (alt) img.replaceWith(document.createTextNode(alt));
      });
      return (clone.innerText || clone.textContent || '').trim();
    }).filter(Boolean).join('\n\n');
  }

  const clone = quoteContainer.cloneNode(true) as HTMLElement;
  const userHeader = clone.querySelector('[data-testid="User-Name"]');
  if (userHeader) userHeader.remove();

  clone.querySelectorAll('img, video, svg, [data-testid="tweetPhoto"]').forEach(el => el.remove());

  clone.querySelectorAll('img[alt]').forEach(img => {
    const alt = img.getAttribute('alt');
    if (alt) img.replaceWith(document.createTextNode(alt));
  });

  return (clone.innerText || clone.textContent || '').trim();
}

function findQuoteTweetContainer(tweetElement: Element): HTMLElement | null {
  const testIdQuote = tweetElement.querySelector('[data-testid="quoteTweet"]');
  if (testIdQuote) return testIdQuote as HTMLElement;

  const userNames = tweetElement.querySelectorAll('[data-testid="User-Name"]');
  if (userNames.length > 1) {
    const secondUser = userNames[1];
    const candidate = secondUser.closest('div[role="link"], div[tabindex="0"]') as HTMLElement | null;
    if (candidate && candidate !== tweetElement && !candidate.contains(userNames[0])) {
      return candidate;
    }
  }

  return null;
}

export function extractTweetData(tweetElement: Element) {
  try {
    const text = extractCleanTweetText(tweetElement);

    const userEls = tweetElement.querySelectorAll('[data-testid="User-Name"] a');
    let authorName = '';
    let authorHandle = '';
    if (userEls.length >= 2) {
      authorName = (userEls[0] as HTMLElement).innerText;
      authorHandle = (userEls[1] as HTMLElement).innerText.replace('@', '');
    }

    // Attempt to extract tweet ID and createdAt from the time link
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

    // Extract posted date from <time> tag
    const timeEl = timeLink?.querySelector('time') || tweetElement.querySelector('time');
    let createdAt: Date | undefined = undefined;
    if (timeEl) {
      const datetimeAttr = timeEl.getAttribute('datetime');
      if (datetimeAttr) {
        const parsedDate = new Date(datetimeAttr);
        if (!isNaN(parsedDate.getTime())) {
          createdAt = parsedDate;
        }
      }
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
    
    // Find quoteContainer & card elements to exclude their media from main tweet media
    const mainQuoteEl = findQuoteTweetContainer(tweetElement);
    const mainCardEl = tweetElement.querySelector('[data-testid="card.wrapper"], [data-testid="article-card"]');

    // Scrape tweet videos/GIFs FIRST
    const videoEls = tweetElement.querySelectorAll('video');
    videoEls.forEach(el => {
      if (mainQuoteEl?.contains(el) || mainCardEl?.contains(el)) return;

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

    // Scrape tweet photos (excluding photos inside quoteContainer or card, and excluding video thumbnails/posters)
    const photoEls = tweetElement.querySelectorAll(
      '[data-testid="tweetPhoto"] img, a[href*="/photo/"] img, a[href*="/media/"] img, img[src*="pbs.twimg.com/media"]'
    );
    photoEls.forEach(el => {
      if (mainQuoteEl?.contains(el) || mainCardEl?.contains(el)) return;
      if (el.closest('[data-testid="videoPlayer"], [data-testid="videoComponent"]')) return;

      const img = el as HTMLImageElement;
      const src = img.src || img.getAttribute('src');
      if (!src) return;

      // Skip if this image URL matches a video poster/preview or is a video thumbnail
      const isVideoPoster = media.some(m => m.type === 'video' && (m.url === src || m.previewUrl === src || (m.previewUrl && src.includes(m.previewUrl))));
      const isVideoThumb = src.includes('ext_tw_video_thumb') || src.includes('amplify_video_thumb');

      if (!isVideoPoster && !isVideoThumb && !media.some(m => m.url === src)) {
        media.push({
          type: 'image',
          url: src
        });
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
      media?: { type: "image" | "video" | "gif"; url: string; previewUrl?: string }[];
    } | undefined = undefined;

    const quoteContainer = mainQuoteEl;
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

      const qText = extractQuoteTweetText(quoteContainer);

      // Extract Quoted Tweet status URL & ID
      let qHref = '';
      if (quoteContainer.tagName === 'A' && quoteContainer.getAttribute('href')?.includes('/status/')) {
        qHref = quoteContainer.getAttribute('href') || '';
      }
      if (!qHref || !qHref.includes('/status/')) {
        const statusLink = quoteContainer.querySelector('a[href*="/status/"]') || quoteContainer.closest('a[href*="/status/"]');
        if (statusLink) {
          qHref = statusLink.getAttribute('href') || (statusLink as HTMLAnchorElement).href || '';
        }
      }
      if (!qHref || !qHref.includes('/status/')) {
        // Look for any status link inside tweetElement that does NOT match the main tweet ID
        const secondaryStatusLink = tweetElement.querySelector(`a[href*="/status/"]:not([href*="${id}"])`);
        if (secondaryStatusLink) {
          qHref = secondaryStatusLink.getAttribute('href') || (secondaryStatusLink as HTMLAnchorElement).href || '';
        }
      }

      let qUrl = '';
      let qId = '';
      if (qHref) {
        const fullHref = qHref.startsWith('http') ? qHref : 'https://x.com' + qHref;
        const qMatch = fullHref.match(/\/status\/(\d+)/);
        if (qMatch) qId = qMatch[1];

        // Clean URL to strip /photo/N or /video/N lightbox paths
        qUrl = fullHref.replace(/\/photo\/\d+.*$/i, '').replace(/\/video\/\d+.*$/i, '');
      }
      if (!qUrl && qHandle && qId) {
        qUrl = `https://x.com/${qHandle}/status/${qId}`;
      } else if (!qUrl && qHandle) {
        qUrl = `https://x.com/${qHandle}`;
      }

      const qAvatarImg = quoteContainer.querySelector('img[src*="profile_images"]') as HTMLImageElement | null;
      let qAvatar = qAvatarImg?.src || qAvatarImg?.getAttribute('src') || '';
      if (qAvatar) qAvatar = qAvatar.replace(/_normal\.(jpg|jpeg|png|webp)/i, '_bigger.$1');

      const qMediaItems: { type: "image" | "video" | "gif"; url: string; previewUrl?: string }[] = [];
      quoteContainer.querySelectorAll('img[src*="pbs.twimg.com/media"]').forEach(img => {
        const src = (img as HTMLImageElement).src || img.getAttribute('src');
        if (src && !qMediaItems.some(m => m.url === src)) {
          qMediaItems.push({ type: 'image', url: src });
        }
      });

      if (qHandle || qText || qUrl || qMediaItems.length > 0) {
        quotedTweet = {
          id: qId || undefined,
          authorHandle: qHandle,
          authorName: qName || undefined,
          authorAvatarUrl: qAvatar || undefined,
          text: qText || undefined,
          tweetUrl: qUrl || undefined,
          media: qMediaItems.length > 0 ? qMediaItems : undefined
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
      createdAt,
      source: 'extension'
    };
  } catch (error) {
    console.error("Failed to extract tweet data", error);
    return null;
  }
}
