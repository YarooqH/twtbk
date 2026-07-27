import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useOutsideClick } from './hooks/useOutsideClick';
import { useAccentColor } from './hooks/useAccentColor';
import { useChromeStorage } from './hooks/useChromeStorage';
import { useAutoCategorize } from './hooks/useAutoCategorize';
import { Sidebar } from './components/Sidebar';
import { BookmarkList } from './components/BookmarkList';
import { SettingsPanel } from './components/SettingsPanel';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';

export type SortOption = 'newest' | 'oldest' | 'posted-newest' | 'posted-oldest' | 'author';

// ── Component ────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // In-App Toast & Modal Notifications (W4)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'alert';
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Mobile Settings Drawer State (W3)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // Accent color customization
  const [accentColor, setAccentColor] = useAccentColor();
  
  // AI Auto-Categorize with in-app dialogs
  const {
    autoCategorize, setAutoCategorize,
    isModelLoaded, modelProgress,
    isClassifying, classifyProgress,
    toggleAutoCategorize, runAutoCategorizeJobs,
  } = useAutoCategorize(
    (msg) => setToastMessage(msg),
    (opts) => {
      setModalConfig({
        isOpen: true,
        title: opts.title,
        message: opts.message,
        type: 'confirm',
        confirmText: 'Proceed',
        onConfirm: () => {
          setModalConfig(null);
          opts.onConfirm();
        }
      });
    }
  );
  
  // Chrome storage settings
  const {
    alsoSaveNative, saveMode, injectedPosition, nativeOverrideAction, buttonAlignment,
    setAlsoSaveNative, setSaveMode, setInjectedPosition, setNativeOverrideAction, setButtonAlignment,
  } = useChromeStorage(setAccentColor, setAutoCategorize);
  
  // Category Creation State
  const [newCatName, setNewCatName] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('newest');

  // Custom Dropdown State for cards
  const [activePickerBookmarkId, setActivePickerBookmarkId] = useState<string | null>(null);

  // Note Editing States
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const [activeColorPickerCatId, setActiveColorPickerCatId] = useState<string | null>(null);

  // Category rename
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Close category color picker when clicking anywhere outside
  useOutsideClick(!!activeColorPickerCatId, () => {
    setActiveColorPickerCatId(null);
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    
    const existing = categories?.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setModalConfig({
        isOpen: true,
        title: 'Category Exists',
        message: `A category with the name "${name}" already exists!`,
        type: 'alert',
        onConfirm: () => setModalConfig(null)
      });
      return;
    }

    const newCat = {
      id: 'cat_' + Date.now(),
      name,
      createdAt: new Date(),
      sortOrder: categories ? categories.length : 0
    };

    await db.categories.add(newCat);
    setNewCatName('');
  };

  const bookmarks = useLiveQuery(() => db.bookmarks.orderBy('savedAt').reverse().toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  // Count uncategorized bookmarks
  const uncategorizedCount = useMemo(() => {
    if (!bookmarks) return 0;
    return bookmarks.filter(b => b.categoryIds.length === 0).length;
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (!bookmarks) return [];
    let result = bookmarks;
    if (selectedCategoryId) {
      result = result.filter(b => b.categoryIds.includes(selectedCategoryId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.text?.toLowerCase().includes(q) ||
        b.authorName?.toLowerCase().includes(q) ||
        b.authorHandle.toLowerCase().includes(q)
      );
    }
    
    result = [...result].sort((a, b) => {
      if (sortOrder === 'newest') {
        return (new Date(b.savedAt || 0).getTime()) - (new Date(a.savedAt || 0).getTime());
      } else if (sortOrder === 'oldest') {
        return (new Date(a.savedAt || 0).getTime()) - (new Date(b.savedAt || 0).getTime());
      } else if (sortOrder === 'posted-newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.savedAt || 0).getTime();
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.savedAt || 0).getTime();
        return timeB - timeA;
      } else if (sortOrder === 'posted-oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.savedAt || 0).getTime();
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.savedAt || 0).getTime();
        return timeA - timeB;
      } else if (sortOrder === 'author') {
        const nameA = (a.authorName || a.authorHandle || '').toLowerCase();
        const nameB = (b.authorName || b.authorHandle || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [bookmarks, searchQuery, selectedCategoryId, sortOrder]);

  const handleExport = async () => {
    const allData = await db.bookmarks.toArray();
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'twitter_bookmarks_export.json'; a.click();
    URL.revokeObjectURL(url);
    setToastMessage('Exported bookmarks file successfully!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const revived = json.map((b: any) => ({
            ...b,
            savedAt: b.savedAt ? new Date(b.savedAt) : new Date(),
            createdAt: b.createdAt ? new Date(b.createdAt) : undefined
          }));
          await db.bookmarks.bulkPut(revived);
          setToastMessage(`Imported ${revived.length} bookmarks successfully!`);
        }
      } catch {
        setModalConfig({
          isOpen: true,
          title: 'Import Failed',
          message: 'The selected file is not a valid JSON export.',
          type: 'alert',
          onConfirm: () => setModalConfig(null)
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalConfig({
      isOpen: true,
      title: 'Delete Bookmark?',
      message: 'Are you sure you want to delete this bookmark from your library?',
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
        setModalConfig(null);
        await db.bookmarks.delete(id);
        setToastMessage('Bookmark deleted');
      }
    });
  };

  const getCategoryName = (id: string) => categories?.find(c => c.id === id)?.name || id;

  return (
    <div className="dashboard-container">
      <Sidebar
        bookmarks={bookmarks}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        newCatName={newCatName}
        setNewCatName={setNewCatName}
        handleCreateCategory={handleCreateCategory}
        editingCatId={editingCatId}
        setEditingCatId={setEditingCatId}
        editingCatName={editingCatName}
        setEditingCatName={setEditingCatName}
        activeColorPickerCatId={activeColorPickerCatId}
        setActiveColorPickerCatId={setActiveColorPickerCatId}
        autoCategorize={autoCategorize}
        toggleAutoCategorize={toggleAutoCategorize}
        isModelLoaded={isModelLoaded}
        modelProgress={modelProgress}
        isClassifying={isClassifying}
        classifyProgress={classifyProgress}
        runAutoCategorizeJobs={runAutoCategorizeJobs}
      />

      <BookmarkList
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        selectedCategoryId={selectedCategoryId}
        filteredBookmarks={filteredBookmarks}
        bookmarks={bookmarks}
        categories={categories}
        handleExport={handleExport}
        handleImport={handleImport}
        handleDelete={handleDelete}
        getCategoryName={getCategoryName}
        editingNoteId={editingNoteId}
        setEditingNoteId={setEditingNoteId}
        tempNote={tempNote}
        setTempNote={setTempNote}
        activePickerBookmarkId={activePickerBookmarkId}
        setActivePickerBookmarkId={setActivePickerBookmarkId}
        mobileSettingsOpen={mobileSettingsOpen}
        setMobileSettingsOpen={setMobileSettingsOpen}
      />

      <SettingsPanel
        settingsExpanded={settingsExpanded}
        setSettingsExpanded={setSettingsExpanded}
        mobileSettingsOpen={mobileSettingsOpen}
        setMobileSettingsOpen={setMobileSettingsOpen}
        saveMode={saveMode}
        setSaveMode={setSaveMode}
        injectedPosition={injectedPosition}
        setInjectedPosition={setInjectedPosition}
        nativeOverrideAction={nativeOverrideAction}
        setNativeOverrideAction={setNativeOverrideAction}
        buttonAlignment={buttonAlignment}
        setButtonAlignment={setButtonAlignment}
        alsoSaveNative={alsoSaveNative}
        setAlsoSaveNative={setAlsoSaveNative}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        autoCategorize={autoCategorize}
        toggleAutoCategorize={toggleAutoCategorize}
        isModelLoaded={isModelLoaded}
        modelProgress={modelProgress}
        isClassifying={isClassifying}
        classifyProgress={classifyProgress}
        runAutoCategorizeJobs={runAutoCategorizeJobs}
      />

      {/* In-App Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* In-App Confirm/Alert Modal */}
      {modalConfig && (
        <Modal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          isDanger={modalConfig.isDanger}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}
    </div>
  );
};
