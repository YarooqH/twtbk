import React from 'react';
import { BookmarkIcon, SearchIcon, DownloadIcon, UploadIcon, SettingsIcon } from '../icons';
import { BookmarkCard } from './BookmarkCard';
import { SortOption } from '../Dashboard';
import { SortDropdown } from './SortDropdown';

interface BookmarkListProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortOrder: SortOption;
  setSortOrder: (val: SortOption) => void;
  selectedCategoryId: string | null;
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
  selectedCategoryId,
  filteredBookmarks, bookmarks, categories,
  handleExport, handleImport, handleDelete,
  getCategoryName,
  editingNoteId, setEditingNoteId, tempNote, setTempNote,
  activePickerBookmarkId, setActivePickerBookmarkId,
  mobileSettingsOpen, setMobileSettingsOpen,
  selectedBookmarkIds = new Set(), toggleBookmarkSelection,
}) => {
  return (
    <main className="content">
      <div className="content-header">
        <div className="content-header-top">
          <h1 className="content-title">
            {selectedCategoryId ? getCategoryName(selectedCategoryId) : 'All Bookmarks'}
          </h1>
          <div className="header-actions">
            {setMobileSettingsOpen && (
              <button 
                className="btn btn-ghost mobile-settings-btn" 
                onClick={() => setMobileSettingsOpen(!mobileSettingsOpen)} 
                title="Settings"
                style={{ padding: '6px 10px' }}
              >
                <SettingsIcon /> Settings
              </button>
            )}
            <button className="btn btn-ghost" onClick={handleExport} title="Export JSON">
              <DownloadIcon /> Export
            </button>
            <label className="btn btn-ghost" title="Import JSON" style={{ cursor: 'pointer' }}>
              <UploadIcon /> Import
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
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
