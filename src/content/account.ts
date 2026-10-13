import { normalizeHandle } from '../db/profiles';
import type { ActionMessage } from '../messages';

/**
 * Reads the handle of the X account that is logged in. Prefers the sidebar Profile link, whose
 * href is `/handle`, and falls back to the "@handle" text in the account switcher button.
 */
export function detectAccountHandle(root: ParentNode = document): string | null {
  const href = root.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href');
  // Only a bare `/handle` path counts; `/i/flow/login` and friends are not profiles.
  const fromLink = normalizeHandle(href?.match(/^\/([^/?#]+)\/?(?:[?#].*)?$/)?.[1]);
  if (fromLink) return fromLink;

  const switcherText = root.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')?.textContent ?? '';
  return normalizeHandle(switcherText.match(/@([A-Za-z0-9_]{1,15})/)?.[1]);
}

let currentHandle: string | null = null;

export const getAccountHandle = () => currentHandle;

// X renders its nav after load and reloads the page on an account switch, so a cheap poll is enough.
export function startAccountWatcher(intervalMs = 2000) {
  const check = () => {
    const found = detectAccountHandle();
    if (found && found !== currentHandle) currentHandle = found;
  };
  check();
  return setInterval(check, intervalMs);
}

/** chrome.runtime.sendMessage plus the detected account, so the background can route to its library. */
export function sendToBackground(message: ActionMessage, callback?: (response: any) => void) {
  const handle = currentHandle ?? detectAccountHandle();
  const envelope = handle ? { ...message, accountHandle: handle } : message;
  if (callback) chrome.runtime.sendMessage(envelope, callback);
  else chrome.runtime.sendMessage(envelope);
}
