import { categoryColors, getCategoryColor } from '../shared/colors';

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

export type SlotId = 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost';

export { getInitials, categoryColors, getCategoryColor, formatDate, formatRelativeTime };
