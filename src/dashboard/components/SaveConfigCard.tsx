import React from 'react';
import { motion } from 'motion/react';
import { InteractiveBar } from './InteractiveBar';
import { InfoTooltip } from './InfoTooltip';

interface SaveConfigCardProps {
  saveMode: 'injected' | 'native-override';
  setSaveMode: (val: 'injected' | 'native-override') => void;
  injectedPosition: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark';
  setInjectedPosition: (pos: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost') => void;
  nativeOverrideAction: 'replace' | 'arrow';
  setNativeOverrideAction: (val: 'replace' | 'arrow') => void;
  buttonAlignment: 'left' | 'center' | 'right';
  setButtonAlignment: (val: 'left' | 'center' | 'right') => void;
  alsoSaveNative: boolean;
  setAlsoSaveNative: (val: boolean) => void;
  accentColor: string;
}

export const SaveConfigCard: React.FC<SaveConfigCardProps> = ({
  saveMode, setSaveMode, injectedPosition, setInjectedPosition,
  nativeOverrideAction, setNativeOverrideAction,
  buttonAlignment, setButtonAlignment,
  alsoSaveNative, setAlsoSaveNative,
  accentColor,
}) => {
  return (
    <div className="settings-card">
      <div className="settings-card-title">Save Configuration</div>
      
      <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '4px' }}>
        <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
          SAVE MODE
          <InfoTooltip text="Injected adds a custom XMarks button; Override integrates into X's native bookmark icon." />
        </span>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)', position: 'relative' }}>
          {[
            { id: 'injected', label: 'Injected' },
            { id: 'native-override', label: 'Override Native' },
          ].map(mode => {
            const isActive = saveMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  const val = mode.id as 'injected' | 'native-override';
                  setSaveMode(val);
                  chrome.storage?.sync?.set({ saveMode: val });
                }}
                style={{
                  flex: 1,
                  position: 'relative',
                  background: 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  zIndex: 1,
                  transition: 'color 0.15s',
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="save-mode-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--bg)',
                      borderRadius: 'var(--radius-full)',
                      boxShadow: 'var(--shadow-sm)',
                      border: '1px solid var(--border-strong)',
                      zIndex: -1,
                    }}
                  />
                )}
                {mode.label}
              </button>
            );
          })}
        </div>
        <p className="save-mode-help">
          {saveMode === 'injected'
            ? 'Adds a separate XMarks save button beside X controls.'
            : 'Uses X’s bookmark action to save a copy into XMarks.'}
        </p>
        <InteractiveBar saveMode={saveMode} injectedPosition={injectedPosition} setInjectedPosition={setInjectedPosition} nativeOverrideAction={nativeOverrideAction} accentColor={accentColor} />
      </div>

      {saveMode === 'native-override' && (
        <div className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '4px' }}>
          <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
            OVERRIDE ACTION
            <InfoTooltip text="Choose whether native bookmark click saves directly or shows a category dropdown arrow." />
          </span>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)', position: 'relative' }}>
            {[
              { id: 'replace', label: 'Replace Click' },
              { id: 'arrow', label: 'Add Arrow Dropdown' },
            ].map(action => {
              const isActive = nativeOverrideAction === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    const val = action.id as 'replace' | 'arrow';
                    setNativeOverrideAction(val);
                    chrome.storage?.sync?.set({ nativeOverrideAction: val });
                  }}
                  style={{
                    flex: 1,
                    position: 'relative',
                    background: 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    zIndex: 1,
                    transition: 'color 0.15s',
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="override-action-pill"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--bg)',
                        borderRadius: 'var(--radius-full)',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--border-strong)',
                        zIndex: -1,
                      }}
                    />
                  )}
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {saveMode === 'injected' && (
        <div className="toggle-row" style={{ marginBottom: '0px' }}>
          <span className="toggle-label" style={{ fontSize: '13px', display: 'flex', alignItems: 'center' }}>
            Also Save Native Bookmarks
            <InfoTooltip text="Automatically saves the tweet to your official X bookmarks when saving in XMarks." />
          </span>
          <label className="toggle-switch">
            <input type="checkbox" checked={alsoSaveNative} onChange={(e) => setAlsoSaveNative(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
      )}
    </div>
  );
};
