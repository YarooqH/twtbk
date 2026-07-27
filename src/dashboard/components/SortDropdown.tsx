import React, { useState, useRef, useEffect } from 'react';
import { SortOption } from '../Dashboard';

interface SortDropdownProps {
  sortOrder: SortOption;
  setSortOrder: (val: SortOption) => void;
}

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'Saved (Newest)' },
  { id: 'oldest', label: 'Saved (Oldest)' },
  { id: 'posted-newest', label: 'Posted (Newest)' },
  { id: 'posted-oldest', label: 'Posted (Oldest)' },
  { id: 'author', label: 'Author (A-Z)' },
];

export const SortDropdown: React.FC<SortDropdownProps> = ({ sortOrder, setSortOrder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentLabel = sortOptions.find(opt => opt.id === sortOrder)?.label || 'Saved (Newest)';

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-secondary)',
          color: 'var(--text)',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'background 0.15s, border-color 0.15s',
          userSelect: 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
      >
        <span>Sort: {currentLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            color: 'var(--text-muted)'
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 1000,
            minWidth: '180px',
            background: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '6px 0',
            fontFamily: 'inherit',
            animation: 'twtbk-scale-up 0.15s ease-out'
          }}
        >
          {sortOptions.map(opt => {
            const isSelected = sortOrder === opt.id;
            return (
              <div
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOrder(opt.id);
                  setIsOpen(false);
                }}
                style={{
                  padding: '9px 16px',
                  fontSize: '13.5px',
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  transition: 'background 0.12s'
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--accent-light)' : 'transparent';
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
