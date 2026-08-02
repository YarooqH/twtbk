import { useEffect } from 'react';

type ShortcutAction = 'search' | 'edit_note' | 'go_all_bookmarks' | 'new_category';

export function useKeyboardShortcuts(
  onShortcut: (action: ShortcutAction) => void
) {
  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const now = Date.now();
      const key = e.key.toLowerCase();

      // Check 'g a' sequence (go all bookmarks)
      if (key === 'a' && lastKey === 'g' && now - lastKeyTime < 1000) {
        e.preventDefault();
        onShortcut('go_all_bookmarks');
        lastKey = '';
        return;
      }

      // Single keys
      if (key === '/') {
        e.preventDefault();
        onShortcut('search');
      } else if (key === 'e') {
        e.preventDefault();
        onShortcut('edit_note');
      } else if (key === 'c') {
        e.preventDefault();
        onShortcut('new_category');
      }

      // Record for sequences
      lastKey = key;
      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShortcut]);
}
