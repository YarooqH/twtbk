import { useEffect, useState, type ReactNode } from 'react';
import { setActiveProfile } from './index';
import { loadProfilesState, PROFILES_KEY } from './profiles';

/**
 * Points the page's `db` at the viewing profile before anything renders, and remounts the subtree
 * when the viewing profile changes so live queries and local state never mix two libraries.
 */
export function ProfileBoundary({ children }: { children: ReactNode }) {
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      const { viewingProfileId: id } = await loadProfilesState();
      if (cancelled) return;
      setActiveProfile(id);
      setViewingProfileId(id);
    };
    apply();

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[PROFILES_KEY]) apply();
    };
    chrome.storage?.onChanged?.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage?.onChanged?.removeListener(onChanged);
    };
  }, []);

  if (viewingProfileId === null) return null;
  return <div style={{ display: 'contents' }} key={viewingProfileId}>{children}</div>;
}
