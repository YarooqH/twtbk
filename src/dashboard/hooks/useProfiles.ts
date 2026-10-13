import { useCallback, useEffect, useState } from 'react';
import { deleteProfileDb } from '../../db';
import {
  createProfile, defaultProfilesState, loadProfilesState, PROFILES_KEY, removeProfile,
  renameProfile, saveProfilesState, setProfileMode, setSavingProfile, setViewingProfile, type ProfileMode, type ProfilesState,
} from '../../db/profiles';

export function useProfiles() {
  const [state, setState] = useState<ProfilesState>(defaultProfilesState);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => loadProfilesState().then(next => { if (!cancelled) setState(next); });
    refresh();
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[PROFILES_KEY]) refresh();
    };
    chrome.storage?.onChanged?.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage?.onChanged?.removeListener(onChanged);
    };
  }, []);

  // Reads the latest stored state so two dashboard tabs can't overwrite each other's changes.
  const update = useCallback(async (apply: (current: ProfilesState) => ProfilesState) => {
    const next = apply(await loadProfilesState());
    setState(next);
    await saveProfilesState(next);
    return next;
  }, []);

  return {
    ...state,
    create: (label: string) => update(s => createProfile(s, label)),
    rename: (id: string, label: string) => update(s => renameProfile(s, id, label)),
    setMode: (mode: ProfileMode) => update(s => setProfileMode(s, mode)),
    view: (id: string) => update(s => setViewingProfile(s, id)),
    saveTo: (id: string) => update(s => setSavingProfile(s, id)),
    // Pointers move off the profile first so nothing is reading it when its database is deleted.
    remove: async (id: string) => {
      await update(s => removeProfile(s, id));
      await deleteProfileDb(id);
    },
  };
}
