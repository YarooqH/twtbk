import React, { useState, useMemo, useEffect } from 'react';
import { db, Bookmark } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';


// ── Icons ───────────────────────────────────────────
const BookmarkIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

const AllIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);

const SortIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M3 6h18M7 12h10M11 18h2"/>
  </svg>
);

// ── Helpers ─────────────────────────────────────────
const getInitials = (name: string) => name?.trim()?.charAt(0)?.toUpperCase() || '?';
const categoryColors = ['#1d9bf0', '#00c4b6', '#f91880', '#7856ff', '#ff7a00', '#00ba7c'];
const getCategoryColor = (id: string, customColor?: string) => {
  if (customColor) return customColor;
  return categoryColors[id.charCodeAt(id.length - 1) % categoryColors.length];
};

const formatDate = (date: Date | undefined) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date));
};

// ── Component ────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [alsoSaveNative, setAlsoSaveNative] = useState(false);
  
  // Save Mode Settings
  const [saveMode, setSaveMode] = useState<'injected' | 'native-override'>('injected');
  const [injectedPosition, setInjectedPosition] = useState<'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark'>('rightmost');
  const [nativeOverrideAction, setNativeOverrideAction] = useState<'replace' | 'arrow'>('replace');
  const [buttonAlignment, setButtonAlignment] = useState<'left' | 'center' | 'right'>('center');
  
  // AI Auto-Categorize States
  const [autoCategorize, setAutoCategorize] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Category Creation State
  const [newCatName, setNewCatName] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'author'>('newest');
  
  // Custom Dropdown State for cards
  const [activePickerBookmarkId, setActivePickerBookmarkId] = useState<string | null>(null);

  // Note Editing States
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  // Accent color customization
  const [accentColor, setAccentColor] = useState('#1d9bf0');
  const [activeColorPickerCatId, setActiveColorPickerCatId] = useState<string | null>(null);

  // Category rename
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Settings collapse state
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Category context menu on card header
  const [activeCatMenuBookmarkId, setActiveCatMenuBookmarkId] = useState<string | null>(null);
  const [catMenuPickingColor, setCatMenuPickingColor] = useState(false);
  const [catMenuRenaming, setCatMenuRenaming] = useState(false);
  const [catMenuRenameVal, setCatMenuRenameVal] = useState('');
  // Drag position state for the interactive bar
  const [dragOver, setDragOver] = useState<number | null>(null);



  // Close card picker when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActivePickerBookmarkId(null);
    };
    if (activePickerBookmarkId) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activePickerBookmarkId]);

  // Close category color picker when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveColorPickerCatId(null);
      setActiveCatMenuBookmarkId(null);
      setCatMenuPickingColor(false);
      setCatMenuRenaming(false);
    };
    if (activeColorPickerCatId || activeCatMenuBookmarkId) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activeColorPickerCatId, activeCatMenuBookmarkId]);

  useEffect(() => {
    chrome.storage?.sync?.get(['alsoSaveNativeBookmarks', 'saveMode', 'injectedPosition', 'nativeOverrideAction', 'autoCategorize', 'accentColor', 'buttonAlignment'], (result) => {
      if (result.alsoSaveNativeBookmarks !== undefined) setAlsoSaveNative(Boolean(result.alsoSaveNativeBookmarks));
      if (result.saveMode !== undefined) setSaveMode(result.saveMode as 'injected' | 'native-override');
      if (result.injectedPosition !== undefined) setInjectedPosition(result.injectedPosition as 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark');
      if (result.nativeOverrideAction !== undefined) setNativeOverrideAction(result.nativeOverrideAction as 'replace' | 'arrow');
      if (result.autoCategorize !== undefined) setAutoCategorize(Boolean(result.autoCategorize));
      if (result.accentColor !== undefined) setAccentColor(result.accentColor as string);
      if (result.buttonAlignment !== undefined) setButtonAlignment(result.buttonAlignment as 'left' | 'center' | 'right');
    });
  }, []);

  // Update theme dynamically on accentColor change
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
    const hoverColors: Record<string, string> = {
      '#1d9bf0': '#1a8cd8',
      '#ffd400': '#e6be00',
      '#f91880': '#e01673',
      '#7856ff': '#6c4de6',
      '#ff7a00': '#e66e00',
      '#00ba7c': '#00a36c'
    };
    const lightColors: Record<string, string> = {
      '#1d9bf0': 'rgba(29, 155, 240, 0.08)',
      '#ffd400': 'rgba(255, 212, 0, 0.08)',
      '#f91880': 'rgba(249, 24, 128, 0.08)',
      '#7856ff': 'rgba(120, 86, 255, 0.08)',
      '#ff7a00': 'rgba(255, 122, 0, 0.08)',
      '#00ba7c': 'rgba(0, 186, 124, 0.08)'
    };
    document.documentElement.style.setProperty('--accent-hover', hoverColors[accentColor] || accentColor);
    document.documentElement.style.setProperty('--accent-light', lightColors[accentColor] || 'rgba(128, 128, 128, 0.08)');
  }, [accentColor]);

  // Auto-load model on mount/refresh if setting is enabled
  useEffect(() => {
    if (autoCategorize && !isModelLoaded && modelProgress === null) {
      setModelProgress(0);
      import('../utils/classifier').then(({ initClassifier }) => {
        return initClassifier((progress) => {
          setModelProgress(Math.round(progress));
        });
      }).then(() => {
        setIsModelLoaded(true);
        setModelProgress(null);
      }).catch(err => {
        console.error("Failed to auto-load AI model on mount", err);
        setModelProgress(null);
      });
    }
  }, [autoCategorize]);

  const toggleNativeSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlsoSaveNative(e.target.checked);
    chrome.storage?.sync?.set({ alsoSaveNativeBookmarks: e.target.checked });
  };

  const handleSaveModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'injected' | 'native-override';
    setSaveMode(val);
    chrome.storage?.sync?.set({ saveMode: val });
  };

  const handleInjectedPositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'leftmost' | 'rightmost' | 'next-to-bookmark';
    setInjectedPosition(val);
    chrome.storage?.sync?.set({ injectedPosition: val });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    
    const existing = categories?.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      alert("A category with this name already exists!");
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

  const toggleAutoCategorize = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const confirmDownload = window.confirm(
        "Auto-Categorize uses a local AI model (~45MB) to organize your bookmarks semantically.\n\n" +
        "This model will be downloaded from Hugging Face and cached locally in your browser.\n\n" +
        "Do you want to proceed with the download?"
      );
      if (!confirmDownload) {
        e.preventDefault();
        return;
      }
      
      setAutoCategorize(true);
      chrome.storage?.sync?.set({ autoCategorize: true });
      
      try {
        setModelProgress(0);
        const { initClassifier } = await import('../utils/classifier');
        await initClassifier((progress) => {
          setModelProgress(Math.round(progress));
        });
        setIsModelLoaded(true);
        setModelProgress(null);
      } catch (err: any) {
        alert("Failed to load AI model: " + err.message);
        setAutoCategorize(false);
        chrome.storage?.sync?.set({ autoCategorize: false });
        setModelProgress(null);
      }
    } else {
      setAutoCategorize(false);
      chrome.storage?.sync?.set({ autoCategorize: false });
    }
  };

  const runAutoCategorizeJobs = async () => {
    const cats = await db.categories.toArray();
    // Exclude the default 'Imported from X' category from the target matching candidates
    const targetCats = cats.filter(c => c.id !== 'cat_imported');
    
    if (targetCats.length === 0) {
      alert("Please create at least one custom category (e.g. Tech, Design) first!");
      return;
    }

    // A bookmark is eligible if it has no categories, or if its only category is the default 'Imported from X'
    const uncategorized = await db.bookmarks
      .filter(b => b.categoryIds.length === 0 || (b.categoryIds.length === 1 && b.categoryIds[0] === 'cat_imported'))
      .toArray();

    if (uncategorized.length === 0) {
      alert("No bookmarks require categorization (all have specific categories assigned)!");
      return;
    }

    setIsClassifying(true);
    setClassifyProgress({ current: 0, total: uncategorized.length });
    
    let categorizedCount = 0;
    try {
      // Lazy load model if needed
      const { initClassifier, classifyTweet } = await import('../utils/classifier');
      await initClassifier(() => {});
      
      for (let i = 0; i < uncategorized.length; i++) {
        const bookmark = uncategorized[i];
        setClassifyProgress({ current: i + 1, total: uncategorized.length });
        
        if (!bookmark.text) continue;
        const matchedCatId = await classifyTweet(bookmark.text, targetCats);
        if (matchedCatId) {
          await db.bookmarks.update(bookmark.id, {
            categoryIds: [matchedCatId] // Replace default with the new semantic category
          });
          categorizedCount++;
        }
      }
      alert(`Auto-categorization complete! Categorized ${categorizedCount} bookmarks.`);
    } catch (err) {
      console.error("Auto-categorization job failed", err);
    } finally {
      setIsClassifying(false);
      setClassifyProgress(null);
    }
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
        return (b.savedAt?.getTime() || 0) - (a.savedAt?.getTime() || 0);
      } else if (sortOrder === 'oldest') {
        return (a.savedAt?.getTime() || 0) - (b.savedAt?.getTime() || 0);
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
          alert('Import successful!');
        }
      } catch { alert('Invalid JSON file'); }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this bookmark?')) await db.bookmarks.delete(id);
  };

  const getCategoryName = (id: string) => categories?.find(c => c.id === id)?.name || id;

  const svgIcons = {
    reply: (
      <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
        <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.492c4.419 0 8.005 3.58 8.005 8 0 4.42-3.586 8.01-8.005 8.01h-2.297L7.099 21.84c-.422.286-.966.305-1.407.05-.442-.257-.714-.726-.714-1.237v-2.65c-2.986-.316-5.227-2.86-5.227-6.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 2.94 2.124 5.38 4.962 5.89l.802.14v3.13l3.774-2.52c.287-.193.626-.29.972-.29h1.701c3.316 0 6.005-2.69 6.005-6 0-3.31-2.689-6-6.005-6H9.756z"/>
      </svg>
    ),
    retweet: (
      <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
        <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48L.068 8.02L4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93l1.364 1.46l-4.432 4.14l-4.432-4.14l1.364-1.46l2.068 1.93V8c0-1.1-.896-2-2-2z"/>
      </svg>
    ),
    like: (
      <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
        <path d="M16.697 5.5c-1.222-.06-2.679.69-3.894 1.86L12 8.122l-.803-.762c-1.215-1.17-2.672-1.92-3.894-1.86c-2.348.11-4.303 2.14-4.303 4.584c0 3.253 4.804 7.664 8.761 10.974c.123.104.28.163.44.163s.316-.059.44-.163c3.957-3.31 8.761-7.721 8.761-10.974c0-2.444-1.955-4.475-4.303-4.584zm-4.332 13.064c-3.155-2.664-7.365-6.524-7.365-8.98c0-1.455 1.155-2.666 2.535-2.732c.866-.04 1.942.54 2.827 1.41L12 9.944l1.638-1.682c.885-.87 1.961-1.45 2.827-1.41c1.38.066 2.535 1.277 2.535 2.732c0 2.456-4.21 6.316-7.365 8.98z"/>
      </svg>
    ),
    bookmark: (
      <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
        <path d="M4 4.5C4 3.12 5.12 2 6.5 2h11C18.88 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.28 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.22-.5-.5-.5h-11z"/>
      </svg>
    ),
    library: (
      <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.25 }}>
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    share: (
      <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
        <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41L7.71 9.71 6.3 8.29 12 2.59zM21 11v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-9h2v9h14v-9h2z"/>
      </svg>
    ),
    views: (
      <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
        <path d="M8.75 21V3h2v18h-2zM18 21V11h2v10h-2zM3 21v-6h2v6H3z"/>
      </svg>
    ),
  };

  // Interactive action bar – for Injected mode, clicking a slot sets position
  const renderInteractiveBar = () => {
    // Fixed X action bar slots (order matters)
    type SlotId = 'leftmost' | 'reply' | 'retweet' | 'like' | 'views' | 'next-to-bookmark' | 'bookmark' | 'rightmost' | 'share';
    const slots: { id: SlotId; icon: React.ReactNode; label: string; isNative: boolean; clickable?: boolean }[] = [
      { id: 'leftmost',          icon: svgIcons.library,  label: 'Before reply',         isNative: false, clickable: true },
      { id: 'reply',             icon: svgIcons.reply,    label: 'Reply',                isNative: true },
      { id: 'retweet',           icon: svgIcons.retweet,  label: 'Repost',               isNative: true },
      { id: 'like',              icon: svgIcons.like,     label: 'Like',                 isNative: true },
      { id: 'views',             icon: svgIcons.views,    label: 'Views',                isNative: true },
      { id: 'bookmark',          icon: svgIcons.bookmark, label: 'Bookmark',             isNative: true },
      { id: 'next-to-bookmark',  icon: svgIcons.library,  label: 'After bookmark',       isNative: false, clickable: true },
      { id: 'share',             icon: svgIcons.share,    label: 'Share',                isNative: true },
      { id: 'rightmost',         icon: svgIcons.library,  label: 'After share (end)',    isNative: false, clickable: true },
    ];

    if (saveMode === 'native-override') {
      // Just show a static bar where Bookmark is highlighted (native override)
      const staticSlots = [
        { id: 'reply',    icon: svgIcons.reply,    isNative: true },
        { id: 'retweet',  icon: svgIcons.retweet,  isNative: true },
        { id: 'like',     icon: svgIcons.like,     isNative: true },
        { id: 'views',    icon: svgIcons.views,    isNative: true },
        { 
          id: 'bookmark', 
          icon: nativeOverrideAction === 'arrow' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {svgIcons.bookmark}
              <svg viewBox="0 0 24 24" style={{ width: '10px', height: '10px', fill: 'currentColor' }}><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>
            </div>
          ) : svgIcons.bookmark, 
          isNative: false 
        },
        { id: 'share',    icon: svgIcons.share,    isNative: true },
      ];
      return (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>
            {nativeOverrideAction === 'arrow' ? 'An arrow will appear next to X\'s bookmark' : 'Clicking X\'s native bookmark opens our dialog'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 8px' }}>
            {staticSlots.map(s => (
              <span key={s.id} style={{ color: !s.isNative ? 'var(--accent)' : 'var(--text-muted)', opacity: !s.isNative ? 1 : 0.35, border: !s.isNative ? '1px dashed var(--accent)' : 'none', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // 7 positions mapped to slot indices in the bar
    // slots: 0=beforeReply, 1=beforeRepost, 2=beforeLike, 3=beforeViews, 4=beforeBookmark, 5=afterBookmark, 6=afterShare
    const posToSlot: Record<string, number> = {
      'leftmost': 0,
      'after-reply': 1,
      'after-retweet': 2,
      'after-like': 3,
      'after-views': 4,
      'next-to-bookmark': 5,
      'rightmost': 6,
    };
    const currentSlot = posToSlot[injectedPosition] ?? 6;

    const nativeIcons = [
      { key: 'reply',    icon: svgIcons.reply },
      { key: 'retweet', icon: svgIcons.retweet },
      { key: 'like',    icon: svgIcons.like },
      { key: 'views',    icon: svgIcons.views },
      { key: 'bookmark',icon: svgIcons.bookmark },
      { key: 'share',   icon: svgIcons.share },
    ];

    const posLabel = injectedPosition === 'leftmost' ? 'Before Reply'
      : injectedPosition === 'after-reply' ? 'After Reply'
      : injectedPosition === 'after-retweet' ? 'After Repost'
      : injectedPosition === 'after-like' ? 'After Like'
      : injectedPosition === 'after-views' ? 'After Views'
      : injectedPosition === 'next-to-bookmark' ? 'After Bookmark'
      : 'After Share';

    // Single-container drag model:
    // onDragOver fires on the bar div → calculate nearest slot from clientX
    // onDragLeave only fires when cursor truly leaves the bar
    // This prevents flickering caused by child element onDragLeave events
    const getSlotFromMouseX = (e: React.DragEvent<HTMLDivElement>): number => {
      const bar = e.currentTarget as HTMLDivElement;
      const rect = bar.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const fraction = relX / rect.width;
      // 7 slots, map fraction linearly
      return Math.min(6, Math.max(0, Math.round(fraction * 6.5)));
    };

    const slotToPos = (slot: number): 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost' => {
      if (slot === 0) return 'leftmost';
      if (slot === 1) return 'after-reply';
      if (slot === 2) return 'after-retweet';
      if (slot === 3) return 'after-like';
      if (slot === 4) return 'after-views';
      if (slot === 5) return 'next-to-bookmark';
      return 'rightmost';
    };

    // Build the ordered list of cells: [zone0, native0, zone1, native1, ... native5, zone6]
    type Cell = { type: 'zone'; slotIdx: number } | { type: 'native'; icon: React.ReactNode; key: string };
    const cells: Cell[] = [];
    for (let i = 0; i < nativeIcons.length; i++) {
      cells.push({ type: 'zone', slotIdx: i });
      cells.push({ type: 'native', icon: nativeIcons[i].icon, key: nativeIcons[i].key });
    }
    cells.push({ type: 'zone', slotIdx: 6 });

    return (
      <div style={{ marginTop: '8px' }}>
        {/* Draggable icon chip — icon only */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', 'library');
              e.dataTransfer.effectAllowed = 'move';
            }}
            title="Drag into the bar below to set position"
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${accentColor}20`,
              border: `2px solid var(--accent)`,
              color: 'var(--accent)',
              borderRadius: '8px',
              cursor: 'grab',
              userSelect: 'none',
              flexShrink: 0,
              transition: 'transform 0.12s, box-shadow 0.12s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 5px ${accentColor}20`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {svgIcons.library}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Bookmark Button</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Drag into bar below · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{posLabel}</span>
            </span>
          </div>
        </div>

        {/* X action bar — single container handles all drag events */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOver(getSlotFromMouseX(e));
          }}
          onDragLeave={(e) => {
            // Only clear when cursor truly exits the entire bar
            const bar = e.currentTarget as HTMLDivElement;
            const related = e.relatedTarget as Node | null;
            if (!related || !bar.contains(related)) {
              setDragOver(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const slot = getSlotFromMouseX(e);
            const pos = slotToPos(slot);
            setDragOver(null);
            setInjectedPosition(pos);
            chrome.storage?.sync?.set({ injectedPosition: pos });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
            background: 'var(--bg-secondary)',
            border: `1.5px solid ${dragOver !== null ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '14px',
            padding: '6px 4px',
            gap: '0',
            transition: 'border-color 0.15s',
            cursor: 'copy',
            userSelect: 'none',
          }}
        >
          {cells.map((cell, idx) => {
            if (cell.type === 'zone') {
              const isPlaced = currentSlot === cell.slotIdx && dragOver === null;
              const isHovered = dragOver === cell.slotIdx;
              const active = isPlaced || isHovered;
              return (
                <div
                  key={`zone-${cell.slotIdx}`}
                  style={{
                    flex: active ? '0 0 32px' : '0 0 5px',
                    height: '30px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isHovered
                      ? `2px dashed var(--accent)`
                      : isPlaced
                        ? `2px solid var(--accent)`
                        : '2px solid transparent',
                    background: active ? `${accentColor}18` : 'transparent',
                    color: 'var(--accent)',
                    transition: 'flex 0.18s cubic-bezier(0.34,1.56,0.64,1), border-color 0.12s, background 0.12s',
                    overflow: 'hidden',
                    pointerEvents: 'none', // critical: events go to parent
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <div style={{
                      opacity: isHovered ? 0.55 : 1,
                      transition: 'opacity 0.12s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isHovered ? 'scale(0.9)' : 'scale(1)',
                    }}>
                      {svgIcons.library}
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div
                  key={cell.key}
                  style={{
                    flex: '0 0 auto',
                    width: '26px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    opacity: 0.38,
                    pointerEvents: 'none', // critical: events go to parent
                  }}
                >
                  {cell.icon}
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  };


  return (
    <div className="dashboard-container">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src="/XMarks-logos/Xmarks-logo-white-round.svg" alt="XMarks Logo" width={16} height={16} />
          </div>
          <div>
            <div className="sidebar-logo-text">XMarks</div>
            <div className="sidebar-logo-sub">{bookmarks?.length ?? 0} saved</div>
          </div>
        </div>

        <div className="sidebar-section-label">Library</div>
        <ul>
          <li
            className={`sidebar-item ${!selectedCategoryId ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId(null)}
          >
            <span className="sidebar-item-icon"><AllIcon /></span>
            All Bookmarks
            {!selectedCategoryId && bookmarks && (
              <span className="sidebar-item-badge">{bookmarks.length}</span>
            )}
          </li>
        </ul>

        <div className="sidebar-section-label">Categories</div>
        <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '6px', padding: '4px 12px 12px 12px', flexShrink: 0 }}>
          <input 
            type="text" 
            placeholder="New category..." 
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            className="new-cat-input"
          />
          <button type="submit" className="new-cat-btn">Add</button>
        </form>

        <div className="sidebar-categories-list" style={{ flexGrow: 1, overflowY: 'auto' }}>
          {categories && categories.length > 0 && (
            <ul>
              {categories.map(cat => {
                const count = bookmarks?.filter(b => b.categoryIds.includes(cat.id)).length ?? 0;
                const isEditing = editingCatId === cat.id;
                return (
                  <li
                    key={cat.id}
                    className={`sidebar-item ${selectedCategoryId === cat.id ? 'active' : ''}`}
                    onClick={() => !isEditing && setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
                    style={{ position: 'relative' }}
                  >
                    <span 
                      className="cat-dot" 
                      style={{ background: getCategoryColor(cat.id, cat.color), cursor: 'pointer', flexShrink: 0 }}
                      title="Click to change color"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveColorPickerCatId(activeColorPickerCatId === cat.id ? null : cat.id);
                      }}
                    />
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingCatName}
                        onChange={e => setEditingCatName(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const trimmed = editingCatName.trim();
                            if (trimmed) await db.categories.update(cat.id, { name: trimmed });
                            setEditingCatId(null);
                          } else if (e.key === 'Escape') {
                            setEditingCatId(null);
                          }
                        }}
                        onBlur={async () => {
                          const trimmed = editingCatName.trim();
                          if (trimmed) await db.categories.update(cat.id, { name: trimmed });
                          setEditingCatId(null);
                        }}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          color: 'var(--text)',
                          border: 'none',
                          borderBottom: '1px solid var(--accent)',
                          outline: 'none',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          padding: '1px 0',
                          minWidth: 0,
                        }}
                      />
                    ) : (
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                    )}
                    {!isEditing && (
                      <>
                        <button
                          title="Rename"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCatId(cat.id);
                            setEditingCatName(cat.name);
                          }}
                          style={{
                            background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
                            color: 'var(--text-muted)', opacity: 0, display: 'flex', alignItems: 'center',
                            transition: 'opacity 0.15s', flexShrink: 0,
                          }}
                          className="cat-rename-btn"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <span className="sidebar-item-badge" style={{ background: getCategoryColor(cat.id, cat.color), flexShrink: 0 }}>{count}</span>
                      </>
                    )}

                    {activeColorPickerCatId === cat.id && (
                      <div 
                        onClick={e => e.stopPropagation()} 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '12px',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-lg)',
                          padding: '8px',
                          zIndex: 150,
                          display: 'flex',
                          gap: '6px'
                        }}
                      >
                        {categoryColors.map(color => (
                          <span
                            key={color}
                            onClick={async () => {
                              await db.categories.update(cat.id, { color });
                              setActiveColorPickerCatId(null);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: color,
                              cursor: 'pointer',
                              border: cat.color === color ? '2px solid var(--text)' : 'none',
                              boxShadow: '0 0 2px rgba(0,0,0,0.3)'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="content">
        <div className="content-header">
          <div className="content-header-top">
            <h1 className="content-title">
              {selectedCategoryId ? getCategoryName(selectedCategoryId) : 'All Bookmarks'}
            </h1>
            <div className="header-actions">
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
            <div style={{ display: 'flex', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)', overflow: 'hidden', flexShrink: 0 }}>
              {(['newest', 'oldest', 'author'] as const).map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => setSortOrder(opt)}
                  style={{
                    padding: '8px 11px',
                    fontSize: '12px',
                    fontWeight: sortOrder === opt ? 700 : 400,
                    background: sortOrder === opt ? 'var(--accent)' : 'transparent',
                    color: sortOrder === opt ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderLeft: i > 0 ? '1px solid var(--border-strong)' : 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  title={opt === 'newest' ? 'Newest First' : opt === 'oldest' ? 'Oldest First' : 'Author A-Z'}
                >
                  {opt === 'newest' ? 'New' : opt === 'oldest' ? 'Old' : 'A-Z'}
                </button>
              ))}
            </div>
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
            filteredBookmarks.map(bookmark => (
              <div key={bookmark.id} className="bookmark-card" onClick={() => window.open(bookmark.tweetUrl, '_blank')}>
                <div className="bm-author-row">
                  <div className="bm-author-info">
                    <div className="bm-avatar" style={{ overflow: 'hidden' }}>
                      {bookmark.authorAvatarUrl ? (
                        <img 
                          src={bookmark.authorAvatarUrl} 
                          alt={bookmark.authorName} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        getInitials(bookmark.authorName || bookmark.authorHandle)
                      )}
                    </div>
                    <div>
                      <div className="bm-author-name">{bookmark.authorName || bookmark.authorHandle}</div>
                      <div className="bm-handle">@{bookmark.authorHandle}</div>
                    </div>
                  </div>
                  <div className="bm-actions" style={{ position: 'relative' }}>
                   
                    <a
                      href={bookmark.tweetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bm-action-btn"
                      onClick={e => e.stopPropagation()}
                      title="View on X"
                    >
                      <LinkIcon />
                    </a>
                    <button
                      className="bm-action-btn danger"
                      onClick={e => handleDelete(bookmark.id, e)}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <p className="bm-text">{bookmark.text || <em style={{ color: 'var(--text-muted)' }}>(No text)</em>}</p>

                {/* Quoted Tweet Block */}
                {bookmark.quotedTweet && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (bookmark.quotedTweet?.tweetUrl) {
                        window.open(bookmark.quotedTweet.tweetUrl, '_blank');
                      }
                    }}
                    style={{
                      marginTop: '10px',
                      marginBottom: '10px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {bookmark.quotedTweet.authorAvatarUrl && (
                        <img 
                          src={bookmark.quotedTweet.authorAvatarUrl} 
                          alt={bookmark.quotedTweet.authorName || bookmark.quotedTweet.authorHandle} 
                          style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      )}
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                        {bookmark.quotedTweet.authorName || bookmark.quotedTweet.authorHandle}
                      </span>
                      {bookmark.quotedTweet.authorHandle && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          @{bookmark.quotedTweet.authorHandle}
                        </span>
                      )}
                    </div>
                    {bookmark.quotedTweet.text && (
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)', lineHeight: '1.4' }}>
                        {bookmark.quotedTweet.text}
                      </p>
                    )}
                  </div>
                )}

                {/* Articles / Card Links */}
                {bookmark.articles && bookmark.articles.length > 0 && bookmark.articles.map((art, idx) => (
                  <div 
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(art.url, '_blank');
                    }}
                    style={{
                      marginTop: '10px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer'
                    }}
                  >
                    {art.thumbnailUrl && (
                      <img 
                        src={art.thumbnailUrl} 
                        alt={art.title || art.domain} 
                        style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} 
                      />
                    )}
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      {art.domain && (
                        <div style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          {art.domain}
                        </div>
                      )}
                      {art.title && (
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {art.title}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Media Grid */}
                {bookmark.media && bookmark.media.length > 0 && (
                  <div 
                    onClick={e => e.stopPropagation()}
                    style={{
                      marginTop: '10px',
                      marginBottom: '10px',
                      display: 'grid',
                      gridTemplateColumns: bookmark.media.length > 1 ? 'repeat(2, 1fr)' : '1fr',
                      gap: '8px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {bookmark.media.slice(0, 4).map((item, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          position: 'relative', 
                          paddingBottom: bookmark.media.length === 1 ? '56.25%' : '75%', // 16:9 for single, 4:3 for multi
                          height: 0, 
                          overflow: 'hidden',
                          background: 'var(--bg-secondary)',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <img 
                          src={item.previewUrl || item.url} 
                          alt="media preview" 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        {item.type === 'video' && (
                          <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.15)'
                          }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '50%',
                              background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: '#fff'
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Note section */}
                <div 
                  style={{ 
                    marginTop: '8px', 
                    marginBottom: '12px',
                    borderLeft: '2px solid var(--accent)', 
                    paddingLeft: '10px', 
                    fontSize: '13px', 
                    color: 'var(--text-muted)' 
                  }}
                >
                  {editingNoteId === bookmark.id ? (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        value={tempNote}
                        onChange={e => setTempNote(e.target.value)}
                        placeholder="Add a note to this bookmark..."
                        style={{
                          width: '100%',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          resize: 'none',
                          height: '50px',
                          outline: 'none'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="btn"
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '11px', 
                            background: 'transparent',
                            color: 'var(--text)',
                            border: '1px solid var(--border-strong)'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            await db.bookmarks.update(bookmark.id, { note: tempNote });
                            setEditingNoteId(null);
                          }}
                          className="btn btn-primary"
                          style={{ padding: '4px 12px', fontSize: '11px' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNoteId(bookmark.id);
                        setTempNote(bookmark.note || '');
                      }}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      title="Click to edit note"
                    >
                      <span>
                        {bookmark.note ? (
                          <><strong>Note:</strong> {bookmark.note}</>
                        ) : (
                          <em style={{ opacity: 0.6 }}>+ Add note...</em>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bm-footer">
                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setActivePickerBookmarkId(activePickerBookmarkId === bookmark.id ? null : bookmark.id);
                      }}
                      style={{
                        background: bookmark.categoryIds[0] ? `${getCategoryColor(bookmark.categoryIds[0], categories?.find(c => c.id === bookmark.categoryIds[0])?.color)}15` : 'var(--bg-secondary)',
                        color: bookmark.categoryIds[0] ? getCategoryColor(bookmark.categoryIds[0], categories?.find(c => c.id === bookmark.categoryIds[0])?.color) : 'var(--text-muted)',
                        border: '1px solid ' + (bookmark.categoryIds[0] ? `${getCategoryColor(bookmark.categoryIds[0], categories?.find(c => c.id === bookmark.categoryIds[0])?.color)}40` : 'var(--border)'),
                        borderRadius: 'var(--radius-full)',
                        padding: '4px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.15s'
                      }}
                    >
                      {bookmark.categoryIds[0] && (
                        <span 
                          style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: getCategoryColor(bookmark.categoryIds[0], categories?.find(c => c.id === bookmark.categoryIds[0])?.color) 
                          }} 
                        />
                      )}
                      {bookmark.categoryIds[0] ? getCategoryName(bookmark.categoryIds[0]) : 'No Category'}
                      <span style={{ fontSize: '9px', opacity: 0.6 }}>▼</span>
                    </button>

                    {activePickerBookmarkId === bookmark.id && (
                      <div className="bm-cat-dropdown-menu">
                        <button
                          className="bm-cat-dropdown-item"
                          onClick={async () => {
                            await db.bookmarks.update(bookmark.id, { categoryIds: [] });
                            setActivePickerBookmarkId(null);
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#71767b' }} />
                          No Category
                        </button>
                        {categories?.map(cat => (
                          <button
                            key={cat.id}
                            className="bm-cat-dropdown-item"
                            onClick={async () => {
                              await db.bookmarks.update(bookmark.id, { categoryIds: [cat.id] });
                              setActivePickerBookmarkId(null);
                            }}
                            style={{
                              fontWeight: bookmark.categoryIds.includes(cat.id) ? 700 : 400
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor(cat.id, cat.color) }} />
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="bm-date">{formatDate(bookmark.savedAt)}</span>
                  <a href={bookmark.tweetUrl} target="_blank" rel="noreferrer" className="bm-link" onClick={e => e.stopPropagation()}>
                    View tweet ↗
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <aside className="settings-sidebar">
        <div style={{
          display: 'grid',
          gridTemplateRows: settingsExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease-out, opacity 0.25s ease-out',
          opacity: settingsExpanded ? 1 : 0,
          overflow: 'hidden',
          width: '100%'
        }}>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '12px' }}>
            {/* Card 1: Configuration */}
            <div className="settings-card">
              <div className="settings-card-title">Save Configuration</div>
              
              <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '4px' }}>
                <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>SAVE MODE</span>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => {
                      setSaveMode('injected');
                      chrome.storage?.sync?.set({ saveMode: 'injected' });
                    }}
                    style={{
                      flex: 1,
                      background: saveMode === 'injected' ? 'var(--accent)' : 'transparent',
                      color: saveMode === 'injected' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                  >
                    Injected
                  </button>
                  <button
                    onClick={() => {
                      setSaveMode('native-override');
                      chrome.storage?.sync?.set({ saveMode: 'native-override' });
                    }}
                    style={{
                      flex: 1,
                      background: saveMode === 'native-override' ? 'var(--accent)' : 'transparent',
                      color: saveMode === 'native-override' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                  >
                    Override Native
                  </button>
                </div>
                {renderInteractiveBar()}
              </div>

              {saveMode === 'injected' && (
                <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '4px' }}>
                  <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>BUTTON ALIGNMENT</span>
                  <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)' }}>
                    {(['left', 'center', 'right'] as const).map(align => (
                      <button
                        key={align}
                        onClick={() => {
                          setButtonAlignment(align);
                          chrome.storage?.sync?.set({ buttonAlignment: align });
                        }}
                        style={{
                          flex: 1,
                          background: buttonAlignment === align ? 'var(--accent)' : 'transparent',
                          color: buttonAlignment === align ? '#fff' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: 'var(--radius-full)',
                          padding: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textTransform: 'capitalize',
                          transition: 'background 0.15s, color 0.15s'
                        }}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {saveMode === 'native-override' && (
                <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '4px' }}>
                  <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>OVERRIDE ACTION</span>
                  <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)' }}>
                    <button
                      onClick={() => {
                        setNativeOverrideAction('replace');
                        chrome.storage?.sync?.set({ nativeOverrideAction: 'replace' });
                      }}
                      style={{
                        flex: 1,
                        background: nativeOverrideAction === 'replace' ? 'var(--accent)' : 'transparent',
                        color: nativeOverrideAction === 'replace' ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background 0.15s, color 0.15s'
                      }}
                    >
                      Replace Click
                    </button>
                    <button
                      onClick={() => {
                        setNativeOverrideAction('arrow');
                        chrome.storage?.sync?.set({ nativeOverrideAction: 'arrow' });
                      }}
                      style={{
                        flex: 1,
                        background: nativeOverrideAction === 'arrow' ? 'var(--accent)' : 'transparent',
                        color: nativeOverrideAction === 'arrow' ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background 0.15s, color 0.15s'
                      }}
                    >
                      Add Arrow Dropdown
                    </button>
                  </div>
                </div>
              )}

              {saveMode === 'injected' && (
                <div className="toggle-row" style={{ marginBottom: '0px' }}>
                  <span className="toggle-label" style={{ fontSize: '13px' }}>Also Save Native Bookmarks</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={alsoSaveNative} onChange={toggleNativeSave} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              )}
            </div>

            {/* Card 2: Theme / Accent */}
            <div className="settings-card">
              <div className="settings-card-title">Personalization</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>ACCENT COLOR</span>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  {categoryColors.map(color => (
                    <span
                      key={color}
                      onClick={() => {
                        setAccentColor(color);
                        chrome.storage?.sync?.set({ accentColor: color });
                      }}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: color,
                        cursor: 'pointer',
                        border: accentColor === color ? '2px solid var(--text)' : 'none',
                        boxShadow: '0 0 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: AI Categorize */}
            <div className="settings-card">
              <div className="settings-card-title">AI Assistant</div>
              <div className="toggle-row" style={{ marginBottom: '0px' }}>
                <span className="toggle-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                  AI Auto-Categorize <span style={{ fontSize: 10, color: 'var(--accent)' }}>(45MB)</span>
                </span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={autoCategorize} onChange={toggleAutoCategorize} />
                  <span className="toggle-slider" />
                </label>
              </div>
              {modelProgress !== null && (
                <div style={{ padding: '4px 0', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Downloading model...</span>
                    <span>{modelProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${modelProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s' }} />
                  </div>
                </div>
              )}
              {autoCategorize && isModelLoaded && (
                <div style={{ padding: '4px 0' }}>
                  <button 
                    onClick={runAutoCategorizeJobs} 
                    disabled={isClassifying}
                    className="btn btn-ghost" 
                    style={{ width: '100%', fontSize: '12px', padding: '8px', justifyContent: 'center' }}
                  >
                    {isClassifying && classifyProgress 
                      ? `Categorizing (${classifyProgress.current}/${classifyProgress.total})...` 
                      : 'Run Auto-Categorizer Now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible toggle bar at the bottom right */}
        <div 
          className="sidebar-section-label" 
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          style={{ 
            padding: '8px 12px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderRadius: 'var(--radius-md)',
            background: settingsExpanded ? 'var(--bg-secondary)' : 'transparent',
            transition: 'background 0.15s',
            userSelect: 'none',
            margin: '0',
            width: '100%'
          }}
          onMouseEnter={e => {
            if (!settingsExpanded) e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={e => {
            if (!settingsExpanded) e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon /> <span style={{ marginLeft: 6 }}>Settings</span>
          </div>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            style={{ 
              transform: settingsExpanded ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.2s',
              color: 'var(--text-muted)'
            }}
          >
            <path d="M6 15l6-6 6 6"/>
          </svg>
        </div>
      </aside>
    </div>
  );
};
