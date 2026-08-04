import { db, Bookmark } from './db';
import { MSG, type ActionMessage } from './messages';

chrome.runtime.onMessage.addListener((message: ActionMessage, sender, sendResponse) => {
  if (message.type === MSG.SAVE_TWEET) {
    handleSaveTweet(message.payload)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.type === MSG.CHECK_TWEET_SAVED) {
    db.bookmarks.get(message.payload.id)
      .then(bookmark => sendResponse({ saved: !!bookmark }))
      .catch(err => sendResponse({ saved: false, error: err.message }));
    return true;
  }

  if (message.type === MSG.IMPORT_BATCH) {
    handleImportBatch(message.payload)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === MSG.GET_CATEGORIES) {
    db.categories.toArray()
      .then(categories => sendResponse(categories))
      .catch(() => sendResponse([]));
    return true;
  }

  if (message.type === MSG.CREATE_CATEGORY) {
    const newCat = {
      id: 'cat_' + Date.now(),
      name: message.payload.name,
      createdAt: new Date(),
      sortOrder: Date.now()
    };
    db.categories.add(newCat)
      .then(() => sendResponse({ success: true, category: newCat }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === MSG.OPEN_DASHBOARD) {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    sendResponse({ success: true });
    return true;
  }
});

async function handleSaveTweet(payload: Partial<Bookmark>) {
  if (!payload.id) return { success: false, error: 'No tweet ID provided' };
  
  try {
    const existing = await db.bookmarks.get(payload.id);
    if (existing) {
      return { success: true, message: 'Already saved', id: payload.id };
    }

    const newBookmark: Bookmark = {
      id: payload.id,
      tweetUrl: payload.tweetUrl || '',
      authorHandle: payload.authorHandle || '',
      authorName: payload.authorName,
      text: payload.text,
      createdAt: payload.createdAt,
      savedAt: new Date(),
      categoryIds: payload.categoryIds || [],
      tags: payload.tags || [],
      media: payload.media || [],
      quotedTweet: payload.quotedTweet,
      articles: payload.articles,
      source: payload.source || 'extension',
      authorAvatarUrl: payload.authorAvatarUrl
    };

    await db.bookmarks.add(newBookmark);
    chrome.storage?.local?.get('xmarks_onboarding', result => {
      const state = result?.xmarks_onboarding || { version: 1 };
      chrome.storage?.local?.set({
        xmarks_onboarding: { ...state, firstSaveCompleted: true, firstSaveCompletedAt: new Date().toISOString() }
      });
    });
    return { success: true, id: payload.id };
  } catch (error: any) {
    console.error('Error saving tweet:', error);
    return { success: false, error: error.message };
  }
}

async function handleImportBatch(payload: Partial<Bookmark>[]) {
  try {
    // Ensure "Imported from X" category exists
    const allCats = await db.categories.toArray();
    let importCategory = allCats.find(c => c.name === 'Imported from X');
    if (!importCategory) {
      importCategory = {
        id: 'cat_imported',
        name: 'Imported from X',
        createdAt: new Date(),
        sortOrder: 999
      };
      await db.categories.add(importCategory);
    }

    const newBookmarks: Bookmark[] = [];
    for (const b of payload) {
      if (!b.id) continue;
      const existing = await db.bookmarks.get(b.id);
      if (!existing) {
        newBookmarks.push({
          id: b.id,
          tweetUrl: b.tweetUrl || '',
          authorHandle: b.authorHandle || '',
          authorName: b.authorName,
          text: b.text,
          savedAt: new Date(),
          categoryIds: b.categoryIds || [importCategory.id],
          tags: b.tags || [],
          media: b.media || [],
          quotedTweet: b.quotedTweet,
          articles: b.articles,
          source: 'x-bookmark-import',
          authorAvatarUrl: b.authorAvatarUrl
        });
      }
    }
    
    if (newBookmarks.length > 0) {
      await db.bookmarks.bulkAdd(newBookmarks);
      chrome.storage?.local?.get('xmarks_onboarding', result => {
        const state = result?.xmarks_onboarding || { version: 1 };
        chrome.storage?.local?.set({
          xmarks_onboarding: { ...state, firstSyncCompleted: true, firstSyncCompletedAt: new Date().toISOString() }
        });
      });
    }
    return { success: true, count: newBookmarks.length };
  } catch (error: any) {
    console.error('Error importing batch:', error);
    return { success: false, error: error.message };
  }
}
