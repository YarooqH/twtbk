import { db, type Bookmark } from './db';
import { bookmarkRepository } from './bookmarks/repository';
import { MSG, type ActionMessage } from './messages';

chrome.runtime.onMessage.addListener((message: ActionMessage, sender, sendResponse) => {
  if (message.type === MSG.SAVE_TWEET) {
    handleSaveTweet(message.payload)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === MSG.DELETE_BOOKMARK) {
    bookmarkRepository.delete(message.payload.id)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.type === MSG.CHECK_TWEET_SAVED) {
    bookmarkRepository.get(message.payload.id)
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
    bookmarkRepository.listCategories()
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
    bookmarkRepository.createCategory(newCat)
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
    const result = await bookmarkRepository.save({ ...payload, id: payload.id });
    if (!result.created) {
      return { success: true, message: 'Updated existing bookmark', id: payload.id };
    }
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
    const result = await bookmarkRepository.importBatch(
      payload.filter((bookmark): bookmark is Partial<Bookmark> & Pick<Bookmark, 'id'> => Boolean(bookmark.id))
    );

    if (result.count > 0) {
      chrome.storage?.local?.get('xmarks_onboarding', stored => {
        const state = stored?.xmarks_onboarding || { version: 1 };
        chrome.storage?.local?.set({
          xmarks_onboarding: { ...state, firstSyncCompleted: true, firstSyncCompletedAt: new Date().toISOString() }
        });
      });
    }
    return { success: true, count: result.count };
  } catch (error: any) {
    console.error('Error importing batch:', error);
    return { success: false, error: error.message };
  }
}
