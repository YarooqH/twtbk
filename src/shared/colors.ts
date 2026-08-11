export const CATEGORY_PALETTE = [
  '#1d9bf0', // Blue
  '#00ba7c', // Green
  '#f91880', // Pink/Magenta
  '#7856ff', // Purple
  '#ff7a00', // Orange
  '#00c4b6', // Cyan/Teal
  '#ffd400', // Yellow
  '#ef4444', // Red
] as const;

export const categoryColors = CATEGORY_PALETTE;

export function getCategoryColor(id: string, color?: string): string {
  if (color) return color;
  if (!id) return CATEGORY_PALETTE[0];
  const charCode = id.charCodeAt(id.length - 1);
  return CATEGORY_PALETTE[charCode % CATEGORY_PALETTE.length];
}

export function getLuminance(hex: string): number {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return 0.5;

  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;

  const sRGB = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return sRGB[0] * 0.2126 + sRGB[1] * 0.7152 + sRGB[2] * 0.0722;
}

export function isDarkModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getContrastTextColor(color: string, isDark?: boolean): string {
  if (!color) return '#ffffff';

  const isDarkMode = isDark ?? isDarkModeActive();

  if (color === 'monochrome') {
    return isDarkMode ? '#000000' : '#ffffff';
  }

  if (color.startsWith('rgb') || color.startsWith('hsl')) {
    return isDarkMode ? '#ffffff' : '#000000';
  }

  const luminance = getLuminance(color);
  return luminance > 0.45 ? '#000000' : '#ffffff';
}

export function applyAccentVariables(color: string) {
  if (typeof document === 'undefined' || !document.documentElement) return;

  const isDarkMode = isDarkModeActive();
  const contrast = getContrastTextColor(color, isDarkMode);

  if (color === 'monochrome') {
    document.documentElement.style.setProperty('--accent', 'var(--text)');
    document.documentElement.style.setProperty('--accent-hover', 'var(--text)');
    document.documentElement.style.setProperty('--accent-light', 'color-mix(in srgb, var(--text) 15%, transparent)');
  } else {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-hover', color);
    document.documentElement.style.setProperty('--accent-light', color + '14');
  }

  document.documentElement.style.setProperty('--accent-contrast', contrast);
  document.documentElement.style.setProperty('--logo-filter', contrast === '#000000' ? 'brightness(0)' : 'none');
}
