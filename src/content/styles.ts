// Inject CSS styles for extension overlay elements (with light/dark theme support)
const styleTag = document.createElement('style');
styleTag.textContent = `
  :root {
    --twtbk-bg: #ffffff;
    --twtbk-text: #0f1419;
    --twtbk-text-muted: #536471;
    --twtbk-border: #eff3f4;
    --twtbk-accent: #1d9bf0;
    --twtbk-accent-hover: #1a8cd8;
    --twtbk-shadow: rgba(101, 119, 134, 0.2) 0px 0px 15px, rgba(101, 119, 134, 0.15) 0px 0px 3px 1px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --twtbk-bg: #000000;
      --twtbk-text: #e7e9ea;
      --twtbk-text-muted: #71767b;
      --twtbk-border: #2f3336;
      --twtbk-shadow: rgba(255,255,255,0.2) 0px 0px 15px, rgba(255,255,255,0.15) 0px 0px 3px 1px;
    }
  }
  /* ── TWTBK POPOVER ── */
  .twtbk-popover * { box-sizing: border-box; }
  .twtbk-popover {
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    position: fixed !important;
    background-color: var(--twtbk-bg);
    color: var(--twtbk-text);
    border: 1px solid var(--twtbk-border);
    border-radius: 16px;
    box-shadow: var(--twtbk-shadow);
    padding: 4px 0;
    z-index: 99999;
    width: 290px;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
  }
  /* Upward-pointing arrow */
  .twtbk-popover::before {
    content: "";
    position: absolute;
    top: -7px;
    right: 12px;
    border-width: 0 7px 7px 7px;
    border-style: solid;
    border-color: transparent transparent var(--twtbk-border) transparent;
  }
  .twtbk-popover::after {
    content: "";
    position: absolute;
    top: -6px;
    right: 13px;
    border-width: 0 6px 6px 6px;
    border-style: solid;
    border-color: transparent transparent var(--twtbk-bg) transparent;
  }
  /* New category row at top */
  .twtbk-new-cat-row {
    display: flex;
    gap: 0;
    padding: 4px 12px 4px 12px;
    border-bottom: 1px solid var(--twtbk-border);
    margin-bottom: 4px;
  }
  .twtbk-new-cat-row input {
    flex: 1;
    background: transparent;
    color: var(--twtbk-text);
    border: none;
    outline: none;
    font-size: 15px;
    font-family: inherit;
    padding: 10px 0;
  }
  .twtbk-new-cat-row input::placeholder { color: var(--twtbk-text-muted); }
  .twtbk-add-btn {
    background: var(--twtbk-accent);
    color: #fff;
    border: none;
    border-radius: 9999px;
    padding: 4px 14px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    align-self: center;
    font-family: inherit;
    flex-shrink: 0;
  }
  .twtbk-add-btn:hover { background: var(--twtbk-accent-hover); }
  /* Category list items — match X's native menu row style */
  .twtbk-cat-list {
    max-height: 220px;
    overflow-y: auto;
    padding: 4px 0;
  }
  .twtbk-cat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 400;
    color: var(--twtbk-text);
    transition: background 0.15s;
    user-select: none;
  }
  .twtbk-cat-item:hover { background: rgba(128,128,128,0.1); }
  .twtbk-cat-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  /* Note area */
  .twtbk-note-row {
    border-top: 1px solid var(--twtbk-border);
    padding: 8px 16px;
    margin-top: 4px;
  }
  .twtbk-note-row textarea {
    width: 100%;
    background: transparent;
    color: var(--twtbk-text);
    border: none;
    outline: none;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    height: 44px;
  }
  .twtbk-note-row textarea::placeholder { color: var(--twtbk-text-muted); }
  
  /* ── TWTBK PANEL (Importer) ── */
  .twtbk-panel {
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--twtbk-bg);
    color: var(--twtbk-text);
    border: 1px solid var(--twtbk-border);
    border-radius: 16px;
    box-shadow: var(--twtbk-shadow);
    padding: 16px;
    z-index: 99999;
    box-sizing: border-box;
  }
  .twtbk-btn {
    border: none;
    border-radius: 9999px;
    padding: 8px 16px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.2s, opacity 0.2s;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .twtbk-btn-primary {
    background-color: var(--twtbk-accent);
    color: #ffffff;
  }
  .twtbk-btn-primary:hover {
    background-color: var(--twtbk-accent-hover);
  }
  @keyframes twtbk-pop-in {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;
document.head.appendChild(styleTag);
