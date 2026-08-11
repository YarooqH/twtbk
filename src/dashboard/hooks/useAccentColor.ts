import { useState, useEffect, useCallback } from 'react';

export function useAccentColor() {
  const [accentColor, setAccentColorState] = useState('#1d9bf0');

  useEffect(() => {
    chrome.storage?.sync?.get(['accentColor'], (result) => {
      if (result && result.accentColor) {
        setAccentColorState(result.accentColor as string);
      }
    });
  }, []);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    chrome.storage?.sync?.set({ accentColor: color });
  }, []);

  useEffect(() => {
    if (accentColor === 'monochrome') {
      document.documentElement.style.setProperty('--accent', 'var(--text)');
      document.documentElement.style.setProperty('--accent-hover', 'var(--text)');
      document.documentElement.style.setProperty('--accent-light', 'color-mix(in srgb, var(--text) 15%, transparent)');
    } else {
      document.documentElement.style.setProperty('--accent', accentColor);
      document.documentElement.style.setProperty('--accent-hover', accentColor);
      document.documentElement.style.setProperty('--accent-light', accentColor + '14');
    }
  }, [accentColor]);

  return [accentColor, setAccentColor] as const;
}
