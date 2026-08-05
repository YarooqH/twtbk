import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getMotionTransition } from '../../motion/presets';
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
  const reducedMotion = useReducedMotion();
  const toolbarTransition = getMotionTransition(Boolean(reducedMotion));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

  return (
    <AnimatePresence initial={false}>
      {selectedIds.size > 0 && (
        <motion.div
          className="multi-select-bar"
          role="toolbar"
          aria-label="Bulk bookmark actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={toolbarTransition}
        >
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
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '9999px',
            color: 'var(--text)',
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};