import { MSG } from '../messages';
import { extractTweetData } from './extract';
import { showToast } from './toast';
import { XMARKS_MARK_PATH, XMARKS_MARK_VIEWBOX } from '../shared/logo';
import { isBookmarksView } from './bookmarksView';

export let isImporting = false;
export let totalImported = 0;
export let lastScrollHeight = 0;
export let sameHeightCount = 0;
let importFinished = false;
let importPaused = false;

function updateOnboardingState(changes: Record<string, unknown>) {
  chrome.storage?.local?.get('xmarks_onboarding', result => {
    const current: any = result?.xmarks_onboarding || { version: 1 };
    chrome.storage?.local?.set({ xmarks_onboarding: { ...current, ...changes } });
  });
}

let sidebarRetryTimer: number | null = null;
let retryCount = 0;

// Check for bookmark import page
export function checkBookmarkPage() {
  const isBookmarkPage = isBookmarksView();
  if (isBookmarkPage) {
    if (document.getElementById('twtbk-sidebar-importer-container')) {
      retryCount = 0;
      if (sidebarRetryTimer) window.clearTimeout(sidebarRetryTimer);
      return;
    }

    const success = injectImporterSidebarUI();
    if (!success && retryCount < 25) {
      retryCount++;
      if (sidebarRetryTimer) window.clearTimeout(sidebarRetryTimer);
      sidebarRetryTimer = window.setTimeout(checkBookmarkPage, 300);
    } else if (success) {
      retryCount = 0;
      if (sidebarRetryTimer) window.clearTimeout(sidebarRetryTimer);
    }
  } else {
    retryCount = 0;
    if (sidebarRetryTimer) window.clearTimeout(sidebarRetryTimer);
    const container = document.getElementById('twtbk-sidebar-importer-container');
    if (container) container.remove();
    const panel = document.getElementById('twtbk-importer-panel');
    if (panel) panel.remove();
  }
}

function getXTheme() {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  if (bodyBg === 'rgb(0, 0, 0)') {
    return {
      bg: '#000000',
      text: '#e7e9ea',
      border: '#2f3336',
      textMuted: '#71767b',
      bgHover: 'rgba(231, 233, 234, 0.1)'
    };
  } else if (bodyBg === 'rgb(21, 32, 43)') {
    return {
      bg: '#15202b',
      text: '#ffffff',
      border: '#38444d',
      textMuted: '#8899a6',
      bgHover: 'rgba(255, 255, 255, 0.1)'
    };
  } else {
    return {
      bg: '#ffffff',
      text: '#0f1419',
      border: '#eff3f4',
      textMuted: '#536471',
      bgHover: 'rgba(15, 20, 25, 0.1)'
    };
  }
}

function injectImporterSidebarUI(): boolean {
  if (document.getElementById('twtbk-sidebar-importer-container')) return true;

  const postBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]')
    || document.querySelector('a[href="/compose/post"]')
    || document.querySelector('a[href="/i/bookmarks"]')
    || document.querySelector('a[href="/i/history"]')
    || document.querySelector('[data-testid="AppTabBar_DirectMessage_Link"]')
    || document.querySelector('nav[role="navigation"]');

  if (!postBtn) {
    return false;
  }

  const theme = getXTheme();

  const postBtnContainer = postBtn.closest('div') || postBtn.parentElement;
  const primaryNav = postBtn.closest('nav') as HTMLElement | null;

  // Find the navigation item that directly owns the Post button. Inserting
  // beside this item keeps Sync Bookmarks in the same vertical flow instead
  // of appending it to the end of a large, nested X navigation tree.
  let postNavItem: HTMLElement = postBtnContainer as HTMLElement;
  if (primaryNav && primaryNav.contains(postBtn)) {
    let candidate: HTMLElement = postBtn as HTMLElement;
    while (candidate.parentElement && candidate.parentElement !== primaryNav) {
      candidate = candidate.parentElement;
    }
    postNavItem = candidate;
  }

  const btnContainer = document.createElement('div');
  btnContainer.id = 'twtbk-sidebar-importer-container';
  btnContainer.style.marginTop = '8px';
  btnContainer.style.marginBottom = '0px';
  btnContainer.style.display = 'flex';
  btnContainer.style.width = '100%';
  btnContainer.style.boxSizing = 'border-box';
  btnContainer.style.justifyContent = 'center';

  const btn = document.createElement('button');
  btn.id = 'twtbk-sidebar-importer-btn';
  btn.innerHTML = `
    <div class="twtbk-sidebar-icon" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: 0 0 24px;">
      <svg viewBox="${XMARKS_MARK_VIEWBOX}" width="22" height="22" aria-hidden="true" style="display: block;"><path fill="${theme.text}" d="${XMARKS_MARK_PATH}"></path></svg>
    </div>
    <span class="twtbk-sidebar-label" style="margin-left: 16px; font-weight: 700; font-size: 17px; color: ${theme.text}; white-space: nowrap;">Sync Bookmarks</span>
  `;

  btn.style.cssText = `
    display: flex;
    align-items: center;
    background: transparent;
    border: 1px solid ${theme.border};
    border-radius: 9999px;
    height: 52px;
    width: 100%;
    padding: 0 16px;
    cursor: pointer;
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    transition: background-color 0.2s;
    box-sizing: border-box;
  `;

  btn.onmouseenter = () => {
    btn.style.backgroundColor = theme.bgHover;
  };
  btn.onmouseleave = () => {
    btn.style.backgroundColor = 'transparent';
  };


  btn.onclick = (e) => {
    e.stopPropagation();
    toggleImporterPanel(btn);
  };

  btnContainer.appendChild(btn);

  const syncButtonWidth = () => {
    const referenceWidth = postBtn.getBoundingClientRect().width || postNavItem.getBoundingClientRect().width;
    if (!referenceWidth) return;
    btnContainer.style.width = `${Math.round(referenceWidth)}px`;
    btn.style.width = '100%';
  };

  syncButtonWidth();
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(syncButtonWidth);
    resizeObserver.observe(postBtn);
  }

  if (postNavItem?.parentNode) {
    postNavItem.after(btnContainer);
  } else if (postBtnContainer?.parentNode) {
    postBtnContainer.after(btnContainer);
  } else if (postBtn.parentNode) {
    postBtn.after(btnContainer);
  } else {
    console.warn("XMarks: No suitable container found for the Sync Bookmarks sidebar button.");
    return false;
  }
  return true;
}

function updatePanelUI() {
  const panel = document.getElementById('twtbk-importer-panel');
  if (!panel) return;

  const startBtn = document.getElementById('twtbk-start-import-btn');
  const desc = panel.querySelector('p');
  const title = panel.querySelector('h3');

  const progress = document.getElementById('twtbk-import-progress');
  const progressLabel = document.getElementById('twtbk-import-progress-label');
  const dashboardBtn = document.getElementById('twtbk-open-dashboard-btn');

  if (isImporting) {
    if (title) title.textContent = "Syncing your X bookmarks";
    if (desc) desc.textContent = `Scanning and saving bookmarks locally · ${totalImported} new saved`;
    if (startBtn) {
      startBtn.textContent = "Pause Sync";
      startBtn.style.backgroundColor = "#f4212e";
    }
    progress?.classList.add('is-active');
    if (progressLabel) progressLabel.textContent = `${totalImported} new bookmarks saved`;
    if (dashboardBtn) dashboardBtn.style.display = 'none';
  } else if (importFinished) {
    if (title) title.textContent = "Sync complete";
    if (desc) desc.textContent = `Your local library is ready with ${totalImported} new bookmark${totalImported === 1 ? '' : 's'}.`;
    if (startBtn) {
      startBtn.textContent = "Sync Again";
      startBtn.style.backgroundColor = "var(--twtbk-accent, #1d9bf0)";
    }
    progress?.classList.remove('is-active');
    progress?.classList.add('is-complete');
    if (progressLabel) progressLabel.textContent = `${totalImported} new bookmarks saved`;
    if (dashboardBtn) dashboardBtn.style.display = 'flex';
  } else if (importPaused) {
    if (title) title.textContent = "Sync paused";
    if (desc) desc.textContent = `${totalImported} new bookmarks saved so far. Resume when you are ready.`;
    if (startBtn) {
      startBtn.textContent = "Resume Sync";
      startBtn.style.backgroundColor = "var(--twtbk-accent, #1d9bf0)";
    }
    progress?.classList.remove('is-active');
    if (progressLabel) progressLabel.textContent = `${totalImported} new bookmarks saved`;
    if (dashboardBtn) dashboardBtn.style.display = 'none';
  } else {
    if (title) title.textContent = "Sync your X bookmarks";
    if (desc) desc.textContent = "XMarks will scan your bookmarks, skip duplicates, and keep a local searchable copy.";
    if (startBtn) {
      startBtn.textContent = "Start Sync";
      startBtn.style.backgroundColor = "var(--twtbk-accent, #1d9bf0)";
    }
    progress?.classList.remove('is-active', 'is-complete');
    if (progressLabel) progressLabel.textContent = "Ready to start";
    if (dashboardBtn) dashboardBtn.style.display = 'none';
  }
}

function toggleImporterPanel(btn: HTMLElement) {
  let panel = document.getElementById('twtbk-importer-panel');
  if (panel) {
    panel.remove();
    return;
  }

  const theme = getXTheme();
  panel = document.createElement('div');
  panel.id = 'twtbk-importer-panel';
  const rect = btn.getBoundingClientRect();
  
  // Create panel hidden first to calculate exact height for space-aware positioning
  panel.style.cssText = `
    position: fixed;
    width: 280px;
    background: ${theme.bg};
    color: ${theme.text};
    border: 1px solid ${theme.border};
    border-radius: 16px;
    padding: 16px;
    z-index: 10000;
    box-shadow: rgba(0, 0, 0, 0.15) 0px 4px 12px;
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  `;

  panel.innerHTML = `
    <h3 style="margin-top:0; margin-bottom: 8px; font-size: 16px; font-weight: 700; color: ${theme.text};">Auto-Import Bookmarks</h3>
    <p style="font-size: 13px; color: ${theme.textMuted}; margin-bottom: 12px; line-height: 1.4;"></p>
    <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:6px; font-size:11px; color:${theme.textMuted};"><span id="twtbk-import-progress-label">Ready to start</span><span>Local only</span></div>
    <div class="twtbk-import-progress-track" role="progressbar" aria-label="Bookmark sync progress" aria-valuemin="0" aria-valuenow="0"><div id="twtbk-import-progress" class="twtbk-import-progress-fill"></div></div>
    <button id="twtbk-start-import-btn" style="width:100%; margin-top:12px; color: var(--twtbk-accent-contrast, #ffffff); border: none; border-radius: 9999px; padding: 10px 16px; font-weight: 700; cursor: pointer; display: flex; justify-content: center; font-family: inherit; transition: background-color 0.2s;"></button>
    <button id="twtbk-open-dashboard-btn" style="display:none; width:100%; margin-top:8px; color:${theme.text}; background:transparent; border:1px solid ${theme.border}; border-radius:9999px; padding:9px 16px; font-weight:700; cursor:pointer; justify-content:center; font-family:inherit;">Open your library</button>
  `;

  document.body.appendChild(panel);
  updatePanelUI();

  // Measure dynamic panel height
  const panelHeight = panel.offsetHeight;

  // Space awareness check (above vs below)
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top = 0;
  if (spaceBelow >= panelHeight + 12) {
    // Open directly below the button
    top = rect.bottom + 8;
  } else if (spaceAbove >= panelHeight + 12) {
    // Open upwards (directly above the button)
    top = rect.top - panelHeight - 8;
  } else {
    // Open where there's more space
    top = spaceBelow > spaceAbove ? rect.bottom + 8 : Math.max(10, rect.top - panelHeight - 8);
  }

  panel.style.top = `${top}px`;
  panel.style.left = `${rect.left}px`;
  panel.style.opacity = '1';
  panel.style.pointerEvents = 'auto';

  const startBtn = document.getElementById('twtbk-start-import-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      if (isImporting) {
        isImporting = false;
        importPaused = true;
        showToast("Sync paused.");
        updatePanelUI();
      } else {
        const wasPaused = importPaused;
        isImporting = true;
        importPaused = false;
        importFinished = false;
        if (!wasPaused) totalImported = 0;
        lastScrollHeight = 0;
        sameHeightCount = 0;
        processedImportIds.clear();
        updateOnboardingState({ firstSyncStartedAt: new Date().toISOString() });
        showToast("Sync started. XMarks is saving a local copy.");
        updatePanelUI();
        setTimeout(() => runImportLoop(), 800);
      }
    };
  }

  const openDashboardBtn = document.getElementById('twtbk-open-dashboard-btn');
  if (openDashboardBtn) {
    openDashboardBtn.onclick = () => {
      chrome.runtime.sendMessage({ type: MSG.OPEN_DASHBOARD });
    };
  }

  const onClickOutside = (e: MouseEvent) => {
    if (panel && !panel.contains(e.target as Node) && !btn.contains(e.target as Node)) {
      panel.remove();
      document.removeEventListener('click', onClickOutside);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', onClickOutside);
  }, 10);
}

const processedImportIds = new Set<string>();

const runImportLoop = async () => {
  if (!isImporting) {
    updatePanelUI();
    return;
  }

  // On X's History page the Likes tab shares the timeline markup; stop rather
  // than import likes as bookmarks if the user leaves the Bookmarks view.
  if (!isBookmarksView()) {
    isImporting = false;
    importPaused = true;
    showToast('Sync paused. Go back to your Bookmarks to resume.', false);
    updatePanelUI();
    return;
  }
  
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  const batch: any[] = [];

  tweets.forEach(tweet => {
    const data = extractTweetData(tweet);
    if (data && data.id && !processedImportIds.has(data.id)) {
      processedImportIds.add(data.id);
      batch.push(data);
    }
  });

  if (batch.length === 0) {
    const currentScrollHeight = document.documentElement.scrollHeight;
    const isAtBottom = (window.innerHeight + window.scrollY) >= (currentScrollHeight - 150);

    if (isAtBottom) {
      if (currentScrollHeight === lastScrollHeight) {
        sameHeightCount++;
      } else {
        sameHeightCount = 0;
      }
    } else {
      sameHeightCount = 0;
    }

    lastScrollHeight = currentScrollHeight;

    if (sameHeightCount >= 5) {
      isImporting = false;
      importPaused = false;
      importFinished = true;
      updateOnboardingState({ firstSyncCompleted: true, firstSyncCompletedAt: new Date().toISOString() });
      showToast('Sync complete. Added ' + totalImported + ' new bookmarks.');
      updatePanelUI();
      return;
    }

    if (isImporting) {
      window.scrollBy(0, window.innerHeight * 1.5);
      setTimeout(runImportLoop, 1000);
    }
    return;
  }

  chrome.runtime.sendMessage({ type: MSG.IMPORT_BATCH, payload: batch }, (res: any) => {
    if (res && res.success === false) {
      isImporting = false;
      showToast("Import Error: " + res.error);
      updatePanelUI();
      return;
    }

    if (res?.count > 0) {
      totalImported += res.count;
      updatePanelUI();
    }

    const currentScrollHeight = document.documentElement.scrollHeight;
    const isAtBottom = (window.innerHeight + window.scrollY) >= (currentScrollHeight - 150);

    if (isAtBottom) {
      if (currentScrollHeight === lastScrollHeight) {
        sameHeightCount++;
      } else {
        sameHeightCount = 0;
      }
    } else {
      sameHeightCount = 0;
    }

    lastScrollHeight = currentScrollHeight;

    if (sameHeightCount >= 5) {
      isImporting = false;
      importPaused = false;
      importFinished = true;
      updateOnboardingState({ firstSyncCompleted: true, firstSyncCompletedAt: new Date().toISOString() });
      showToast('Sync complete. Added ' + totalImported + ' new bookmarks.');
      updatePanelUI();
      return;
    }

    if (isImporting) {
      window.scrollBy(0, window.innerHeight * 1.5);
      setTimeout(runImportLoop, 1500);
    }
  });
};
