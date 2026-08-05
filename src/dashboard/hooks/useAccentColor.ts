import { useState, useEffect } from 'react';

export function useAccentColor() {
  const [accentColor, setAccentColor] = useState('#1d9bf0');

  // Update theme dynamically on accentColor change; derived states rely on CSS color-mix()
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);

  return [accentColor, setAccentColor] as const;
}
