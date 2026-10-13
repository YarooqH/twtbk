import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE_ID, dbNameForProfile } from './index';
import { defaultProfilesState, normalizeProfilesState } from './profiles';

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
