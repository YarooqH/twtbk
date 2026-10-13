// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { detectAccountHandle } from './account';

describe('detectAccountHandle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reads the handle from the sidebar profile link', () => {
    document.body.innerHTML = '<a data-testid="AppTabBar_Profile_Link" href="/Alice_01">Profile</a>';
    expect(detectAccountHandle()).toBe('alice_01');
  });

  it('falls back to the account switcher text', () => {
    document.body.innerHTML = '<button data-testid="SideNav_AccountSwitcher_Button">Alice Doe @Alice_01 ···</button>';
    expect(detectAccountHandle()).toBe('alice_01');
  });

  it('returns null when X has not rendered the nav or the link is not a profile', () => {
    expect(detectAccountHandle()).toBeNull();
    document.body.innerHTML = '<a data-testid="AppTabBar_Profile_Link" href="/i/flow/login">Profile</a>';
    expect(detectAccountHandle()).toBeNull();
  });
});
