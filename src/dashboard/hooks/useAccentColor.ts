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
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);

  return [accentColor, setAccentColor] as const;
}
