import { useState, useEffect, useCallback } from 'react';
import { applyAccentVariables } from '../../shared/colors';

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
    applyAccentVariables(accentColor);

    // Re-apply when data-theme changes on documentElement
    const observer = new MutationObserver(() => {
      applyAccentVariables(accentColor);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Re-apply when system dark/light mode preference changes
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => applyAccentVariables(accentColor);
    media.addEventListener?.('change', handleMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener?.('change', handleMediaChange);
    };
  }, [accentColor]);

  return [accentColor, setAccentColor] as const;
}
