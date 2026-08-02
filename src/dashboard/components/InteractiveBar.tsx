import React, { useRef, useState, useLayoutEffect } from 'react';
import { svgIcons } from '../icons';

type InjectedPosition =
  | 'leftmost'
  | 'after-reply'
  | 'after-retweet'
  | 'after-like'
  | 'after-views'
  | 'next-to-bookmark'
  | 'rightmost';

interface InteractiveBarProps {
  saveMode: 'injected' | 'native-override';
  injectedPosition: InjectedPosition;
  setInjectedPosition: (pos: InjectedPosition) => void;
  nativeOverrideAction: 'replace' | 'arrow';
  accentColor: string;
}

const posToSlot: Record<InjectedPosition, number> = {
  'leftmost': 0,
  'after-reply': 1,
  'after-retweet': 2,
  'after-like': 3,
  'after-views': 4,
  'next-to-bookmark': 5,
  'rightmost': 6,
};

const slotToPos = (slot: number): InjectedPosition => {
  const map: InjectedPosition[] = [
    'leftmost',
    'after-reply',
    'after-retweet',
    'after-like',
    'after-views',
    'next-to-bookmark',
    'rightmost',
  ];
  return map[Math.min(6, Math.max(0, slot))];
};

const POS_LABELS: Record<InjectedPosition, string> = {
  'leftmost': 'Before Reply',
  'after-reply': 'After Reply',
  'after-retweet': 'After Repost',
  'after-like': 'After Like',
  'after-views': 'After Views',
  'next-to-bookmark': 'After Bookmark',
  'rightmost': 'After Share',
};

const NATIVE_ICONS = [
  { key: 'reply', label: 'Reply' },
  { key: 'retweet', label: 'Repost' },
  { key: 'like', label: 'Like' },
  { key: 'views', label: 'Views' },
  { key: 'bookmark', label: 'Bookmark' },
  { key: 'share', label: 'Share' },
] as const;

export const InteractiveBar: React.FC<InteractiveBarProps> = ({
  saveMode,
  injectedPosition,
  setInjectedPosition,
  nativeOverrideAction,
  accentColor,
}) => {
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragDataType = 'application/x-twtbk-bookmark-button';

  const isTwtbkDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes(dragDataType);

  // ── FLIP animation refs — must be declared unconditionally (Rules of Hooks) ──
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());

  // ── Injected mode: slot computation (safe to compute always) ──────────────
  const activeSlot = saveMode === 'injected' ? (posToSlot[injectedPosition] ?? 5) : 0;
  const previewSlot = dragOver !== null ? dragOver : activeSlot;

  // Build slotsData only relevant for injected mode, but compute it always so
  // hook order stays stable across mode switches
  const slotsData: Array<{ id: string; isButton: boolean; iconKey?: string }> = [];
  if (saveMode === 'injected') {
    let nativeIdx = 0;
    for (let slot = 0; slot < 7; slot++) {
      if (slot === previewSlot) {
        slotsData.push({ id: 'button', isButton: true });
      } else {
        const iconKey = NATIVE_ICONS[nativeIdx++].key;
        slotsData.push({ id: iconKey, isButton: false, iconKey });
      }
    }
  }

  useLayoutEffect(() => {
    if (saveMode !== 'injected') return;
    const prevRects = prevRectsRef.current;
    const nextRects = new Map<string, DOMRect>();
    cellRefs.current.forEach((el, id) => nextRects.set(id, el.getBoundingClientRect()));

    cellRefs.current.forEach((el, id) => {
      const prev = prevRects.get(id);
      const next = nextRects.get(id);
      if (!prev || !next) return;
      const dx = prev.left - next.left;
      if (Math.abs(dx) < 1) return;

      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px)`;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.getBoundingClientRect(); // force reflow
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.transform = 'translateX(0)';
      });
    });

    prevRectsRef.current = nextRects;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSlot, saveMode]);

  // ── Native-override mode: static display ─────────────────────────────────
  if (saveMode === 'native-override') {
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>
          {nativeOverrideAction === 'arrow'
            ? "An arrow will appear next to X's bookmark"
            : "Clicking X's native bookmark opens our dialog"}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '10px 8px',
        }}>
          {NATIVE_ICONS.map(({ key }) => {
            const isHighlighted = key === 'bookmark';
            return (
              <span key={key} style={{
                color: isHighlighted ? 'var(--accent)' : 'var(--text-muted)',
                opacity: isHighlighted ? 1 : 0.35,
                border: isHighlighted ? '1px dashed var(--accent)' : 'none',
                padding: '4px', borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {key === 'bookmark' && nativeOverrideAction === 'arrow' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {svgIcons.bookmark}
                    <svg viewBox="0 0 24 24" style={{ width: '10px', height: '10px', fill: 'currentColor' }}>
                      <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                    </svg>
                  </div>
                ) : svgIcons[key]}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Injected mode render ──────────────────────────────────────────────────

  const getSlotFromMouseX = (e: React.DragEvent<HTMLDivElement>): number => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const fraction = relX / rect.width;
    return Math.min(6, Math.max(0, Math.floor(fraction * 7)));
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Draggable bookmark chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(dragDataType, 'bookmark-button');
            e.dataTransfer.setData('text/plain', 'twtbk-bookmark-button');
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => setDragOver(null)}
          title="Drag into the bar below to set position"
          style={{
            width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
            Bookmark Button
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Drag into bar below ·{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {POS_LABELS[injectedPosition]}
            </span>
          </span>
        </div>
      </div>

      {/* Action Bar Container */}
      <div
        onDragOver={(e) => {
          if (!isTwtbkDrag(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const slot = getSlotFromMouseX(e);
          setDragOver(slot);
        }}
        onDragLeave={(e) => {
          const related = e.relatedTarget as Node | null;
          if (!related || !e.currentTarget.contains(related)) {
            setDragOver(null);
          }
        }}
        onDrop={(e) => {
          if (!isTwtbkDrag(e)) return;
          e.preventDefault();
          const slot = getSlotFromMouseX(e);
          setDragOver(null);
          setInjectedPosition(slotToPos(slot));
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--bg-secondary)',
          border: `1.5px solid ${dragOver !== null ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '14px',
          padding: '6px 8px',
          gap: '2px',
          transition: 'border-color 0.15s',
          cursor: dragOver !== null ? 'copy' : 'default',
          userSelect: 'none',
        }}
      >
        {slotsData.map((slotItem, slotIdx) => {
          const isDragging = dragOver !== null;
          const isCommittedPlaced = slotItem.isButton && !isDragging;
          const isPreviewPlaced = slotItem.isButton && isDragging;

          return (
            <div
              key={slotItem.id}
              ref={el => {
                if (el) cellRefs.current.set(slotItem.id, el);
                else cellRefs.current.delete(slotItem.id);
              }}
              onClick={() => setInjectedPosition(slotToPos(slotIdx))}
              style={{
                flex: '1 1 0%',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: '2px solid transparent',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {isCommittedPlaced ? (
                <div
                  key={`placed-${injectedPosition}`}
                  title={`Placed: ${POS_LABELS[injectedPosition]}`}
                  className="twtbk-slot-pop"
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${accentColor}22`,
                    border: `1.5px solid var(--accent)`,
                    color: 'var(--accent)',
                    boxShadow: `0 0 6px ${accentColor}30`,
                  }}
                >
                  {svgIcons.library}
                </div>
              ) : isPreviewPlaced ? (
                <div
                  title="Drop to place here"
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${accentColor}14`,
                    border: `1.5px dashed var(--accent)`,
                    color: 'var(--accent)',
                    opacity: 0.75,
                  }}
                >
                  {svgIcons.library}
                </div>
              ) : slotItem.iconKey ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', opacity: 0.38,
                }}>
                  {svgIcons[slotItem.iconKey as keyof typeof svgIcons]}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
