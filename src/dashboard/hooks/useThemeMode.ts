import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export function useThemeMode() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    chrome.storage?.sync?.get(['themeMode'], (result) => {
      if (result.themeMode) {
        setThemeModeState(result.themeMode as ThemeMode);
      }
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    chrome.storage?.sync?.set({ themeMode: mode });
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  return [themeMode, setThemeMode] as const;
}
