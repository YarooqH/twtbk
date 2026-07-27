import React, { useState } from 'react';
import { svgIcons } from '../icons';

interface InteractiveBarProps {
  saveMode: 'injected' | 'native-override';
  injectedPosition: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark';
  setInjectedPosition: (pos: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost') => void;
  nativeOverrideAction: 'replace' | 'arrow';
  accentColor: string;
}

export const InteractiveBar: React.FC<InteractiveBarProps> = ({
  saveMode, injectedPosition, setInjectedPosition, nativeOverrideAction, accentColor,
}) => {
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Fixed X action bar slots (order matters)
  type SlotId = 'leftmost' | 'reply' | 'retweet' | 'like' | 'views' | 'next-to-bookmark' | 'bookmark' | 'rightmost' | 'share';
  const slots: { id: SlotId; icon: React.ReactNode; label: string; isNative: boolean; clickable?: boolean }[] = [
    { id: 'leftmost',          icon: svgIcons.library,  label: 'Before reply',         isNative: false, clickable: true },
    { id: 'reply',             icon: svgIcons.reply,    label: 'Reply',                isNative: true },
    { id: 'retweet',           icon: svgIcons.retweet,  label: 'Repost',               isNative: true },
    { id: 'like',              icon: svgIcons.like,     label: 'Like',                 isNative: true },
    { id: 'views',             icon: svgIcons.views,    label: 'Views',                isNative: true },
    { id: 'bookmark',          icon: svgIcons.bookmark, label: 'Bookmark',             isNative: true },
    { id: 'next-to-bookmark',  icon: svgIcons.library,  label: 'After bookmark',       isNative: false, clickable: true },
    { id: 'share',             icon: svgIcons.share,    label: 'Share',                isNative: true },
    { id: 'rightmost',         icon: svgIcons.library,  label: 'After share (end)',    isNative: false, clickable: true },
  ];

  if (saveMode === 'native-override') {
    // Just show a static bar where Bookmark is highlighted (native override)
    const staticSlots = [
      { id: 'reply',    icon: svgIcons.reply,    isNative: true },
      { id: 'retweet',  icon: svgIcons.retweet,  isNative: true },
      { id: 'like',     icon: svgIcons.like,     isNative: true },
      { id: 'views',    icon: svgIcons.views,    isNative: true },
      { 
        id: 'bookmark', 
        icon: nativeOverrideAction === 'arrow' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {svgIcons.bookmark}
            <svg viewBox="0 0 24 24" style={{ width: '10px', height: '10px', fill: 'currentColor' }}><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>
          </div>
        ) : svgIcons.bookmark, 
        isNative: false 
      },
      { id: 'share',    icon: svgIcons.share,    isNative: true },
    ];
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>
          {nativeOverrideAction === 'arrow' ? 'An arrow will appear next to X\'s bookmark' : 'Clicking X\'s native bookmark opens our dialog'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 8px' }}>
          {staticSlots.map(s => (
            <span key={s.id} style={{ color: !s.isNative ? 'var(--accent)' : 'var(--text-muted)', opacity: !s.isNative ? 1 : 0.35, border: !s.isNative ? '1px dashed var(--accent)' : 'none', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // 7 positions mapped to slot indices in the bar
  const posToSlot: Record<string, number> = {
    'leftmost': 0,
    'after-reply': 1,
    'after-retweet': 2,
    'after-like': 3,
    'after-views': 4,
    'next-to-bookmark': 5,
    'rightmost': 6,
  };
  const currentSlot = posToSlot[injectedPosition] ?? 6;

  const nativeIcons = [
    { key: 'reply',    icon: svgIcons.reply },
    { key: 'retweet', icon: svgIcons.retweet },
    { key: 'like',    icon: svgIcons.like },
    { key: 'views',    icon: svgIcons.views },
    { key: 'bookmark',icon: svgIcons.bookmark },
    { key: 'share',   icon: svgIcons.share },
  ];

  const posLabel = injectedPosition === 'leftmost' ? 'Before Reply'
    : injectedPosition === 'after-reply' ? 'After Reply'
    : injectedPosition === 'after-retweet' ? 'After Repost'
    : injectedPosition === 'after-like' ? 'After Like'
    : injectedPosition === 'after-views' ? 'After Views'
    : injectedPosition === 'next-to-bookmark' ? 'After Bookmark'
    : 'After Share';

  const getSlotFromMouseX = (e: React.DragEvent<HTMLDivElement>): number => {
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const fraction = relX / rect.width;
    return Math.min(6, Math.max(0, Math.round(fraction * 6.5)));
  };

  const slotToPos = (slot: number): 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost' => {
    if (slot === 0) return 'leftmost';
    if (slot === 1) return 'after-reply';
    if (slot === 2) return 'after-retweet';
    if (slot === 3) return 'after-like';
    if (slot === 4) return 'after-views';
    if (slot === 5) return 'next-to-bookmark';
    return 'rightmost';
  };

  // Build the ordered list of cells: [zone0, native0, zone1, native1, ... native5, zone6]
  type Cell = { type: 'zone'; slotIdx: number } | { type: 'native'; icon: React.ReactNode; key: string };
  const cells: Cell[] = [];
  for (let i = 0; i < nativeIcons.length; i++) {
    cells.push({ type: 'zone', slotIdx: i });
    cells.push({ type: 'native', icon: nativeIcons[i].icon, key: nativeIcons[i].key });
  }
  cells.push({ type: 'zone', slotIdx: 6 });

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Draggable icon chip — icon only */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'library');
            e.dataTransfer.effectAllowed = 'move';
          }}
          title="Drag into the bar below to set position"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accentColor}20`,
            border: `2px solid var(--accent)`,
            color: 'var(--accent)',
            borderRadius: '8px',
            cursor: 'grab',
            userSelect: 'none',
            flexShrink: 0,
            transition: 'transform 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 5px ${accentColor}20`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          {svgIcons.library}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Bookmark Button</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Drag into bar below · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{posLabel}</span>
          </span>
        </div>
      </div>

      {/* X action bar — single container handles all drag events */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOver(getSlotFromMouseX(e));
        }}
        onDragLeave={(e) => {
          const bar = e.currentTarget as HTMLDivElement;
          const related = e.relatedTarget as Node | null;
          if (!related || !bar.contains(related)) {
            setDragOver(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const slot = getSlotFromMouseX(e);
          const pos = slotToPos(slot);
          setDragOver(null);
          setInjectedPosition(pos);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          background: 'var(--bg-secondary)',
          border: `1.5px solid ${dragOver !== null ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '14px',
          padding: '6px 4px',
          gap: '0',
          transition: 'border-color 0.15s',
          cursor: 'copy',
          userSelect: 'none',
        }}
      >
        {cells.map((cell, idx) => {
          if (cell.type === 'zone') {
            const isPlaced = currentSlot === cell.slotIdx && dragOver === null;
            const isHovered = dragOver === cell.slotIdx;
            const active = isPlaced || isHovered;
            return (
              <div
                key={`zone-${cell.slotIdx}`}
                onClick={() => setInjectedPosition(slotToPos(cell.slotIdx))}
                style={{
                  flex: active ? '0 0 32px' : '0 0 12px',
                  height: '30px',
                  borderRadius: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isHovered
                    ? `2px dashed var(--accent)`
                    : isPlaced
                      ? `2px solid var(--accent)`
                      : '2px solid transparent',
                  background: active ? `${accentColor}18` : 'transparent',
                  color: 'var(--accent)',
                  transition: 'flex 0.18s cubic-bezier(0.34,1.56,0.64,1), border-color 0.12s, background 0.12s',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  flexShrink: 0,
                }}
              >
                {active && (
                  <div style={{
                    opacity: isHovered ? 0.55 : 1,
                    transition: 'opacity 0.12s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isHovered ? 'scale(0.9)' : 'scale(1)',
                  }}>
                    {svgIcons.library}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div
                key={cell.key}
                style={{
                  flex: '0 0 auto',
                  width: '26px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  opacity: 0.38,
                  pointerEvents: 'none',
                }}
              >
                {cell.icon}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};
