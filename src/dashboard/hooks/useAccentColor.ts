import { useState, useEffect } from 'react';

export function useAccentColor() {
  const [accentColor, setAccentColor] = useState('#1d9bf0');

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

  return [accentColor, setAccentColor] as const;
}
