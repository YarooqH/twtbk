import React from 'react';
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
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => {
              setSaveMode('injected');
              chrome.storage?.sync?.set({ saveMode: 'injected' });
            }}
            style={{
              flex: 1,
              background: saveMode === 'injected' ? 'var(--accent)' : 'transparent',
              color: saveMode === 'injected' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            Injected
          </button>
          <button
            onClick={() => {
              setSaveMode('native-override');
              chrome.storage?.sync?.set({ saveMode: 'native-override' });
            }}
            style={{
              flex: 1,
              background: saveMode === 'native-override' ? 'var(--accent)' : 'transparent',
              color: saveMode === 'native-override' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            Override Native
          </button>
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
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => {
                setNativeOverrideAction('replace');
                chrome.storage?.sync?.set({ nativeOverrideAction: 'replace' });
              }}
              style={{
                flex: 1,
                background: nativeOverrideAction === 'replace' ? 'var(--accent)' : 'transparent',
                color: nativeOverrideAction === 'replace' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              Replace Click
            </button>
            <button
              onClick={() => {
                setNativeOverrideAction('arrow');
                chrome.storage?.sync?.set({ nativeOverrideAction: 'arrow' });
              }}
              style={{
                flex: 1,
                background: nativeOverrideAction === 'arrow' ? 'var(--accent)' : 'transparent',
                color: nativeOverrideAction === 'arrow' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              Add Arrow Dropdown
            </button>
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
