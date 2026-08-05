import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'xmarks_onboarding';

export interface OnboardingState {
  version: number;
  popupSeenAt?: string;
  dashboardSeenAt?: string;
  welcomePanelDismissed?: boolean;
  firstSaveCompleted?: boolean;
  firstSyncCompleted?: boolean;
  firstDashboardActionCompleted?: boolean;
  syncHintDismissed?: boolean;
  saveModeGuidanceDismissed?: boolean;
  tourCompletedAt?: string;
  tourDismissedAt?: string;
}

const initialState: OnboardingState = { version: 1 };

const readState = (): Promise<OnboardingState> => new Promise(resolve => {
  const storage = chrome.storage?.local;
  if (!storage) {
    resolve(initialState);
    return;
  }
  storage.get(STORAGE_KEY, result => {
    resolve({ ...initialState, ...(result[STORAGE_KEY] as Partial<OnboardingState> | undefined) });
  });
});

const writeState = (state: OnboardingState) => {
  chrome.storage?.local?.set({ [STORAGE_KEY]: state });
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    readState().then(next => {
      if (active) {
        setState(next);
        setIsLoaded(true);
      }
    });
    return () => { active = false; };
  }, []);

  const update = useCallback((changes: Partial<OnboardingState>) => {
    setState(previous => {
      const next = { ...previous, ...changes };
      writeState(next);
      return next;
    });
  }, []);

  const markPopupSeen = useCallback(() => update({ popupSeenAt: new Date().toISOString() }), [update]);
  const markDashboardSeen = useCallback(() => update({ dashboardSeenAt: new Date().toISOString() }), [update]);
  const dismissWelcome = useCallback(() => update({ welcomePanelDismissed: true }), [update]);
  const markFirstAction = useCallback(() => update({ firstDashboardActionCompleted: true }), [update]);
  const markTourCompleted = useCallback(() => update({ tourCompletedAt: new Date().toISOString() }), [update]);
  const markTourDismissed = useCallback(() => update({ tourDismissedAt: new Date().toISOString() }), [update]);
  const resetTour = useCallback(() => update({ tourCompletedAt: undefined, tourDismissedAt: undefined }), [update]);

  return {
    state,
    isLoaded,
    markPopupSeen,
    markDashboardSeen,
    dismissWelcome,
    markFirstAction,
    markTourCompleted,
    markTourDismissed,
    resetTour,
  };
}
