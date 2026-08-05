import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getMotionTransition } from '../../motion/presets';
import { SettingsIcon, svgIcons } from '../icons';
import { categoryColors } from '../helpers';
import { SaveConfigCard } from './SaveConfigCard';
import { AICard } from './AICard';
import { InfoTooltip } from './InfoTooltip';
import { useThemeMode, type ThemeMode } from '../hooks/useThemeMode';

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
  const [themeMode, setThemeMode] = useThemeMode();
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div className="settings-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                      Personalization
                      <InfoTooltip text="Switch theme mode (System, Light, Dark) or select your custom accent color." />
                    </div>

                    {/* Compact 3-state Theme Mode Icon Toggle */}
                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--border)', position: 'relative' }}>
                      {[
                        { id: 'system', label: 'System preference', icon: '💻' },
                        { id: 'light', label: 'Light mode', icon: '☀️' },
                        { id: 'dark', label: 'Dark mode', icon: '🌙' },
                      ].map(mode => {
                        const isActive = themeMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setThemeMode(mode.id as ThemeMode)}
                            title={mode.label}
                            aria-label={mode.label}
                            style={{
                              position: 'relative',
                              background: 'transparent',
                              color: isActive ? '#ffffff' : 'var(--text-muted)',
                              border: 'none',
                              borderRadius: 'var(--radius-full)',
                              width: '28px',
                              height: '24px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                              transition: 'color 0.2s',
                            }}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="theme-mode-pill"
                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'var(--accent)',
                                  borderRadius: 'var(--radius-full)',
                                  zIndex: -1,
                                }}
                              />
                            )}
                            <span style={{ position: 'relative', zIndex: 2 }}>{mode.icon}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color Palette & Custom Color Picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span className="toggle-label" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', textTransform: 'uppercase' }}>
                      ACCENT COLOR
                      <InfoTooltip text="Pick a preset or choose any custom accent color using the custom color wheel." />
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                      {categoryColors.map(color => (
                        <span
                          key={color}
                          onClick={() => {
                            setAccentColor(color);
                            chrome.storage?.sync?.set({ accentColor: color });
                          }}
                          title={color}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: color,
                            cursor: 'pointer',
                            border: accentColor.toLowerCase() === color.toLowerCase() ? '2px solid var(--text)' : 'none',
                            boxShadow: '0 0 4px rgba(0,0,0,0.1)',
                            transition: 'transform 0.15s',
                          }}
                        />
                      ))}
                      {/* Custom Color Selector Swatch */}
                      <label
                        title="Pick custom color"
                        style={{
                          position: 'relative',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: !categoryColors.some(c => c.toLowerCase() === accentColor.toLowerCase()) ? '2px solid var(--text)' : '1px solid var(--border-strong)',
                          boxShadow: '0 0 4px rgba(0,0,0,0.15)',
                        }}
                      >
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAccentColor(val);
                            chrome.storage?.sync?.set({ accentColor: val });
                          }}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: '100%',
                            height: '100%',
                            cursor: 'pointer',
                          }}
                        />
                      </label>
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
