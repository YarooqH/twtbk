import React from 'react';
import { DownloadIcon, TrashIcon } from '../icons';
import { Dropdown } from './Dropdown';

interface MultiSelectActionBarProps {
  selectedIds: Set<string>;
  visibleIds: string[];
  clearSelection: () => void;
  selectAllVisible: () => void;
  exportSelected: () => void;
  requestDelete: () => void;
  categories: any[];
  onCategorize: (categoryId: string | null) => Promise<void>;
  hiddenSelectedCount?: number;
  isBusy?: boolean;
}

export const MultiSelectActionBar: React.FC<MultiSelectActionBarProps> = ({
  selectedIds,
  visibleIds,
  clearSelection,
  selectAllVisible,
  exportSelected,
  requestDelete,
  categories,
  onCategorize,
  hiddenSelectedCount = 0,
  isBusy = false,
}) => {
  if (selectedIds.size === 0) return null;

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

  return (
    <div className="multi-select-bar" role="toolbar" aria-label="Bulk bookmark actions">
      <div className="multi-select-summary">
        <span className="multi-select-count" aria-live="polite">
          {selectedIds.size}
        </span>
        <span>{selectedIds.size === 1 ? 'bookmark selected' : 'bookmarks selected'}</span>
        {hiddenSelectedCount > 0 && (
          <span className="multi-select-hidden-count">· {hiddenSelectedCount} hidden</span>
        )}
      </div>

      <div className="multi-select-divider" aria-hidden="true" />

      <button
        type="button"
        className="bulk-toolbar-btn bulk-toolbar-btn-secondary"
        onClick={allVisibleSelected ? clearSelection : selectAllVisible}
        disabled={visibleIds.length === 0 || isBusy}
      >
        {allVisibleSelected ? 'Clear visible' : 'Select visible'}
      </button>

      <div className="multi-select-actions">
        <Dropdown
          align="left"
          dropUp
          trigger={<span>Categorize <span aria-hidden="true">▾</span></span>}
          triggerClassName="bulk-toolbar-btn bulk-toolbar-btn-secondary"
          className="multi-select-category"
          disabled={isBusy}
          triggerStyle={{
            opacity: isBusy ? 0.55 : 1,
            minHeight: '36px',
            padding: '0 14px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '9999px',
            color: '#f1f5f9',
            font: 'inherit',
            fontSize: '13px',
            fontWeight: 600,
          }}
          items={[
            {
              id: 'no-cat',
              label: 'No Category',
              onClick: () => onCategorize(null)
            },
            ...(categories || []).map(cat => ({
              id: cat.id,
              label: cat.name,
              onClick: () => onCategorize(cat.id)
            }))
          ]}
        />

        <button type="button" className="bulk-toolbar-btn bulk-toolbar-btn-secondary" onClick={exportSelected} disabled={isBusy}>
          <DownloadIcon />
          <span>Export</span>
        </button>

        <button type="button" className="bulk-toolbar-btn bulk-toolbar-btn-danger" onClick={requestDelete} disabled={isBusy}>
          <TrashIcon />
          <span>Delete</span>
        </button>
      </div>

      <button
        type="button"
        className="bulk-toolbar-close"
        onClick={clearSelection}
        disabled={isBusy}
        aria-label="Clear bookmark selection"
        title="Clear selection"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
};