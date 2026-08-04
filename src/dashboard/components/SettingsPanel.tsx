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
  React.useEffect(() => {
    if (!mobileSettingsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSettingsOpen]);

  return (
    <>
      {mobileSettingsOpen && setMobileSettingsOpen && (
        <div className="settings-backdrop" onClick={() => setMobileSettingsOpen(false)} />
      )}
      <aside className={`settings-sidebar ${mobileSettingsOpen ? 'open' : ''}`}>

        {/* This wrapper is position:relative so the content panel can be
            absolutely placed ABOVE the toggle button via bottom: 100% */}
        <div className="settings-panel-anchor">

          {/* Content panel — GPU accelerated translateY slide */}
          <div className={`settings-content-wrapper ${settingsExpanded ? 'is-expanded' : 'is-collapsed'}`}>
            <div className="settings-content-inner">
              <div className="accordion-slider">
                <SaveConfigCard
                  saveMode={saveMode} setSaveMode={setSaveMode}
                  injectedPosition={injectedPosition} setInjectedPosition={setInjectedPosition}
                  nativeOverrideAction={nativeOverrideAction} setNativeOverrideAction={setNativeOverrideAction}
                  buttonAlignment={buttonAlignment} setButtonAlignment={setButtonAlignment}
                  alsoSaveNative={alsoSaveNative} setAlsoSaveNative={setAlsoSaveNative}
                  accentColor={accentColor}
                />

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

              <div className="mobile-only-ai-card">
                <AICard
                  autoCategorize={autoCategorize}
                  toggleAutoCategorize={toggleAutoCategorize}
                  isModelLoaded={isModelLoaded}
                  modelProgress={modelProgress}
                  isClassifying={isClassifying}
                  classifyProgress={classifyProgress}
                  runAutoCategorizeJobs={runAutoCategorizeJobs}
                />
              </div>
            </div>
          </div>

          {/* Toggle button — always visible at the bottom */}
          <button
            type="button"
            className={`sidebar-toggle-bar ${settingsExpanded ? 'is-expanded' : 'is-collapsed'}`}
            aria-expanded={settingsExpanded}
            onClick={() => setSettingsExpanded(!settingsExpanded)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SettingsIcon />
              <span className="settings-card-title">Settings</span>
            </span>
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
          </button>

        </div>
      </aside>
    </>
  );
};
