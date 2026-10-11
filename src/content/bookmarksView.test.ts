// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { isBookmarksView, isBookmarksOrHistoryPage } from './bookmarksView';

const at = (pathname: string) => ({ pathname });

function historyTabs(selected: string, withHref = true): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = ['bookmarks', 'likes', 'videos', 'articles']
    .map((tab) => {
      const label = tab[0].toUpperCase() + tab.slice(1);
      const attrs = `role="tab" aria-selected="${tab === selected}"`;
      return withHref ? `<a ${attrs} href="/i/history/${tab}">${label}</a>` : `<div ${attrs}><span>${label}</span></div>`;
    })
    .join('');
  return root;
}

describe('isBookmarksView', () => {
  it('accepts the classic bookmarks page and its folders', () => {
    expect(isBookmarksView(at('/i/bookmarks'), document)).toBe(true);
    expect(isBookmarksView(at('/i/bookmarks/'), document)).toBe(true);
    expect(isBookmarksView(at('/i/bookmarks/1790000000000000000'), document)).toBe(true);
  });

  it('rejects unrelated pages', () => {
    expect(isBookmarksView(at('/home'), document)).toBe(false);
    expect(isBookmarksView(at('/i/bookmarksfoo'), document)).toBe(false);
    expect(isBookmarksView(at('/someone/likes'), document)).toBe(false);
  });

  it('uses the tab in a History URL', () => {
    expect(isBookmarksView(at('/i/history/bookmarks'), document)).toBe(true);
    expect(isBookmarksView(at('/i/history/likes'), document)).toBe(false);
    expect(isBookmarksView(at('/i/history/videos'), document)).toBe(false);
  });

  it('on bare /i/history, follows the selected tab', () => {
    expect(isBookmarksView(at('/i/history'), historyTabs('bookmarks'))).toBe(true);
    expect(isBookmarksView(at('/i/history'), historyTabs('likes'))).toBe(false);
  });

  it('treats the default History tab (linking to /i/history itself) as bookmarks', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<a role="tab" aria-selected="true" href="/i/history">Bookmarks</a>' +
      '<a role="tab" aria-selected="false" href="/i/history/likes">Likes</a>';
    expect(isBookmarksView(at('/i/history'), root)).toBe(true);
    root.innerHTML =
      '<a role="tab" aria-selected="false" href="/i/history">Bookmarks</a>' +
      '<a role="tab" aria-selected="true" href="/i/history/likes">Likes</a>';
    expect(isBookmarksView(at('/i/history'), root)).toBe(false);
  });

  it('falls back to the tab label when tabs have no links', () => {
    expect(isBookmarksView(at('/i/history'), historyTabs('bookmarks', false))).toBe(true);
    expect(isBookmarksView(at('/i/history'), historyTabs('likes', false))).toBe(false);
  });

  it('treats History as not-bookmarks until a tab is selected', () => {
    expect(isBookmarksView(at('/i/history'), document.createElement('div'))).toBe(false);
  });
});

describe('isBookmarksOrHistoryPage', () => {
  it('matches both layouts and nothing else', () => {
    expect(isBookmarksOrHistoryPage(at('/i/bookmarks'))).toBe(true);
    expect(isBookmarksOrHistoryPage(at('/i/history'))).toBe(true);
    expect(isBookmarksOrHistoryPage(at('/i/history/likes'))).toBe(true);
    expect(isBookmarksOrHistoryPage(at('/home'))).toBe(false);
  });
});
