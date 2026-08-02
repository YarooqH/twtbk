# Onboarding Strategy — twtbk

> **Scope**: Dashboard UI/UX, first-run experience, and progressive disclosure for new and existing users.
> **Goals**: Reduce friction on first save, surface features without overwhelming, and make every setting self-explanatory.
> **Addresses**: Issues 3.8–3.16, Section 4 (4.1–4.4).

---

## 1. Core Philosophy: Contextual Over Modal

The worst onboarding is a five-step wizard that users dismiss without reading. twtbk should embed guidance **exactly where the action happens**, with progressive disclosure so the UI stays clean for experts.

**Three-tier system:**

| Tier | When it fires | Format | Duration |
|------|--------------|--------|----------|
| **Tooltip tour** | First run, persistent until dismissed | Inline callout above the relevant control | Until user clicks "Got it" |
| **Tooltip nudge** | First time a specific setting is visited | Small floating hint beside the control | 5 seconds or until next interaction |
| **Help button** | Always available | Opens inline explanation panel in place | Toggles open/closed |

---

## 2. Save Mode Selector — Inline Guidance (4.1)

**Problem**: Users choose between "Injected" and "Native Override" without understanding what each means or what X.com will look like after.

**Solution**: Three visual states on the segmented control, each with an inline preview:

```
┌─ Injected ─┬─ Native Override ─┐
│ [preview mini action bar]       │
│ "Adds a button to X's action   │
│  bar, where YOU choose."        │
└─────────────────────────────────┘
```

**Implementation in `SaveConfigCard.tsx`:**

```tsx
const SAVE_MODE_DESCRIPTIONS: Record<SaveMode, { headline: string; body: string; preview: 'injected' | 'native' }> = {
  'injected': {
    headline: 'Your button, your spot',
    body: 'We add a dedicated Save button to X\'s action bar. Drag it anywhere.',
    preview: 'injected',
  },
  'native-override': {
    headline: 'Replace X\'s bookmark',
    body: 'We take over X\'s bookmark button. Choose "Replace" to open our dialog, or "Arrow" to add a dropdown.',
    preview: 'native',
  },
};
```

When `saveMode === 'injected'`, show a **mini live preview** of the InteractiveBar below the segmented control — a static 6-icon strip with a colored dot in the current position. This is not draggable; it's purely demonstrative.

When `saveMode === 'native-override'`, show a mini static strip with a dashed border on the bookmark icon and a tooltip on the `nativeOverrideAction` segmented control below it.

**State**: Store `hasSeenSaveModeTooltip` in `chrome.storage.local`. Show this tooltip block on first install only, and again when the user switches back to `injected` from `native-override` after a gap of >7 days.

---

## 3. Quick Save vs Normal Save — Toggle Label Clarity (4.2)

**Problem**: "Quick Save" sounds faster but users don't know if it skips the note/category step.

**Solution**: Add a small inline label beneath the toggle that updates dynamically:

```tsx
const QUICK_SAVE_LABELS: Record<boolean, { title: string; subtitle: string }> = {
  false: { title: 'Normal Save', subtitle: 'Opens our dialog every time — add a note or category before saving.' },
  true:  { title: 'Quick Save',  subtitle: 'Saves immediately. You can still add notes later from your dashboard.' },
};
```

Show the subtitle as small muted text below the toggle label. The subtitle changes live as the toggle flips, so users understand before they commit.

---

## 4. First-Run Discovery Flow

### 4.1 Welcome Banner (Day 1)

On first install, the dashboard shows a full-width **Welcome Banner** above the bookmark list:

```tsx
<div className="twtbk-welcome-banner">
  <h2>Your first save is waiting ✨</h2>
  <p>Go to any tweet on X.com and click the Save button in the action bar.</p>
  <p>The tweet will appear here instantly — organized, searchable, yours forever.</p>
  <button className="twtbk-btn-primary" onClick={dismissBanner}>
    Got it, let's go →
  </button>
</div>
```

**Dismiss behavior**: Banner hides via CSS (`display: none`, not removal from DOM so it doesn't reappear). State stored in `chrome.storage.local: { welcomeBannerDismissed: true }`.

### 4.2 Empty State Enhancement

The empty state ("No bookmarks yet") already exists but is static. Upgrade it to a **guided empty state**:

```tsx
// When bookmarks.length === 0 && !isLoading:
<EmptyState variant="first-run" steps={[
  { icon: <TweetIcon />,      text: 'Find a tweet on X.com worth keeping' },
  { icon: <SaveIcon />,        text: 'Click the Save button in the tweet\'s action bar' },
  { icon: <DashboardIcon />,   text: 'It appears here — searchable, organized' },
]} />
```

Show a small "where is the button?" expandable:

```tsx
<details>
  <summary>Where is the Save button on X?</summary>
  <InlineScreenshot type="injected" /> {/* or "native" based on settings */}
</details>
```

The screenshot is an `<img>` of a mock tweet action bar, not a live capture. Keep it simple — a simplified wireframe is more useful than a pixel-perfect mock that goes stale with X's UI changes.

### 4.3 First Save Celebration

On the **very first** successful save, show a brief in-app celebration (not a modal, not a toast):

```tsx
// Insert into the bookmark list as the first item, animate in, auto-remove after 4s
<div className="twtbk-first-save-celebration">
  <span className="twtbk-celebration-emoji">🎉</span>
  <p><strong>First tweet saved!</strong> Find it in your dashboard any time.</p>
</div>
```

Style: subtle slide-in from top, yellow-tinted background (`var(--accent)10`), icon + one line of copy + auto-dismiss. Do **not** show this on subsequent saves.

---

## 5. Settings Panel Discoverability (3.8, 3.9)

**Problem**: The settings panel is collapsed by default. New users don't know it's there or what it controls.

**Solution — three nudges in escalating order:**

### 5.1 Persistent Hint (Always visible, fades over time)

In the bottom-right corner of the dashboard, add a subtle floating hint:

```tsx
{!settingsExpanded && (
  <button
    className="twtbk-settings-hint"
    onClick={() => setSettingsExpanded(true)}
    aria-label="Open settings"
  >
    <SettingsIcon size={14} />
    <span className="twtbk-hint-text">Settings</span>
  </button>
)}
```

This replaces the existing `<div onClick>` toggle with a proper `<button>`. It stays visible at all times — not hidden, not only on hover. After the user opens settings 3 times, the hint label hides (shows only the icon). After 10 opens, the hint fades to a very subtle opacity.

### 5.2 First-Run Settings Nudge

When `welcomeBannerDismissed === true` and `settingsExpanded === false` and the user has saved at least 1 tweet, show a one-time contextual nudge in the sidebar:

```tsx
// Inside Sidebar, below category list:
{showSettingsNudge && (
  <div className="twtbk-settings-nudge">
    <p>💡 Tip: Customize how the Save button looks in <button onClick={openSettings}>Settings</button></p>
    <button className="twtbk-nudge-dismiss" onClick={dismissSettingsNudge}>✕</button>
  </div>
)}
```

### 5.3 Settings Panel Header

Inside the expanded settings panel, add a clear header:

```tsx
<div className="twtbk-settings-header">
  <h2>Settings</h2>
  <p>Configure how twtbk works on X.com and in your dashboard.</p>
</div>
```

---

## 6. Keyboard Shortcuts Discoverability (3.12)

**Problem**: Power users want keyboard shortcuts but there's no cheat sheet.

**Solution — command palette (not a modal, not a static page):**

Triggered by `/` anywhere in the dashboard, or via a `<kbd>?</kbd>` button in the dashboard header.

```tsx
// Simple inline overlay, not a full modal:
const CommandPalette = ({ onClose }: { onClose: () => void }) => (
  <div className="twtbk-command-palette" role="dialog" aria-label="Keyboard shortcuts">
    <div className="twtbk-cmd-header">
      <span>Keyboard Shortcuts</span>
      <button onClick={onClose} aria-label="Close">✕</button>
    </div>
    <div className="twtbk-cmd-list">
      {SHORTCUTS.map(({ keys, label, category }) => (
        <div className="twtbk-cmd-row" key={label}>
          <span className="twtbk-cmd-category">{category}</span>
          <span className="twtbk-cmd-label">{label}</span>
          <span className="twtbk-cmd-keys">
            {keys.map(k => <kbd key={k}>{k}</kbd>)}
          </span>
        </div>
      ))}
    </div>
  </div>
);
```

**Shortcuts to document (from 3.12):**

| Keys | Action | Category |
|------|--------|----------|
| `?` | Open this cheat sheet | General |
| `/` | Focus search | Navigation |
| `n` | New note on selected bookmark | Bookmark |
| `e` | Edit note on selected bookmark | Bookmark |
| `Del` | Delete selected bookmark | Bookmark |
| `Esc` | Close dialog / deselect | General |

Style: dark overlay behind, centered white card, keyboard keys rendered as `<kbd>` elements with `border: 1px solid var(--border)`, `border-radius: 4px`, `padding: 2px 6px`, `font-family: monospace`.

---

## 7. Feature Explanations — Inline Help System

Every non-obvious setting needs a `?` help button. Use a consistent pattern:

```tsx
const SettingRow = ({ label, description, children, helpKey }: SettingRowProps) => (
  <div className="twtbk-setting-row">
    <div className="twtbk-setting-label">
      <span>{label}</span>
      <button
        className="twtbk-help-btn"
        aria-label={`Help: ${label}`}
        onClick={() => toggleHelp(helpKey)}
      >
        ?
      </button>
    </div>
    {description && <p className="twtbk-setting-desc">{description}</p>}
    {isHelpOpen(helpKey) && (
      <div className="twtbk-setting-help">
        {HELP_CONTENT[helpKey]}
      </div>
    )}
    <div className="twtbk-setting-control">{children}</div>
  </div>
);
```

**Help content keys and content:**

| Key | Setting | Help Content |
|-----|---------|--------------|
| `save-mode` | Save Mode | "Injected adds a dedicated button. Native Override takes over X's existing bookmark. Use Injected if you want both buttons visible." |
| `override-action` | Override Action | "Replace: clicking X's bookmark opens our save dialog. Arrow: clicking shows a small dropdown with Save / Save & Add Note." |
| `quick-save` | Quick Save | "On: tweets save instantly without prompting for a note. Off: you can always add a note from the dashboard later." |
| `auto-categorize` | Auto-categorize | "When enabled, we analyze each tweet's text and media to suggest a category. You can always change it manually." |
| `sync-importer` | Sidebar Importer | "Reads bookmarks from your browser's built-in X bookmark sidebar. Run once to migrate existing saves." |
| `injected-position` | Button Position | "Choose where the Save button appears in the action bar. Drag the chip above the bar to reposition it." |

---

## 8. Responsive Settings Reachability (3.9)

**Problem**: On mobile, the settings panel may be unreachable or obstructed.

**Solution**: Settings panel becomes a **slide-in drawer** on narrow viewports (< 640px):

```tsx
// In Dashboard.tsx:
const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

// CSS: @media (max-width: 639px)
// Mobile: settings panel is position: fixed, right: 0, top: 0, height: 100vh, width: min(320px, 90vw)
// z-index: 100, transform: translateX(mobileSettingsOpen ? '0' : '100%')
// Overlay behind: position: fixed, inset: 0, background: rgba(0,0,0,0.5), z-index: 99

// Trigger: existing settings hint button or a dedicated mobile menu item
```

---

## 9. Delete Undo Toast (3.16)

The existing `Toast` component is already positioned correctly. Extend it to support undo:

```tsx
interface ToastProps {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number; // default 3500ms
}

// Usage:
toast('Bookmark deleted', {
  label: 'Undo',
  onClick: () => restoreBookmark(deletedBookmark),
});
```

**Implementation**: Add `action` field to `Toast`. When `action` is provided, render a styled `<button>` to the right of the message with `color: var(--accent)`, `font-weight: 600`. Extend `duration` to 6000ms when an undo action is present.

---

## 10. Card Hover Actions & Mobile Affordances (3.11)

**Problem**: On touch devices, hover-reveal actions are invisible.

**Solution — always-visible actions with progressive disclosure:**

```tsx
// In BookmarkCard.tsx:
// Desktop: actions revealed on hover (existing behavior)
// Touch/mobile: always show first action icon, expand all on tap

const [actionsExpanded, setActionsExpanded] = useState(false);

<div
  className={`twtbk-bookmark-actions ${isTouchDevice ? 'twtbk-actions-visible' : ''}`}
  onClick={isTouchDevice ? () => setActionsExpanded(!actionsExpanded) : undefined}
>
  {/* All actions always rendered, visibility toggled */}
</div>
```

On touch devices, the actions row is always visible (`opacity: 1`). The first tap on the actions row (if no individual action button was the target) toggles the full row. On desktop, the existing hover behavior is unchanged.

---

## 11. Accessibility — Quick Wins (3.12, 3.13, 3.14)

**3.12 — Keyboard navigation:**
- Convert all `<div onClick>` to `<button>` throughout the dashboard (Sidebar category items, settings toggle, etc.)
- Add `tabIndex={0}` with `onKeyDown` for custom components (InteractiveBar zone cells already have `onClick`; add `role="radio"` and `aria-checked` for the radio-group behavior)
- Add skip link: `<a href="#main-content" className="twtbk-skip-link">Skip to content</a>`

**3.13 — Dropdowns:**
- Replace `div[role="menu"]` with `<menu>` or add `role="menu"` to the wrapping `<ul>`
- Each `<li>` with a dropdown item becomes `<button role="menuitem">`
- Category picker in BookmarkCard: wrap in a `<label>` with `id`, point `aria-labelledby` at it

**3.14 — Focus management for dialogs:**
- Modal (delete confirmation): add `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title, focus the cancel button on open, return focus to the trigger on close
- Command palette: focus the first `<kbd>` row or the close button on open

**3.16 — Toast (already has `role="status"`, good):**
- Add `aria-live="polite"` to the container

---

## 12. Implementation Priority

| # | Feature | Impact | Effort | Phase |
|---|---------|--------|--------|-------|
| 1 | Save Mode inline descriptions + preview | High | Medium | 1 |
| 2 | Quick Save toggle labels | High | Low | 1 |
| 3 | Welcome Banner | High | Low | 1 |
| 4 | Guided Empty State | Medium | Low | 1 |
| 5 | First Save Celebration | Medium | Low | 1 |
| 6 | Settings nudge + `<button>` fix | Medium | Low | 1 |
| 7 | Command Palette (`?` / `/`) | Medium | Medium | 2 |
| 8 | Inline Help System (`?` per setting) | Medium | Medium | 2 |
| 9 | Mobile Settings Drawer | Medium | Medium | 2 |
| 10 | Undo Toast extension | Low | Low | 2 |
| 11 | Touch action row always-visible | Low | Low | 2 |
| 12 | Full accessibility audit pass | Medium | High | 3 |

**Phase 1** is the critical path: the save-mode descriptions, quick-save labels, welcome banner, and empty state guide are what new users encounter on their first session. Get these right before adding deeper features.

**Phase 2** layers power-user features on top of the baseline. Command palette and inline help are what convert casual users into power users.

**Phase 3** is polish: full WCAG audit, focus trap pass, ARIA quality.

---

## 13. Key Design Principles

1. **Never block the user.** Every onboarding element must be dismissible in one click, never interrupts a flow in progress, and never reappears after dismissal.
2. **Show, don't just tell.** Inline mini-previews (the action bar strip under Save Mode) teach faster than paragraphs of copy.
3. **Expert mode by default.** Hide the onboarding scaffolding entirely once a user has completed the core actions (first save, opened settings). The settings nudge hint should be the only persistent signal, and it fades.
4. **One thing at a time.** The save-mode selector already asks users to make a meaningful decision. Don't add a tooltip tour at the same time. Let users settle on a mode, then surface next-step hints.
5. **Treat mobile as first-class.** Every feature above works on touch. The mobile settings drawer is non-negotiable for usability on tablets.
