export function extractCleanTweetText(tweetElement: Element): string {
  const textEl = tweetElement.querySelector('[data-testid="tweetText"]');
  if (!textEl) return '';

  const clone = textEl.cloneNode(true) as HTMLElement;

  // Replace br elements with explicit newlines
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // Remove hidden aria-hidden spans (e.g. hidden http:// prefixes or visual hides)
  clone.querySelectorAll('[aria-hidden="true"]').forEach(el => el.remove());

  let raw = clone.innerText || clone.textContent || '';

  // 1. Join http:// or https:// separated from domain by newlines: "http://\ngithub.com" -> "http://github.com"
  raw = raw.replace(/(https?:\/\/)\s*\n+\s*/gi, '$1');

  // 2. Join URL paths split across newlines: "github.com/elayadesign/re\ndesign-skill"
  raw = raw.replace(/((?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})\S*?)\n+(\S+)/gi, (match, p1, p2) => {
    if (/^[a-zA-Z0-9_\-\.\/\?%\=\#]+$/.test(p2)) {
      return p1 + p2;
    }
    return match;
  });

  // 3. Clean up accidental single newlines before/after mentions, hashtags, and apostrophes
  const cleaned = raw
    .replace(/([^\n])\n+(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/gi, '$1 $2')
    .replace(/(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)\n+([^\n])/gi, '$1 $2')
    .replace(/([^\n])\n+(['’]s|['’]re|['’]ve|['’]t|['’]m|['’]d|['’]ll)/gi, '$1$2');

  return cleaned.trim();
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
      createdAt,
      source: 'extension'
    };
  } catch (error) {
    console.error("Failed to extract tweet data", error);
    return null;
  }
}
