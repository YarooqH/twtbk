import React, { useState, useEffect } from 'react';

export const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? to toggle
      if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        style={{
          background: 'var(--bg-primary)', padding: '24px', borderRadius: '16px',
          minWidth: '320px', border: '1px solid var(--border)', color: 'var(--text)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Keyboard Shortcuts</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <ShortcutRow label="Search" shortcut={['/']} />
          <ShortcutRow label="Edit Note" shortcut={['e']} />
          <ShortcutRow label="New Category" shortcut={['c']} />
          <ShortcutRow label="Go to All Bookmarks" shortcut={['g', 'a']} sequence />
          
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <ShortcutRow label="Toggle this menu" shortcut={['?']} />
          </div>
        </div>
      </div>
    </div>
  );
};

function ShortcutRow({ label, shortcut, sequence = false }: { label: string, shortcut: string[], sequence?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px' }}>{label}</span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {shortcut.map((key, i) => (
          <React.Fragment key={i}>
            {i > 0 && sequence && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>then</span>}
            <kbd 
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border)',
                padding: '2px 8px', 
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 600,
                color: 'var(--text)'
              }}
            >
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
