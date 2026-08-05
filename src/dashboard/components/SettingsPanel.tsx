import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getMotionTransition } from '../../motion/presets';
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
  const reducedMotion = useReducedMotion();
  const panelTransition = getMotionTransition(Boolean(reducedMotion));
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 1100px)');
    const updateViewport = () => setIsMobileViewport(media.matches);
    updateViewport();
    media.addEventListener?.('change', updateViewport);
    return () => media.removeEventListener?.('change', updateViewport);
  }, []);

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
      <AnimatePresence>
        {mobileSettingsOpen && setMobileSettingsOpen && (
          <motion.div
            className="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            onClick={() => setMobileSettingsOpen(false)}
          />
        )}
      </AnimatePresence>
      <motion.aside
        className={`settings-sidebar ${mobileSettingsOpen ? 'open' : ''}`}
        data-onboarding="settings-panel"
        initial={false}
        animate={isMobileViewport ? { x: mobileSettingsOpen ? 0 : '100%' } : { x: 0 }}
        transition={panelTransition}
      >

        {/* This wrapper is position:relative so the content panel can be
            absolutely placed ABOVE the toggle button via bottom: 100% */}
        <div className="settings-panel-anchor">

          {/* Content panel — GPU accelerated translateY slide */}
          <div className={`settings-content-wrapper ${settingsExpanded ? 'is-expanded' : 'is-collapsed'}`}>
            <div className="settings-content-inner">
              <motion.div
                className="accordion-slider"
                initial={false}
                animate={{
                  opacity: settingsExpanded ? 1 : 0,
                  y: settingsExpanded ? 0 : 8,
                }}
                transition={panelTransition}
              >
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
              </motion.div>

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
            data-onboarding="settings-toggle"
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
      </motion.aside>
    </>
  );
};
