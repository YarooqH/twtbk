import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE_ID, dbNameForProfile } from './index';
import {
  createProfile, defaultProfilesState, normalizeProfilesState, removeProfile,
  normalizeHandle, renameProfile, routeToAccount, setProfileMode, setSavingProfile, setViewingProfile,
} from './profiles';

describe('dbNameForProfile', () => {
  it('keeps the original database name for the default profile', () => {
    expect(dbNameForProfile(DEFAULT_PROFILE_ID)).toBe('TwitterBookmarkDB');
  });

  it('gives every other profile its own database', () => {
    expect(dbNameForProfile('work')).toBe('XMarks_work');
  });
});

describe('normalizeProfilesState', () => {
  it('falls back to the single default library for missing or garbage input', () => {
    expect(normalizeProfilesState(undefined)).toEqual(defaultProfilesState());
    expect(normalizeProfilesState('nope')).toEqual(defaultProfilesState());
  });

  it('always keeps the default profile', () => {
    const state = normalizeProfilesState({
      profiles: [{ id: 'work', label: 'Work' }],
      savingProfileId: 'work',
      viewingProfileId: 'work',
    });
    expect(state.profiles.map(p => p.id)).toEqual([DEFAULT_PROFILE_ID, 'work']);
    expect(state.savingProfileId).toBe('work');
  });

  it('resets pointers to profiles that no longer exist', () => {
    const state = normalizeProfilesState({
      profiles: [{ id: DEFAULT_PROFILE_ID, label: 'Default' }],
      savingProfileId: 'deleted',
      viewingProfileId: 'deleted',
    });
    expect(state.savingProfileId).toBe(DEFAULT_PROFILE_ID);
    expect(state.viewingProfileId).toBe(DEFAULT_PROFILE_ID);
  });
});

describe('profile transitions', () => {
  const base = defaultProfilesState();

  it('creating a profile views it but keeps saving where it was', () => {
    const next = createProfile(base, '  Work  ', 'work');
    expect(next.profiles.map(p => p.label)).toEqual(['Default', 'Work']);
    expect(next.viewingProfileId).toBe('work');
    expect(next.savingProfileId).toBe(DEFAULT_PROFILE_ID);
  });

  it('ignores blank names and duplicate ids', () => {
    expect(createProfile(base, '   ', 'x')).toBe(base);
    expect(createProfile(createProfile(base, 'A', 'a'), 'B', 'a').profiles).toHaveLength(2);
  });

  it('never removes the default profile and resets pointers on removal', () => {
    const withWork = setSavingProfile(createProfile(base, 'Work', 'work'), 'work');
    expect(removeProfile(withWork, DEFAULT_PROFILE_ID)).toBe(withWork);
    const removed = removeProfile(withWork, 'work');
    expect(removed.profiles).toHaveLength(1);
    expect(removed.savingProfileId).toBe(DEFAULT_PROFILE_ID);
    expect(removed.viewingProfileId).toBe(DEFAULT_PROFILE_ID);
  });

  it('viewing follows saving only until the user picks another library', () => {
    const two = createProfile(base, 'Work', 'work');
    expect(setSavingProfile(setViewingProfile(two, DEFAULT_PROFILE_ID), 'work').viewingProfileId).toBe('work');
    const pinned = setSavingProfile(two, 'work');
    expect(setSavingProfile(setViewingProfile(pinned, DEFAULT_PROFILE_ID), DEFAULT_PROFILE_ID).viewingProfileId).toBe(DEFAULT_PROFILE_ID);
    const elsewhere = setViewingProfile(createProfile(createProfile(base, 'A', 'a'), 'B', 'b'), 'a');
    expect(setSavingProfile(elsewhere, 'b').viewingProfileId).toBe('a');
  });

  it('renames a profile', () => {
    expect(renameProfile(createProfile(base, 'Work', 'work'), 'work', 'Alt').profiles[1].label).toBe('Alt');
  });
});

describe('account routing (auto mode)', () => {
  const auto = setProfileMode(defaultProfilesState(), 'auto');

  it('does nothing in manual mode or without a valid handle', () => {
    const manual = defaultProfilesState();
    expect(routeToAccount(manual, 'alice')).toBe(manual);
    expect(routeToAccount(auto, undefined)).toBe(auto);
    expect(routeToAccount(auto, 'not a handle!')).toBe(auto);
  });

  it('normalizes handles', () => {
    expect(normalizeHandle('@Alice_1')).toBe('alice_1');
    expect(normalizeHandle('way_too_long_for_a_handle')).toBeNull();
  });

  it('lets the first handle claim the unlinked default library', () => {
    const next = routeToAccount(auto, 'Alice');
    expect(next.profiles).toHaveLength(1);
    expect(next.profiles[0].handle).toBe('alice');
    expect(next.savingProfileId).toBe(DEFAULT_PROFILE_ID);
  });

  it('gives each further account its own library and reuses it afterwards', () => {
    const alice = routeToAccount(auto, 'alice');
    const bob = routeToAccount(alice, 'bob');
    expect(bob.profiles.map(p => p.id)).toEqual([DEFAULT_PROFILE_ID, 'acct_bob']);
    expect(bob.savingProfileId).toBe('acct_bob');
    const back = routeToAccount(bob, '@Alice');
    expect(back.profiles).toHaveLength(2);
    expect(back.savingProfileId).toBe(DEFAULT_PROFILE_ID);
    expect(routeToAccount(back, 'alice')).toBe(back);
  });

  it('moves the dashboard along only while it was following saves', () => {
    const alice = routeToAccount(auto, 'alice');
    expect(routeToAccount(alice, 'bob').viewingProfileId).toBe('acct_bob');
    const pinned = setViewingProfile(routeToAccount(alice, 'bob'), DEFAULT_PROFILE_ID);
    expect(routeToAccount(pinned, 'alice').viewingProfileId).toBe(DEFAULT_PROFILE_ID);
  });
});
