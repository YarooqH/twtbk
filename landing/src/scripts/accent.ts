// Accent color picker for the landing page: the same presets as the XMarks
// dashboard. Sets the accent CSS variables on <html>, remembers the choice for
// this visitor, and tells the dot shaders to recolor.

export const ACCENTS = [
  { name: 'Blue', value: '#1d9bf0' },
  { name: 'Green', value: '#00ba7c' },
  { name: 'Pink', value: '#f91880' },
  { name: 'Purple', value: '#7856ff' },
  { name: 'Orange', value: '#ff7a00' },
  { name: 'Teal', value: '#00c4b6' },
  { name: 'Yellow', value: '#ffd400' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Monochrome', value: 'monochrome' },
] as const;

export const ACCENT_EVENT = 'xmarks:accent';
// Read by the inline script in index.astro before first paint.
export const ACCENT_STORAGE_KEY = 'xmarks-accent';

const MONO = '#e7e9ea';

function luminance(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Text color on an accent. Same rule as the extension (src/shared/colors.ts). */
function contrastText(accent: string) {
  // X's own blue keeps white text to match X's buttons, although it is only 3.0:1.
  if (accent.toLowerCase() === '#1d9bf0') return '#ffffff';
  // Use whichever of black or white contrasts more; they tie at luminance ~0.179.
  return luminance(accent) > 0.179 ? '#000000' : '#ffffff';
}

/** Accent, readable text on it, and a 15% tint. */
export function accentVars(value: string) {
  const accent = value === 'monochrome' ? MONO : value;
  return {
    '--accent': accent,
    '--accent-contrast': contrastText(accent),
    '--accent-soft': `${accent}26`,
  };
}

export function applyAccent(value: string) {
  const vars = accentVars(value);
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify({ value, vars }));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the choice just won't stick.
  }
  window.dispatchEvent(new CustomEvent(ACCENT_EVENT, { detail: value }));
}

export function currentAccent(): string {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCENT_STORAGE_KEY) ?? 'null');
    if (saved && ACCENTS.some((a) => a.value === saved.value)) return saved.value;
  } catch {
    // fall through to the default
  }
  return ACCENTS[0].value;
}
