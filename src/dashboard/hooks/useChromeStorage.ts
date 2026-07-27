import { useState, useEffect } from 'react';

export function useChromeStorage(setAccentColor?: (c: string) => void, setAutoCategorize?: (v: boolean) => void) {
  const [alsoSaveNative, setAlsoSaveNative] = useState(false);
  const [saveMode, setSaveMode] = useState<'injected' | 'native-override'>('injected');
  const [injectedPosition, setInjectedPosition] = useState<'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark'>('next-to-bookmark');
  const [nativeOverrideAction, setNativeOverrideAction] = useState<'replace' | 'arrow'>('replace');
  const [buttonAlignment, setButtonAlignment] = useState<'left' | 'center' | 'right'>('center');

  useEffect(() => {
    chrome.storage?.sync?.get(['alsoSaveNativeBookmarks', 'saveMode', 'injectedPosition', 'nativeOverrideAction', 'autoCategorize', 'accentColor', 'buttonAlignment'], (result: Record<string, unknown>) => {
      if (result.alsoSaveNativeBookmarks !== undefined) setAlsoSaveNative(Boolean(result.alsoSaveNativeBookmarks));
      if (result.saveMode !== undefined) setSaveMode(result.saveMode as 'injected' | 'native-override');
      if (result.injectedPosition !== undefined) setInjectedPosition(result.injectedPosition as 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark');
      if (result.nativeOverrideAction !== undefined) setNativeOverrideAction(result.nativeOverrideAction as 'replace' | 'arrow');
      if (result.autoCategorize !== undefined && setAutoCategorize) setAutoCategorize(Boolean(result.autoCategorize));
      if (result.accentColor !== undefined && setAccentColor) setAccentColor(result.accentColor as string);
      if (result.buttonAlignment !== undefined) setButtonAlignment(result.buttonAlignment as 'left' | 'center' | 'right');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAlsoSaveNative = (val: boolean) => {
    setAlsoSaveNative(val);
    chrome.storage?.sync?.set({ alsoSaveNativeBookmarks: val });
  };

  const updateSaveMode = (val: 'injected' | 'native-override') => {
    setSaveMode(val);
    chrome.storage?.sync?.set({ saveMode: val });
  };

  const updateInjectedPosition = (val: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark') => {
    setInjectedPosition(val);
    chrome.storage?.sync?.set({ injectedPosition: val });
  };

  const updateNativeOverrideAction = (val: 'replace' | 'arrow') => {
    setNativeOverrideAction(val);
    chrome.storage?.sync?.set({ nativeOverrideAction: val });
  };

  const updateButtonAlignment = (val: 'left' | 'center' | 'right') => {
    setButtonAlignment(val);
    chrome.storage?.sync?.set({ buttonAlignment: val });
  };

  return {
    alsoSaveNative, saveMode, injectedPosition, nativeOverrideAction, buttonAlignment,
    setAlsoSaveNative: updateAlsoSaveNative,
    setSaveMode: updateSaveMode,
    setInjectedPosition: updateInjectedPosition,
    setNativeOverrideAction: updateNativeOverrideAction,
    setButtonAlignment: updateButtonAlignment,
  };
}
