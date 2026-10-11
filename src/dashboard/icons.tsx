import React from 'react';
import { XMARKS_MARK_PATH, XMARKS_MARK_VIEWBOX } from '../shared/logo';

export const BookmarkIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>
  </svg>
);

export const MoreHorizontalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
  </svg>
);

export const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

export const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

export const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
  </svg>
);

export const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
  </svg>
);

export const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

export const AllIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

export const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);

export const TuneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="8" cy="6" r="2" fill="var(--bg)" />
    <circle cx="16" cy="12" r="2" fill="var(--bg)" />
    <circle cx="10" cy="18" r="2" fill="var(--bg)" />
  </svg>
);

export const SortIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M3 6h18M7 12h10M11 18h2"/>
  </svg>
);

export const InfoIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export const SunIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const MoonIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const SystemIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export const svgIcons = {
  reply: (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.492c4.419 0 8.005 3.58 8.005 8 0 4.42-3.586 8.01-8.005 8.01h-2.297L7.099 21.84c-.422.286-.966.305-1.407.05-.442-.257-.714-.726-.714-1.237v-2.65c-2.986-.316-5.227-2.86-5.227-6.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 2.94 2.124 5.38 4.962 5.89l.802.14v3.13l3.774-2.52c.287-.193.626-.29.972-.29h1.701c3.316 0 6.005-2.69 6.005-6 0-3.31-2.689-6-6.005-6H9.756z"/>
    </svg>
  ),
  retweet: (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48L.068 8.02L4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93l1.364 1.46l-4.432 4.14l-4.432-4.14l1.364-1.46l2.068 1.93V8c0-1.1-.896-2-2-2z"/>
    </svg>
  ),
  like: (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
      <path d="M16.697 5.5c-1.222-.06-2.679.69-3.894 1.86L12 8.122l-.803-.762c-1.215-1.17-2.672-1.92-3.894-1.86c-2.348.11-4.303 2.14-4.303 4.584c0 3.253 4.804 7.664 8.761 10.974c.123.104.28.163.44.163s.316-.059.44-.163c3.957-3.31 8.761-7.721 8.761-10.974c0-2.444-1.955-4.475-4.303-4.584zm-4.332 13.064c-3.155-2.664-7.365-6.524-7.365-8.98c0-1.455 1.155-2.666 2.535-2.732c.866-.04 1.942.54 2.827 1.41L12 9.944l1.638-1.682c.885-.87 1.961-1.45 2.827-1.41c1.38.066 2.535 1.277 2.535 2.732c0 2.456-4.21 6.316-7.365 8.98z"/>
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
      <path d="M4 4.5C4 3.12 5.12 2 6.5 2h11C18.88 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.28 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.22-.5-.5-.5h-11z"/>
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.25 }}>
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41L7.71 9.71 6.3 8.29 12 2.59zM21 11v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-9h2v9h14v-9h2z"/>
    </svg>
  ),
  views: (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
      <path d="M8.75 21V3h2v18h-2zM18 21V11h2v10h-2zM3 21v-6h2v6H3z"/>
    </svg>
  ),
};

// The XMarks mark. In the wordmark it stands in for the "X" of XMarks.
export const XMarksMark = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox={XMARKS_MARK_VIEWBOX} aria-hidden="true">
    <path fill="currentColor" d={XMARKS_MARK_PATH} />
  </svg>
);
