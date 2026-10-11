import { categoryColors, getCategoryColor, getAccessibleTextColor, getContrastTextColor } from '../shared/colors';

const getInitials = (name: string) => name?.trim()?.charAt(0)?.toUpperCase() || '?';

const formatDate = (date: Date | string | undefined) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
};

const formatRelativeTime = (date: Date | string | undefined) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(d);
};

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function calculateBookmarksStorageSize(bookmarks?: any[]): number {
  if (!bookmarks || bookmarks.length === 0) return 0;
  try {
    const jsonStr = JSON.stringify(bookmarks);
    return new Blob([jsonStr]).size;
  } catch {
    return 0;
  }
}

export type SlotId = 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost';

export { getInitials, categoryColors, getCategoryColor, getAccessibleTextColor, getContrastTextColor, formatDate, formatRelativeTime };
