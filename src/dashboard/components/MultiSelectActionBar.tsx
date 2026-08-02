import React from 'react';
import { db } from '../../db';
import { Dropdown } from './Dropdown';

interface MultiSelectActionBarProps {
  selectedIds: Set<string>;
  clearSelection: () => void;
  categories: any[];
}

export const MultiSelectActionBar: React.FC<MultiSelectActionBarProps> = ({ selectedIds, clearSelection, categories }) => {
  if (selectedIds.size === 0) return null;

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} bookmarks?`)) {
      await db.bookmarks.bulkDelete(Array.from(selectedIds));
      clearSelection();
    }
  };

  const handleCategorize = async (catId: string | null) => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => 
      db.bookmarks.update(id, { categoryIds: catId ? [catId] : [] })
    ));
    clearSelection();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      borderRadius: 'var(--radius-full)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 1000,
      color: 'var(--text)'
    }}>
      <span style={{ fontWeight: 600, fontSize: '14px' }}>{selectedIds.size} selected</span>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <Dropdown
          align="left"
          trigger={<span style={{ fontSize: '13px', fontWeight: 600 }}>Categorize ▾</span>}
          triggerClassName="btn"
          triggerStyle={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px' }}
          items={[
            {
              id: 'no-cat',
              label: 'No Category',
              onClick: () => handleCategorize(null)
            },
            ...(categories || []).map(cat => ({
              id: cat.id,
              label: cat.name,
              onClick: () => handleCategorize(cat.id)
            }))
          ]}
        />
        
        <button 
          onClick={handleDelete}
          className="btn"
          style={{ padding: '6px 12px', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--danger)', border: '1px solid rgba(255, 60, 60, 0.2)', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}
        >
          Delete
        </button>
        
        <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
        
        <button 
          onClick={clearSelection}
          className="btn"
          style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
