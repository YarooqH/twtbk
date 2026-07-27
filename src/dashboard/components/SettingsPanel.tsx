import React from 'react';
import { SettingsIcon, svgIcons } from '../icons';
import { categoryColors } from '../helpers';
import { SaveConfigCard } from './SaveConfigCard';
import { AICard } from './AICard';

interface SettingsPanelProps {
  settingsExpanded: boolean;
  setSettingsExpanded: (val: boolean) => void;
  mobileSettingsOpen?: boolean;
  setMobileSettingsOpen?: (val: boolean) => void;
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
  setAccentColor: (c: string) => void;
  autoCategorize: boolean;
  toggleAutoCategorize: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isModelLoaded: boolean;
  modelProgress: number | null;
  isClassifying: boolean;
  classifyProgress: { current: number; total: number } | null;
  runAutoCategorizeJobs: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settingsExpanded, setSettingsExpanded,
  mobileSettingsOpen, setMobileSettingsOpen,
  saveMode, setSaveMode,
  injectedPosition, setInjectedPosition,
  nativeOverrideAction, setNativeOverrideAction,
  buttonAlignment, setButtonAlignment,
  alsoSaveNative, setAlsoSaveNative,
  accentColor, setAccentColor,
  autoCategorize, toggleAutoCategorize,
  isModelLoaded, modelProgress,
  isClassifying, classifyProgress, runAutoCategorizeJobs,
}) => {
  return (
    <>
      {mobileSettingsOpen && setMobileSettingsOpen && (
        <div className="settings-backdrop" onClick={() => setMobileSettingsOpen(false)} />
      )}
      <aside className={`settings-sidebar ${mobileSettingsOpen ? 'open' : ''}`}>
      <div style={{
        display: 'grid',
        gridTemplateRows: settingsExpanded ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.25s ease-out, opacity 0.25s ease-out',
        opacity: settingsExpanded ? 1 : 0,
        overflow: 'hidden',
        width: '100%'
      }}>
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '12px' }}>
          {/* Card 1: Configuration */}
          <SaveConfigCard
            saveMode={saveMode} setSaveMode={setSaveMode}
            injectedPosition={injectedPosition} setInjectedPosition={setInjectedPosition}
            nativeOverrideAction={nativeOverrideAction} setNativeOverrideAction={setNativeOverrideAction}
            buttonAlignment={buttonAlignment} setButtonAlignment={setButtonAlignment}
            alsoSaveNative={alsoSaveNative} setAlsoSaveNative={setAlsoSaveNative}
            accentColor={accentColor}
          />

          {/* Card 2: Theme / Accent */}
          <div className="settings-card">
            <div className="settings-card-title">Personalization</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>ACCENT COLOR</span>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                {categoryColors.map(color => (
                  <span
                    key={color}
                    onClick={() => {
                      setAccentColor(color);
                      chrome.storage?.sync?.set({ accentColor: color });
                    }}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: color,
                      cursor: 'pointer',
                      border: accentColor === color ? '2px solid var(--text)' : 'none',
                      boxShadow: '0 0 4px rgba(0,0,0,0.1)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Collapsible toggle bar at the bottom right */}
      <div 
        className="sidebar-section-label" 
        onClick={() => setSettingsExpanded(!settingsExpanded)}
        style={{ 
          padding: '8px 12px', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderRadius: 'var(--radius-md)',
          background: settingsExpanded ? 'var(--bg-secondary)' : 'transparent',
          transition: 'background 0.15s',
          userSelect: 'none',
          margin: '0',
          width: '100%'
        }}
        onMouseEnter={e => {
          if (!settingsExpanded) e.currentTarget.style.background = 'var(--bg-hover)';
        }}
        onMouseLeave={e => {
          if (!settingsExpanded) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon /> <span style={{ marginLeft: 6 }}>Settings</span>
        </div>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          style={{ 
            transform: settingsExpanded ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.2s',
            color: 'var(--text-muted)'
          }}
        >
          <path d="M6 15l6-6 6 6"/>
        </svg>
      </div>
    </aside>
  </>
);
};
