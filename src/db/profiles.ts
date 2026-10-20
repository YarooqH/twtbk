// Must stay free of Dexie imports: the content script pulls this file in for handle matching.
export const DEFAULT_PROFILE_ID = 'default';

export type Profile = {
  id: string;
  label: string;
  handle?: string;
};

// manual: saves go to the chosen saving profile (the default; with one profile it is a single library).
// auto: saves follow the X account detected in the page, one profile per account.
export type ProfileMode = 'manual' | 'auto';

export type ProfilesState = {
  mode: ProfileMode;
  profiles: Profile[];
  // Where new saves from X go.
  savingProfileId: string;
  // What the dashboard shows. Follows savingProfileId until the user picks one.
  viewingProfileId: string;
};

export const PROFILES_KEY = 'xmarks_profiles';

export const defaultProfilesState = (): ProfilesState => ({
  mode: 'manual',
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
    mode: input.mode === 'auto' ? 'auto' : 'manual',
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

export const MAX_PROFILE_LABEL = 40;

const cleanLabel = (label: string) => label.trim().slice(0, MAX_PROFILE_LABEL);

export function createProfile(state: ProfilesState, label: string, id = 'p_' + Date.now().toString(36)): ProfilesState {
  const name = cleanLabel(label);
  if (!name || state.profiles.some(p => p.id === id)) return state;
  return {
    ...state,
    profiles: [...state.profiles, { id, label: name }],
    savingProfileId: state.savingProfileId,
    viewingProfileId: id,
  };
}

export function renameProfile(state: ProfilesState, id: string, label: string): ProfilesState {
  const name = cleanLabel(label);
  if (!name) return state;
  return { ...state, profiles: state.profiles.map(p => (p.id === id ? { ...p, label: name } : p)) };
}

export function removeProfile(state: ProfilesState, id: string): ProfilesState {
  if (id === DEFAULT_PROFILE_ID) return state;
  const pick = (current: string) => (current === id ? DEFAULT_PROFILE_ID : current);
  return {
    ...state,
    profiles: state.profiles.filter(p => p.id !== id),
    savingProfileId: pick(state.savingProfileId),
    viewingProfileId: pick(state.viewingProfileId),
  };
}

export function setViewingProfile(state: ProfilesState, id: string): ProfilesState {
  if (!state.profiles.some(p => p.id === id)) return state;
  return { ...state, viewingProfileId: id };
}

// The dashboard keeps following saves until the user has picked a different library to view.
export function setSavingProfile(state: ProfilesState, id: string): ProfilesState {
  if (!state.profiles.some(p => p.id === id)) return state;
  const following = state.viewingProfileId === state.savingProfileId;
  return { ...state, savingProfileId: id, viewingProfileId: following ? id : state.viewingProfileId };
}

export const setProfileMode = (state: ProfilesState, mode: ProfileMode): ProfilesState =>
  state.mode === mode ? state : { ...state, mode };

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

export const normalizeHandle = (handle: unknown): string | null =>
  typeof handle === 'string' && HANDLE_RE.test(handle.replace(/^@/, '')) ? handle.replace(/^@/, '').toLowerCase() : null;

/**
 * Auto mode: points saving at the profile that owns this X handle.
 * - A profile already linked to the handle is used.
 * - The first handle ever seen claims an unlinked Default profile, so an existing library stays usable.
 * - Any other new handle gets its own profile.
 * Returns the same object when nothing changes.
 */
export function routeToAccount(state: ProfilesState, rawHandle: unknown): ProfilesState {
  const handle = normalizeHandle(rawHandle);
  if (state.mode !== 'auto' || !handle) return state;

  let next = state;
  let target = state.profiles.find(p => p.handle === handle);
  if (!target) {
    const fallback = state.profiles.find(p => p.id === DEFAULT_PROFILE_ID)!;
    if (!fallback.handle) {
      target = { ...fallback, handle };
      next = { ...next, profiles: next.profiles.map(p => (p.id === fallback.id ? target! : p)) };
    } else {
      target = { id: `acct_${handle}`, label: `@${handle}`, handle };
      next = { ...next, profiles: [...next.profiles, target] };
    }
  }
  if (next === state && state.savingProfileId === target.id) return state;
  return setSavingProfile(next, target.id);
}
