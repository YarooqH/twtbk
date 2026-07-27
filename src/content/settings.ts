export let settingSaveMode: 'injected' | 'native-override' = 'injected';
export let settingInjectedPosition: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'next-to-bookmark' | 'rightmost' = 'next-to-bookmark';
export let settingNativeOverrideAction: 'replace' | 'arrow' = 'replace';
export let settingButtonAlignment: 'left' | 'center' | 'right' = 'center';
export let currentAccentColor = '#1d9bf0';
export let settingsLoaded = typeof chrome === 'undefined' || !chrome.storage;

let resolveSettingsReady: (() => void) | undefined;
export const settingsReady = new Promise<void>((resolve) => {
  resolveSettingsReady = resolve;
});

function finishLoadingSettings() {
  if (settingsLoaded) return;
  settingsLoaded = true;
  resolveSettingsReady?.();
}

if (settingsLoaded) {
  resolveSettingsReady?.();
}

export function setSettingInjectedPosition(val: typeof settingInjectedPosition) {
  settingInjectedPosition = val;
}

export function setSettingSaveMode(val: typeof settingSaveMode) {
  settingSaveMode = val;
}

export function setSettingNativeOverrideAction(val: typeof settingNativeOverrideAction) {
  settingNativeOverrideAction = val;
}

if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.sync.get(['saveMode', 'injectedPosition', 'nativeOverrideAction', 'accentColor', 'buttonAlignment'], (result) => {
    if (result.saveMode) {
      settingSaveMode = result.saveMode as 'injected' | 'native-override';
    }
    if (result.injectedPosition) {
      settingInjectedPosition = result.injectedPosition as typeof settingInjectedPosition;
    }
    if (result.nativeOverrideAction) {
      settingNativeOverrideAction = result.nativeOverrideAction as 'replace' | 'arrow';
    }
    if (result.accentColor) {
      currentAccentColor = result.accentColor as string;
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.style.setProperty('--twtbk-accent', currentAccentColor);
        document.documentElement.style.setProperty('--twtbk-accent-hover', currentAccentColor + 'CC');
      }
    }
    if (result.buttonAlignment) {
      settingButtonAlignment = result.buttonAlignment as 'left' | 'center' | 'right';
    }
    finishLoadingSettings();
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes.saveMode) {
        settingSaveMode = changes.saveMode.newValue as 'injected' | 'native-override';
      }
      if (changes.injectedPosition) {
        settingInjectedPosition = changes.injectedPosition.newValue as typeof settingInjectedPosition;
      }
      if (changes.nativeOverrideAction) {
        settingNativeOverrideAction = changes.nativeOverrideAction.newValue as 'replace' | 'arrow';
      }
      if (changes.buttonAlignment) {
        settingButtonAlignment = changes.buttonAlignment.newValue as 'left' | 'center' | 'right';
      }
      if (changes.accentColor) {
        currentAccentColor = changes.accentColor.newValue as string;
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.style.setProperty('--twtbk-accent', currentAccentColor);
          document.documentElement.style.setProperty('--twtbk-accent-hover', currentAccentColor + 'CC');
        }
      }
    }
  });
}
