import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { MultiSelectActionBar } from './components/MultiSelectActionBar';
import { useOnboarding } from '../onboarding/state';

export type SortOption = 'newest' | 'oldest' | 'posted-newest' | 'posted-oldest' | 'author';

// ── Component ────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'categorize' | 'export' | 'delete' | null>(null);
  const { state: onboarding, isLoaded: onboardingLoaded, markDashboardSeen, dismissWelcome, markFirstAction } = useOnboarding();
  
  // In-App Toast & Modal Notifications (W4)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | null>(null);
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
  const [settingsExpanded, setSettingsExpanded] = useState(false);

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

  useEffect(() => {
    if (onboardingLoaded && !onboarding.dashboardSeenAt) markDashboardSeen();
  }, [onboardingLoaded, onboarding.dashboardSeenAt, markDashboardSeen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !modalConfig && selectedBookmarkIds.size > 0) {
        setSelectedBookmarkIds(new Set());
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalConfig, selectedBookmarkIds]);

  useKeyboardShortcuts((action) => {
    if (action === 'search') {
      document.querySelector<HTMLInputElement>('.search-input')?.focus();
    } else if (action === 'new_category') {
      document.querySelector<HTMLInputElement>('.new-cat-input')?.focus();
    } else if (action === 'go_all_bookmarks') {
      setSelectedCategoryId(null);
    }
  });

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
      if (selectedCategoryId === '__uncategorized__') {
        result = result.filter(b => !b.categoryIds || b.categoryIds.length === 0);
      } else {
        result = result.filter(b => b.categoryIds?.includes(selectedCategoryId));
      }
    }
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      const isTagSearch = q.startsWith('#');
      const tagQuery = isTagSearch ? q.slice(1) : q;
      
      result = result.filter(b => {
        if (isTagSearch) {
          return b.tags?.some(tag => tag.toLowerCase().includes(tagQuery));
        }
        return b.text?.toLowerCase().includes(q) ||
               b.authorName?.toLowerCase().includes(q) ||
               b.authorHandle.toLowerCase().includes(q) ||
               b.note?.toLowerCase().includes(q) ||
               b.tags?.some(tag => tag.toLowerCase().includes(q)) ||
               b.quotedTweet?.text?.toLowerCase().includes(q) ||
               b.quotedTweet?.authorName?.toLowerCase().includes(q) ||
               b.quotedTweet?.authorHandle?.toLowerCase().includes(q) ||
               b.articles?.some(art => art.title?.toLowerCase().includes(q) || art.snippet?.toLowerCase().includes(q));
      });
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
  }, [bookmarks, deferredSearchQuery, selectedCategoryId, sortOrder]);

  const visibleBookmarkIds = useMemo(() => new Set(filteredBookmarks.map(bookmark => bookmark.id)), [filteredBookmarks]);
  const hiddenSelectedCount = useMemo(
    () => Array.from(selectedBookmarkIds).filter(id => !visibleBookmarkIds.has(id)).length,
    [selectedBookmarkIds, visibleBookmarkIds]
  );

  const handleExport = async () => {
    const allData = await db.bookmarks.toArray();
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'twitter_bookmarks_export.json'; a.click();
    URL.revokeObjectURL(url);
    setToastMessage('Exported bookmarks file successfully!');
  };

  const handleExportSelected = async () => {
    setBulkAction('export');
    try {
      const ids = Array.from(selectedBookmarkIds);
      const selected = await db.bookmarks.bulkGet(ids);
      const exportData = selected.filter((bookmark): bookmark is NonNullable<typeof bookmark> => Boolean(bookmark));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `twitter_bookmarks_${exportData.length}_selected.json`; a.click();
      URL.revokeObjectURL(url);
      setToastMessage(`Exported ${exportData.length} selected bookmark${exportData.length === 1 ? '' : 's'}`);
    } catch {
      setToastMessage('Could not export the selected bookmarks');
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkCategorize = async (categoryId: string | null) => {
    setBulkAction('categorize');
    const ids = Array.from(selectedBookmarkIds);
    try {
      await db.transaction('rw', db.bookmarks, async () => {
        await Promise.all(ids.map(id => db.bookmarks.update(id, { categoryIds: categoryId ? [categoryId] : [] })));
      });
      setSelectedBookmarkIds(new Set());
      setToastMessage(`Updated ${ids.length} bookmark${ids.length === 1 ? '' : 's'}`);
    } catch {
      setToastMessage('Could not categorize the selected bookmarks');
    } finally {
      setBulkAction(null);
    }
  };

  const requestBulkDelete = () => {
    if (bulkAction) return;
    const ids = Array.from(selectedBookmarkIds);
    setModalConfig({
      isOpen: true,
      title: `Delete ${ids.length} bookmark${ids.length === 1 ? '' : 's'}?`,
      message: 'This will remove the selected bookmarks from your library. You can undo this action briefly after deleting.',
      type: 'confirm',
      confirmText: 'Delete bookmarks',
      cancelText: 'Keep bookmarks',
      isDanger: true,
      onConfirm: async () => {
        setBulkAction('delete');
        try {
          const removed = (await db.bookmarks.bulkGet(ids)).filter((bookmark): bookmark is NonNullable<typeof bookmark> => Boolean(bookmark));
          await db.bookmarks.bulkDelete(ids);
          setSelectedBookmarkIds(new Set());
          setModalConfig(null);
        setToastAction({
          label: 'Undo',
          onClick: async () => {
            await db.bookmarks.bulkPut(removed);
            setToastMessage(`${removed.length} bookmark${removed.length === 1 ? '' : 's'} restored`);
            setToastAction(null);
          }
        });
          setToastMessage(`Deleted ${removed.length} bookmark${removed.length === 1 ? '' : 's'}`);
        } catch {
          setModalConfig(null);
          setToastMessage('Could not delete the selected bookmarks');
        } finally {
          setBulkAction(null);
        }
      }
    });
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

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    
    // Find the bookmark before deleting it so we can restore it
    const bookmarkToRestore = await db.bookmarks.get(id);
    if (!bookmarkToRestore) return;

    // Optimistic deletion
    await db.bookmarks.delete(id);
    
    setToastAction({
      label: 'Undo',
      onClick: async () => {
        await db.bookmarks.put(bookmarkToRestore);
        setToastMessage('Bookmark restored');
        setToastAction(null);
      }
    });
    setToastMessage('Bookmark deleted');
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
        setSelectedCategoryId={setSelectedCategoryId}
        filteredBookmarks={filteredBookmarks}
        showWelcomePanel={onboardingLoaded && Boolean(bookmarks?.length) && !onboarding.welcomePanelDismissed && !onboarding.firstDashboardActionCompleted}
        dismissWelcome={dismissWelcome}
        markFirstAction={markFirstAction}
        openXBookmarks={() => chrome.tabs.create({ url: 'https://x.com/i/bookmarks' })}
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
        selectedBookmarkIds={selectedBookmarkIds}
        toggleBookmarkSelection={(id: string) => {
          const next = new Set(selectedBookmarkIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedBookmarkIds(next);
        }}
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

      {/* Toast Notification */}
      <Toast 
        message={toastMessage} 
        action={toastAction || undefined}
        onClose={() => { setToastMessage(null); setToastAction(null); }} 
        duration={6000}
      />

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
          isBusy={bulkAction === 'delete'}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}

      <MultiSelectActionBar
        selectedIds={selectedBookmarkIds}
        visibleIds={filteredBookmarks.map(bookmark => bookmark.id)}
        clearSelection={() => setSelectedBookmarkIds(new Set())}
        selectAllVisible={() => setSelectedBookmarkIds(new Set(filteredBookmarks.map(bookmark => bookmark.id)))}
        exportSelected={handleExportSelected}
        requestDelete={requestBulkDelete}
        categories={categories || []}
        onCategorize={handleBulkCategorize}
        hiddenSelectedCount={hiddenSelectedCount}
        isBusy={bulkAction !== null}
      />
      <KeyboardShortcutsHelp />
    </div>
  );
};
