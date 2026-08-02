import { MSG } from '../messages';
import { extractTweetData } from './extract';
import { showToast } from './toast';

export let isImporting = false;
export let totalImported = 0;
export let lastScrollHeight = 0;
export let sameHeightCount = 0;

// Check for bookmark import page
export function checkBookmarkPage() {
  const isBookmarkPage = window.location.pathname.includes('/i/bookmarks');
  if (isBookmarkPage) {
    injectImporterSidebarUI();
  } else {
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

function injectImporterSidebarUI() {
  if (document.getElementById('twtbk-sidebar-importer-container')) return;

  const postBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') || document.querySelector('a[href="/compose/post"]');
  if (!postBtn) {
    console.warn("XMarks: Sync Bookmarks sidebar button could not be injected — Post button selector did not match on this page.");
    return;
  }

  const theme = getXTheme();

  const postBtnContainer = postBtn.closest('div') || postBtn.parentElement;

  const btnContainer = document.createElement('div');
  btnContainer.id = 'twtbk-sidebar-importer-container';
  
  if (postBtnContainer) {
    // Copy X's layout classes and styles to align perfectly with the Post button
    btnContainer.className = postBtnContainer.className;
    btnContainer.setAttribute('style', postBtnContainer.getAttribute('style') || '');
  }
  
  // Custom adjustments for sidebar flow
  btnContainer.style.marginTop = '12px';
  btnContainer.style.marginBottom = '0px';
  btnContainer.style.display = 'flex';
  btnContainer.style.justifyContent = 'center';

  const btn = document.createElement('button');
  btn.id = 'twtbk-sidebar-importer-btn';
  btn.innerHTML = `
    <div class="twtbk-sidebar-icon" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; color: ${theme.text};">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>
      </svg>
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

  if (!document.getElementById('twtbk-responsive-styles')) {
    const style = document.createElement('style');
    style.id = 'twtbk-responsive-styles';
    style.innerHTML = `
      @media (max-width: 1280px) {
        #twtbk-sidebar-importer-container {
          width: 52px !important;
          margin-top: 12px !important;
        }
        #twtbk-sidebar-importer-btn {
          width: 52px !important;
          padding: 0 !important;
          justify-content: center !important;
          border-radius: 50% !important;
        }
        .twtbk-sidebar-label {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  btn.onclick = (e) => {
    e.stopPropagation();
    toggleImporterPanel(btn);
  };

  btnContainer.appendChild(btn);

  // Prefer appending into the primary left nav so the button is a proper flex
  // child of the sidebar column. X's header/nav containers can otherwise hide
  // `after()` siblings or push them off-screen. Fall back to inserting next to
  // the Post button's wrapper, then directly after the button itself.
  const primaryNav =
    (postBtn.closest('nav') as HTMLElement | null) ||
    (postBtn.closest('header[role="banner"]') as HTMLElement | null) ||
    (postBtnContainer?.parentElement as HTMLElement | null);

  if (primaryNav && primaryNav !== postBtnContainer && primaryNav.contains(postBtn)) {
    primaryNav.appendChild(btnContainer);
  } else if (postBtnContainer && postBtnContainer.parentNode) {
    postBtnContainer.after(btnContainer);
  } else if (postBtn.parentNode) {
    postBtn.after(btnContainer);
  } else {
    console.warn("XMarks: No suitable container found for the Sync Bookmarks sidebar button.");
    return;
  }
}

function updatePanelUI() {
  const panel = document.getElementById('twtbk-importer-panel');
  if (!panel) return;

  const startBtn = document.getElementById('twtbk-start-import-btn');
  const desc = panel.querySelector('p');
  const title = panel.querySelector('h3');

  if (isImporting) {
    if (title) title.textContent = "Syncing Bookmarks...";
    if (desc) desc.textContent = `Sync in progress. Total saved: ${totalImported}`;
    if (startBtn) {
      startBtn.textContent = "Stop Sync";
      startBtn.style.backgroundColor = "#f4212e"; // Red
    }
  } else {
    if (title) title.textContent = "Auto-Import Bookmarks";
    if (desc) desc.textContent = "This will scroll through your bookmarks and save them locally.";
    if (startBtn) {
      startBtn.textContent = "Start Sync";
      startBtn.style.backgroundColor = "var(--twtbk-accent, #1d9bf0)";
    }
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
    <p style="font-size: 13px; color: ${theme.textMuted}; margin-bottom: 16px; line-height: 1.4;">This will scroll through your bookmarks and save them locally.</p>
    <button id="twtbk-start-import-btn" style="width:100%; color: white; border: none; border-radius: 9999px; padding: 10px 16px; font-weight: 700; cursor: pointer; display: flex; justify-content: center; font-family: inherit; transition: background-color 0.2s;"></button>
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
        showToast("Import stopped.");
        updatePanelUI();
      } else {
        isImporting = true;
        totalImported = 0;
        lastScrollHeight = 0;
        sameHeightCount = 0;
        showToast("Starting Bookmarks Auto-Import...");
        updatePanelUI();
        setTimeout(() => runImportLoop(), 1500);
      }
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
      showToast('Import finished! Added ' + totalImported + ' new bookmarks.');
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
      showToast('Import finished! Added ' + totalImported + ' new bookmarks.');
      updatePanelUI();
      return;
    }

    if (isImporting) {
      window.scrollBy(0, window.innerHeight * 1.5);
      setTimeout(runImportLoop, 1500);
    }
  });
};
