import React from 'react';
import { BookmarkIcon, SearchIcon, DownloadIcon, UploadIcon, TuneIcon } from '../icons';
import { getCategoryColor } from '../helpers';
import { BookmarkCard } from './BookmarkCard';
import { SortOption } from '../Dashboard';
import { SortDropdown } from './SortDropdown';

interface BookmarkListProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortOrder: SortOption;
  setSortOrder: (val: SortOption) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  filteredBookmarks: any[];
  bookmarks: any[] | undefined;
  categories: any[] | undefined;
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDelete: (id: string, e: React.MouseEvent) => void;
  getCategoryName: (id: string) => string;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  tempNote: string;
  setTempNote: (val: string) => void;
  activePickerBookmarkId: string | null;
  setActivePickerBookmarkId: (id: string | null) => void;
  mobileSettingsOpen?: boolean;
  setMobileSettingsOpen?: (val: boolean) => void;
  selectedBookmarkIds?: Set<string>;
  toggleBookmarkSelection?: (id: string) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  searchQuery, setSearchQuery,
  sortOrder, setSortOrder,
  selectedCategoryId, setSelectedCategoryId,
  filteredBookmarks, bookmarks, categories,
  handleExport, handleImport, handleDelete,
  getCategoryName,
  editingNoteId, setEditingNoteId, tempNote, setTempNote,
  activePickerBookmarkId, setActivePickerBookmarkId,
  mobileSettingsOpen, setMobileSettingsOpen,
  selectedBookmarkIds = new Set(), toggleBookmarkSelection,
}) => {
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false);
  const lastScrollY = React.useRef(0);
  const downDistance = React.useRef(0);
  const upDistance = React.useRef(0);
  const frameRequest = React.useRef<number | null>(null);
  const collapsedRef = React.useRef(false);

  React.useEffect(() => {
    lastScrollY.current = window.scrollY;

    const updateHeader = () => {
      frameRequest.current = null;
      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      if (currentScrollY <= 20) {
        downDistance.current = 0;
        upDistance.current = 0;
        if (collapsedRef.current) {
          collapsedRef.current = false;
          setHeaderCollapsed(false);
        }
        return;
      }

      if (delta > 0) {
        downDistance.current += delta;
        upDistance.current = 0;
        if (!collapsedRef.current && downDistance.current >= 24) {
          collapsedRef.current = true;
          setHeaderCollapsed(true);
        }
      } else if (delta < 0) {
        upDistance.current += Math.abs(delta);
        downDistance.current = 0;
        if (collapsedRef.current && upDistance.current >= 16) {
          collapsedRef.current = false;
          setHeaderCollapsed(false);
        }
      }
    };

    const handleScroll = () => {
      if (frameRequest.current === null) {
        frameRequest.current = window.requestAnimationFrame(updateHeader);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRequest.current !== null) window.cancelAnimationFrame(frameRequest.current);
    };
  }, []);

  return (
    <main className="content">
      <nav className="mobile-category-nav" aria-label="Bookmark categories">
        <button
          type="button"
          className={`mobile-category-chip ${!selectedCategoryId ? 'active' : ''}`}
          onClick={() => setSelectedCategoryId(null)}
        >
          All <span>{bookmarks?.length ?? 0}</span>
        </button>
        <button
          type="button"
          className={`mobile-category-chip ${selectedCategoryId === '__uncategorized__' ? 'active' : ''}`}
          onClick={() => setSelectedCategoryId(selectedCategoryId === '__uncategorized__' ? null : '__uncategorized__')}
        >
          <span>Uncategorized</span>
          <span>{bookmarks?.filter(b => !b.categoryIds || b.categoryIds.length === 0).length ?? 0}</span>
        </button>
        {(categories || []).map((category: any) => {
          const count = bookmarks?.filter(bookmark => bookmark.categoryIds?.includes(category.id)).length ?? 0;
          return (
            <button
              type="button"
              key={category.id}
              className={`mobile-category-chip ${selectedCategoryId === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id)}
            >
              <i style={{ background: getCategoryColor(category.id, category.color) }} aria-hidden="true" />
              <span>{category.name}</span>
              <span>{count}</span>
            </button>
          );
        })}
      </nav>
      <div className="content-header">
        <div className={`content-header-top ${headerCollapsed ? 'collapsed' : ''}`}>
          <h1 className="content-title">
            {selectedCategoryId === '__uncategorized__' ? 'Uncategorized' : (selectedCategoryId ? getCategoryName(selectedCategoryId) : 'All Bookmarks')}
          </h1>
          <div className="header-actions">
            <button className="btn btn-ghost mobile-header-action" type="button" onClick={handleExport} title="Export JSON" aria-label="Export bookmarks">
              <DownloadIcon /> Export
            </button>
            <label className="btn btn-ghost mobile-header-action" title="Import JSON" aria-label="Import bookmarks" style={{ cursor: 'pointer' }}>
              <UploadIcon /> Import
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
            {setMobileSettingsOpen && (
              <button
                className="btn btn-ghost mobile-header-action mobile-settings-btn"
                onClick={() => setMobileSettingsOpen(!mobileSettingsOpen)}
                title="Open settings"
                aria-label="Open settings"
              >
                <TuneIcon /> <span>Settings</span>
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <span className="search-icon"><SearchIcon /></span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by author or text..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <SortDropdown sortOrder={sortOrder} setSortOrder={setSortOrder} />
        </div>
      </div>

      <div className="bookmarks-list">
        {filteredBookmarks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><BookmarkIcon size={28} /></div>
            <p className="empty-title">No bookmarks found</p>
            <p className="empty-desc">
              {searchQuery ? 'Try a different search term.' : 'Start saving tweets using the button injected into X.'}
            </p>
          </div>
        ) : (
          filteredBookmarks.map((bookmark: any) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              categories={categories}
              getCategoryName={getCategoryName}
              editingNoteId={editingNoteId}
              setEditingNoteId={setEditingNoteId}
              tempNote={tempNote}
              setTempNote={setTempNote}
              activePickerBookmarkId={activePickerBookmarkId}
              setActivePickerBookmarkId={setActivePickerBookmarkId}
              handleDelete={handleDelete}
              isSelected={selectedBookmarkIds.has(bookmark.id)}
              onToggleSelection={() => toggleBookmarkSelection?.(bookmark.id)}
            />
          ))
        )}
      </div>
    </main>
  );
};
