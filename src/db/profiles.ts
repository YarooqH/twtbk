import { DEFAULT_PROFILE_ID } from './index';

export type Profile = {
  id: string;
  label: string;
  handle?: string;
};

export type ProfilesState = {
  profiles: Profile[];
  // Where new saves from X go.
  savingProfileId: string;
  // What the dashboard shows. Follows savingProfileId until the user picks one.
  viewingProfileId: string;
};

export const PROFILES_KEY = 'xmarks_profiles';

export const defaultProfilesState = (): ProfilesState => ({
  profiles: [{ id: DEFAULT_PROFILE_ID, label: 'Default' }],
  savingProfileId: DEFAULT_PROFILE_ID,
  viewingProfileId: DEFAULT_PROFILE_ID,
});

// Drops anything malformed and guarantees the default profile and valid pointers exist.
export function normalizeProfilesState(raw: unknown): ProfilesState {
  const fallback = defaultProfilesState();
  if (!raw || typeof raw !== 'object') return fallback;
  const input = raw as Partial<ProfilesState>;

  const profiles = (Array.isArray(input.profiles) ? input.profiles : [])
    .filter((p): p is Profile => Boolean(p) && typeof p.id === 'string' && typeof p.label === 'string');
  if (!profiles.some(p => p.id === DEFAULT_PROFILE_ID)) profiles.unshift(fallback.profiles[0]);

  const has = (id: unknown) => typeof id === 'string' && profiles.some(p => p.id === id);
  return {
    profiles,
    savingProfileId: has(input.savingProfileId) ? input.savingProfileId! : DEFAULT_PROFILE_ID,
    viewingProfileId: has(input.viewingProfileId) ? input.viewingProfileId! : DEFAULT_PROFILE_ID,
  };
}

export function loadProfilesState(): Promise<ProfilesState> {
  const storage = typeof chrome !== 'undefined' ? chrome.storage?.local : undefined;
  if (!storage) return Promise.resolve(defaultProfilesState());
  return new Promise(resolve => {
    storage.get(PROFILES_KEY, result => resolve(normalizeProfilesState(result?.[PROFILES_KEY])));
  });
}

export function saveProfilesState(state: ProfilesState): Promise<void> {
  const storage = typeof chrome !== 'undefined' ? chrome.storage?.local : undefined;
  if (!storage) return Promise.resolve();
  return new Promise(resolve => {
    storage.set({ [PROFILES_KEY]: state }, () => resolve());
  });
}
