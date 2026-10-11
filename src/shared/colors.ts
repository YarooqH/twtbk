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

export function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (!color) return null;
  const c = color.trim().toLowerCase();

  if (c === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (c === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map(x => x + x).join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  // rgb / rgba
  const rgbMatch = c.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: Math.round(parseFloat(rgbMatch[1])),
      g: Math.round(parseFloat(rgbMatch[2])),
      b: Math.round(parseFloat(rgbMatch[3])),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // hsl / hsla
  const hslMatch = c.match(/hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const a = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        let val = t;
        if (val < 0) val += 1;
        if (val > 1) val -= 1;
        if (val < 1 / 6) return p + (q - p) * 6 * val;
        if (val < 1 / 2) return q;
        if (val < 2 / 3) return p + (q - p) * (2 / 3 - val) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
  }

  return null;
}

export function getLuminance(color: string): number {
  const parsed = parseColor(color);
  if (!parsed) return 0.5;

  const r = parsed.r / 255;
  const g = parsed.g / 255;
  const b = parsed.b / 255;

  const sRGB = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return sRGB[0] * 0.2126 + sRGB[1] * 0.7152 + sRGB[2] * 0.0722;
}

export function isDarkModeActive(): boolean {
  if (typeof document === 'undefined') return false;

  // 1. Check explicit data-theme attribute on documentElement or body
  const theme = document.documentElement.getAttribute('data-theme') || document.body?.getAttribute('data-theme');
  if (theme === 'dark') return true;
  if (theme === 'light') return false;

  // 2. Check document.body computed background color (crucial for X.com which sets rgb(0, 0, 0) or rgb(21, 32, 43))
  if (typeof window !== 'undefined' && document.body) {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      const lum = getLuminance(bg);
      return lum < 0.45;
    }
  }

  // 3. Fallback to system preference
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getContrastTextColor(color: string, isDark?: boolean): string {
  if (!color) return '#ffffff';

  const isDarkMode = isDark ?? isDarkModeActive();

  if (color === 'monochrome') {
    // In dark mode: monochrome accent is white, so text on it must be black (#000000).
    // In light mode: monochrome accent is black, so text on it must be white (#ffffff).
    return isDarkMode ? '#000000' : '#ffffff';
  }

  // X's own blue keeps white text to match X's buttons, although it is only 3.0:1.
  const parsed = parseColor(color);
  if (parsed && parsed.r === 29 && parsed.g === 155 && parsed.b === 240) return '#ffffff';

  // Use whichever of black or white contrasts more; they tie at luminance ~0.179.
  return getLuminance(color) > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Ensures text color is comfortably readable on top of light or dark surfaces.
 * For example, bright yellow (#ffd400) or teal (#00c4b6) as text on white backgrounds
 * gets darkened to high-contrast shades (WCAG AA compliant).
 */
export function getAccessibleTextColor(color: string, isDark?: boolean): string {
  if (!color) return isDark ? '#ffffff' : '#000000';
  const isDarkMode = isDark ?? isDarkModeActive();

  const parsed = parseColor(color);
  if (!parsed) return color;

  const lum = getLuminance(color);

  if (!isDarkMode) {
    // On light background: if color is light (e.g. yellow, cyan, light green), darken it
    if (lum > 0.38) {
      const factor = lum > 0.6 ? 0.45 : 0.65;
      const r = Math.round(parsed.r * factor);
      const g = Math.round(parsed.g * factor);
      const b = Math.round(parsed.b * factor);
      return `rgb(${r}, ${g}, ${b})`;
    }
  } else {
    // On dark background: if color is very dark (e.g. navy), lighten it
    if (lum < 0.15) {
      const r = Math.min(255, Math.round(parsed.r + (255 - parsed.r) * 0.5));
      const g = Math.min(255, Math.round(parsed.g + (255 - parsed.g) * 0.5));
      const b = Math.min(255, Math.round(parsed.b + (255 - parsed.b) * 0.5));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  return color;
}

export function applyAccentVariables(color: string) {
  if (typeof document === 'undefined' || !document.documentElement) return;

  const isDarkMode = isDarkModeActive();
  const contrast = getContrastTextColor(color, isDarkMode);

  if (color === 'monochrome') {
    document.documentElement.style.setProperty('--accent', isDarkMode ? '#ffffff' : '#0f1419');
    document.documentElement.style.setProperty('--accent-hover', isDarkMode ? '#e7e9ea' : '#1e2732');
    document.documentElement.style.setProperty('--accent-light', isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 20, 25, 0.1)');
  } else {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-hover', color);
    document.documentElement.style.setProperty('--accent-light', color + '14');
  }

  document.documentElement.style.setProperty('--accent-contrast', contrast);
  document.documentElement.style.setProperty('--logo-filter', contrast === '#000000' ? 'brightness(0)' : 'none');
}
