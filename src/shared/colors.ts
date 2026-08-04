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
