# XMarks — Master Issues, Bug Tracker & Product Backlog

> **Canonical Issue & Task Registry for XMarks Extension**
> 
> This document consolidates all bug reports, structural audits, code reviews, UI/UX recommendations, and product backlog items from across the project documentation (`CODE_REVIEW.md`, `INJECT_SCRIPT_REVIEW.md`, `INJECT_AND_INTERACTIVE_BAR_REVIEW.md`, `UI_IMPROVEMENTS.md`, and `todo.txt`).
>
> **Status Legend:**  
> - `[Fixed]` — Fully implemented, tested, and verified in code.  
> - `[In Progress]` — Currently being addressed or active in design/code.  
> - `[Open]` — Confirmed bug or planned task awaiting implementation.  
> - `[Question / Backlog]` — Product clarification needed or feature request.

---

## 📊 Status Summary & Audit Matrix

| Category | Total Items | Resolved | Open / Backlog |
| :--- | :---: | :---: | :---: |
| **1. Content Script & DOM Injection** | 15 | 8 | 7 |
| **2. InteractiveBar & Drag-and-Drop** | 6 | 2 | 4 |
| **3. Dashboard UI, UX & Interaction** | 16 | 7 | 9 |
| **4. Onboarding, Guidance & Mode Clarity** | 4 | 0 | 4 |
| **5. Performance, Hygiene & Security** | 8 | 7 | 1 |
| **6. Accessibility & Visual System** | 10 | 1 | 9 |
| **8. Cursor Composer 2.5 Audit** | 37 | 0 | 37 |
| **Total** | **96** | **25** | **71** |

---

## 1. Content Script & DOM Injection Issues

### 1.1 `[Fixed]` Fake Tweet IDs Break Deduplication
- **Location**: `src/content/inject.ts` (`extractTweetData`)
- **Details**: Previously generated `id = 'unknown_' + Date.now()`, breaking ID-based deduplication when a tweet `/status/` ID couldn't be parsed.
- **Resolution**: Returns `null` when status ID cannot be resolved, preventing duplicate database entries.

### 1.2 `[Fixed]` MutationObserver Debounce Coalescing
- **Location**: `src/content/inject.ts`, `src/content/navigation.ts`
- **Details**: Observer fired on every DOM mutation, scanning all tweets repeatedly on fast scroll or picker renders.
- **Resolution**: Coalesced via `requestAnimationFrame` (`debouncedInjectSaveButtons`), restricting updates to one per frame and narrowing target elements.

### 1.3 `[Fixed]` Persisted Settings Loading Race Condition
- **Location**: `src/content/inject.ts`
- **Details**: Content script initialized before `chrome.storage.sync.get` resolved, causing flash of default injection mode.
- **Resolution**: Injections now wait for `settingsLoaded` flag to be `true`.

### 1.4 `[Fixed]` Native Replace Click Handling Override
- **Location**: `src/content/inject.ts`
- **Details**: In `replace` mode, native click listener allowed X to process the bookmark click simultaneously.
- **Resolution**: Intercepts native event (`preventDefault` / `stopPropagation`) so extension exclusively owns click handling.

### 1.5 `[Fixed]` Passive Saved State for Native `removeBookmark`
- **Location**: `src/content/inject.ts`
- **Details**: Saved state was missed when X toggled `data-testid="removeBookmark"`.
- **Resolution**: Listener recognizes both `bookmark` and `removeBookmark` states.

### 1.6 `[Fixed]` Overwriting Native Action SVG
- **Location**: `src/content/inject.ts`
- **Details**: Saving replaced native X SVG icon rather than extension clone.
- **Resolution**: Scoped `markButtonAsSaved` to extension-injected wrappers only.

### 1.7 `[Fixed]` Saved State Indicator on Injected Button (`C1`)
- **Location**: `src/content/inject.ts`, `src/background.ts`
- **Details**: Injected button appeared identical whether saved or unsaved.
- **Resolution**: Added `CHECK_TWEET_SAVED` check on injection to tint icon and update tooltip when already in database.

### 1.8 `[Fixed]` Sidebar Importer Button Placement (`W4`)
- **Location**: `src/content/index.ts` (`injectImporterSidebarUI`)
- **Details**: Importer button failed to render when X changed sidebar DOM.
- **Resolution**: Implemented fallback chain targeting primary left `<nav>` or `<header role="banner">`.

### 1.9 `[Fixed]` Single Tweet Detail View Icon Appearance
- **Location**: `src/content/inject.ts`, `src/content/xDomAdapter.ts`
- **Details**: `todo.txt`: Extension icon scaling/alignment looks distorted when viewing a single tweet detail page (`/status/123...`) compared to timeline feeds, specifically on the edges (leftmost/rightmost).
- **Resolution**: Removed hardcoded flex/align-items overrides to allow perfect structural inheritance of X's native spacing.

### 1.10 `[Fixed]` Articles & Card Attachments Not Saving Properly
- **Location**: `src/content/extract.ts` (`extractTweetData`)
- **Details**: `todo.txt`: Tweets containing external articles or rich cards sometimes fail to preserve thumbnail or link metadata.
- **Resolution**: Implemented card extractor fallback for `[data-testid="card.wrapper"]` and detail layouts to safely preserve URL metadata and titles.

### 1.11 `[Fixed]` Idempotency WeakMap Rebuilds on Complex Positions
- **Location**: `src/content/inject.ts` (lines 100-110)
- **Details**: `computePlacement()` returns position string unchanged, causing `validateWrapper` checks to fail for non-standard positions and rebuilding wrappers unnecessarily.
- **Resolution**: Handled cleanly in `resolvePlacementAnchor` so fallbacks do not break `dataset` parity idempotency loop.

### 1.12 `[Fixed]` Silent Tweet ID Extraction Failure
- **Location**: `src/content/inject.ts`
- **Details**: When `getTweetId` returns `null`, `tweetId` defaults to `''`, causing wrapper validation to fail every frame.
- **Resolution**: Added explicit existence check for `tweetId` and early return loop abort with a dev-mode warning.

### 1.13 `[Fixed]` Action Bar Score Threshold Fragility
- **Location**: `src/content/inject.ts` (`scoreActionGroup`)
- **Details**: `scoreActionGroup` drops below threshold if X renames action `data-testid` attributes, silently halting all injection.
- **Resolution**: Added explicit dev-mode warnings when a tweet fails the `MIN_ACTION_BAR_SCORE` check.

### 1.14 `[Fixed]` `findActionItem` Unrecognized TestId Fallback
- **Location**: `src/content/inject.ts`
- **Details**: Unrecognized test IDs bypass `xDomAdapter` confidence scoring, masking adapter resolution failures.
- **Resolution**: Guarded with warning flags for unrecognized test IDs to surface adapter gaps early.

### 1.15 `[Fixed]` Duplicate Arrow Mode Insertion Logic
- **Location**: `src/content/inject.ts`
- **Details**: Arrow mode placement duplicates `next-to-bookmark` insertion logic without share fallback.
- **Resolution**: Refactored insertion structure into unified `insertAfter` helper.

---

## 2. `InteractiveBar.tsx` & Drag & Drop Issues

### 2.1 `[Fixed]` Injected Button Placement inside Zone Cells (`1.3`)
- **Location**: `src/dashboard/components/InteractiveBar.tsx`
- **Details**: Placed button rendered inside an expanding flex zone rectangle (`flex: 1 1 0`), causing visual distortion for `next-to-bookmark` and `rightmost`.
- **Resolution**: Updated active slot rendering to a fixed standalone icon cell (`flex: 0 0 auto`, `minWidth: 28px`) with 26x26px icon container.

### 2.2 `[Fixed]` Drag-and-Drop Slot Calculation (`1.1`)
- **Location**: `src/dashboard/components/InteractiveBar.tsx` (`getSlotFromMouseX`)
- **Details**: Assumed equal 100% distribution across zones without accounting for fixed 22px native icon widths.
- **Resolution**: Updated `getSlotFromMouseX` and cell structure to properly map mouse coordinates to action bar slots.

### 2.3 `[Open]` View-Aware Native Icon Count (`1.2`)
- **Location**: `src/dashboard/components/InteractiveBar.tsx`
- **Details**: Bar always displays 6 native icons including "Views", but tweet detail pages omit Views.
- **Plan**: Introduce `hasViews` prop or toggle to preview action bar layouts accurately.

### 2.4 `[Open]` Container & Zone Level `onDragOver` Redundancy (`1.4`)
- **Location**: `src/dashboard/components/InteractiveBar.tsx`
- **Details**: Container and individual zone cells both handle `onDragOver`, causing transient highlight flickering.
- **Plan**: Consolidate drag handlers strictly to zone cells.

### 2.5 `[Open]` Position Customization / Alternative Icon Selection
- **Location**: `src/dashboard/components/InteractiveBar.tsx`, `todo.txt`
- **Details**: `todo.txt`: User request to choose which icon style/symbol is rendered for the injected bookmark button.
- **Plan**: Add icon picker control in `SaveConfigCard.tsx` / `InteractiveBar.tsx`.

### 2.6 `[Open]` Type Inconsistency in Settings & InteractiveBar (`3.1`, `3.2`)
- **Location**: `src/dashboard/components/InteractiveBar.tsx`, `src/content/settings.ts`
- **Details**: `SlotId` internal types diverge from persisted `injectedPosition` string union.
- **Plan**: Centralize position union types into a shared `src/types.ts`.

---

## 3. Dashboard UI, UX & Interaction

### 3.1 `[Fixed]` Delete Dead Boilerplate (`W1`, `W5`)
- **Location**: `src/App.css`, `src/dashboard/Dashboard.tsx`
- **Details**: Unused `App.css` and orphan state variables (`catMenuPickingColor`, `catMenuRenaming`).
- **Resolution**: Removed `App.css` and cleaned up unused React states.

### 3.2 `[Fixed]` Replace Google Fonts `@import` (`W2`)
- **Location**: `src/index.css`
- **Details**: External Google Fonts `@import` caused render blocking and CSP failures.
- **Resolution**: Switched to system font stack (`'Inter', -apple-system, sans-serif`).

### 3.3 `[Fixed]` Display Posted Date vs Saved Date (`I8`)
- **Location**: `src/dashboard/components/BookmarkCard.tsx`
- **Details**: Card only displayed `savedAt` timestamp.
- **Resolution**: Displays both original `createdAt` post date and `savedAt` timestamp.

### 3.4 `[Fixed]` Dynamic Import for AI Classifier (`Code Review #10`)
- **Location**: `src/dashboard/Dashboard.tsx`, `src/utils/classifier.ts`
- **Details**: 847 KB initial bundle size due to Transformers.js inclusion.
- **Resolution**: Split classifier into on-demand lazy chunk (initial bundle down to 39 KB).

### 3.5 `[Fixed]` Import O(n²) Dedup Optimization (`Code Review #2`)
- **Location**: `src/content/index.ts`, `src/background.ts`
- **Details**: Import loop queried database sequentially per tweet.
- **Resolution**: Batch dedup queries in background service worker.

### 3.6 `[Fixed]` Date Revival on JSON Import (`Code Review #3`)
- **Location**: `src/dashboard/Dashboard.tsx`
- **Details**: Date strings in imported JSON broke date-sorting.
- **Resolution**: Added explicit `new Date()` revivers in `handleImport`.

### 3.7 `[Fixed]` Double-Polling Navigation Listener (`Code Review #6`)
- **Location**: `src/content/index.ts`
- **Details**: Used `setInterval` for URL monitoring.
- **Resolution**: Replaced with `popstate` and `pushState` monkey-patching.

### 3.8 `[Open]` Collapsible Settings Panel in Dashboard
- **Location**: `src/dashboard/components/SettingsPanel.tsx`, `todo.txt`
- **Details**: `todo.txt`: Settings panel occupies permanent vertical space; needs collapse/expand toggle.
- **Plan**: Add collapsible card wrapper with persistent state in `localStorage` or `chrome.storage.sync`.

### 3.9 `[Open]` Responsive Settings Reachability (`W3`)
- **Location**: `src/index.css` (media query at 1100px)
- **Details**: Settings sidebar completely disappears on viewports < 1100px.
- **Plan**: Implement responsive overlay drawer or modal triggerable via top nav gear icon.

### 3.10 `[Open]` Replace Native `confirm()` / `alert()` with In-App Dialogs (`W4`, `todo.txt`)
- **Location**: `Dashboard.tsx`, `popover.ts`, `todo.txt`
- **Details**: `todo.txt`: Avoid native browser popups; use custom themed dialogs and toasts instead.
- **Plan**: Replace `window.confirm` and `window.alert` with reusable `<Dialog>` and `<Toast>` components.

### 3.11 `[Fixed]` Card Hover Actions & Mobile Affordances (`I1`)
- **Location**: `src/dashboard/components/BookmarkCard.tsx`
- **Details**: Actions menu hidden behind hover (`opacity: 0`), inaccessible on touch devices.
- **Plan**: Add persistent overflow menu button (`⋯`) visible on touch or keyboard focus.

### 3.12 `[Fixed]` Keyboard Navigation & Shortcuts (`I2`)
- **Location**: `src/dashboard/Dashboard.tsx`
- **Details**: Lack of keyboard shortcuts for search (`/`), category navigation (`g a`), or note editing (`e`).
- **Plan**: Create `useKeyboardShortcuts` hook and cheat-sheet overlay.

### 3.13 `[Fixed]` Accessible Custom Dropdowns (`I3`)
- **Location**: `BookmarkCard.tsx`, `Sidebar.tsx`
- **Details**: Custom dropdowns use plain `<div>` clicks without keyboard or ARIA support.
- **Plan**: Implement ARIA menu patterns (`role="menu"`, `aria-expanded`, arrow key navigation).

### 3.14 `[Fixed]` Bulk Selection & Multi-Row Actions (`I4`)
- **Location**: `src/dashboard/components/BookmarkList.tsx`
- **Details**: Unable to select multiple bookmarks to delete, tag, or export.
- **Plan**: Add selection checkboxes and sticky multi-select action bar.

### 3.15 `[Fixed]` Tags Support in UI (`I5`)
- **Location**: `src/db/index.ts`, `src/dashboard/components/BookmarkCard.tsx`
- **Details**: `Bookmark.tags` exists in Dexie schema but has no input or filter UI in dashboard.
- **Plan**: Add tag chips to cards, popover tag input, and tag filter list to sidebar.

### 3.16 `[Fixed]` Undo Toast for Deletions (`I6`)
- **Location**: `src/dashboard/Dashboard.tsx`
- **Details**: Immediate hard deletion via browser confirm prompt.
- **Plan**: Implement optimistic deletion with 6-second undo toast window.

---

## 4. Onboarding, Guidance & Mode Clarity

### 4.1 `[Question / Backlog]` Injected vs Native Override Mode Guidance
- **Location**: `src/dashboard/components/SaveConfigCard.tsx`, `todo.txt`
- **Details**: `todo.txt`: "What is the exact difference between injected and native override mode and when should I use which?" Users need clear inline guidance.
- **Plan**: Add explanatory tooltips & visual comparison graphic in `SaveConfigCard.tsx`:
  - **Injected Mode**: Adds a dedicated extra button next to X's actions. *Best for keeping X native features untouched.*
  - **Native Override Mode**: Replaces or intercepts X's native bookmark button to open XMarks dialog. *Best for a seamless single-button workflow.*

### 4.2 `[Question / Backlog]` Normal Save vs Quick Save Guidance
- **Location**: `src/dashboard/components/SaveConfigCard.tsx`, `todo.txt`
- **Details**: `todo.txt`: "What is the exact difference between normal save and quick save? And when should I use which?"
- **Plan**: Document and surface inline help text:
  - **Normal Save**: Opens category/tag/note picker popover immediately upon clicking save.
  - **Quick Save**: Instantly saves tweet to default category in 1-click without opening popover (category can be edited later in dashboard).

### 4.3 `[Open]` Dashboard Guidance & Feature Explanations
- **Location**: `src/dashboard/Dashboard.tsx`, `todo.txt`
- **Details**: `todo.txt`: "The dashboard needs proper guidance; still too many things are vague and might confuse users as to what does which."
- **Plan**: Add contextual feature tour / tooltips and an interactive Help & FAQ section in dashboard.

### 4.4 `[Open]` Auto-Sync / Sidebar Importer Guidance
- **Location**: `src/content/importer.ts`, `todo.txt`
- **Details**: `todo.txt`: "Fix auto-sync bookmark (it is not there in the top bar)." Clarify bookmark sync process.
- **Plan**: Add top bar sync button / status indicator linking directly to X bookmarks sync flow.

---

## 5. Performance, Code Hygiene & Security

### 5.1 `[Fixed]` Manifest `default_title` (`Code Review #9`)
- **Location**: `manifest.json`
- **Details**: Action title missing.
- **Resolution**: Set `"default_title": "XMarks - Twitter Bookmark Manager"`.

### 5.2 `[Fixed]` Production Debug Log Cleanup (`Code Review #7`)
- **Location**: `src/content/inject.ts`
- **Details**: Verbose `TWTBK Debug` logs in production build.
- **Resolution**: Stripped all production `console.log` statements.

### 5.3 `[Fixed]` Transformers.js Deprecated Package Migration (`Code Review #8`)
- **Location**: `package.json`, `src/utils/classifier.ts`
- **Details**: Used deprecated `@xenova/transformers` library.
- **Resolution**: Migrated to `@huggingface/transformers@^3.8.1`.

### 5.4 `[Open]` `onnxruntime-web` CSP `eval` Warning (`Code Review #13`)
- **Location**: `src/utils/classifier.ts`
- **Details**: ONNX runtime contains fallback `eval()` paths that may trigger MV3 CSP warnings under `script-src 'self' 'wasm-unsafe-eval'`.
- **Plan**: Ensure WASM execution path is strictly pinned without fallback `eval`.

### 5.5 `[Open]` List Virtualization for Large Datasets (`N1`)
- **Location**: `src/dashboard/components/BookmarkList.tsx`
- **Details**: Mounting thousands of DOM nodes causes frame drops when filtering or scrolling.
- **Plan**: Integrate `react-virtuoso` or windowing observer for bookmark list.

### 5.6 `[Open]` Debounced Search Query (`N2`)
- **Location**: `src/dashboard/Dashboard.tsx`
- **Details**: Search filtering evaluates whole collection synchronously on every keystroke.
- **Plan**: Wrap `searchQuery` in React 19 `useDeferredValue`.

### 5.7 `[Open]` Dexie Search Indexing (`N3`)
- **Location**: `src/db/index.ts`
- **Details**: Search performs full array scan rather than indexed lookup.
- **Plan**: Add multiEntry indexes for `tags` and `notes`.

### 5.8 `[Open]` Single Animation Frame Debounce Race (`3.3`)
- **Location**: `src/content/inject.ts` (`debouncedInjectSaveButtons`)
- **Details**: Single RAF debounce can race with rapid MutationObserver DOM batches.
- **Plan**: Add short timer buffer to MutationObserver callback.

---

## 6. Accessibility & Visual System

### 6.1 `[Fixed]` Save Mode Toggle UI Alignment (`UI #1`)
- **Location**: `src/dashboard/components/SaveConfigCard.tsx`
- **Details**: Segmented control styling for Injected vs Override modes.
- **Resolution**: Updated tab controls with high-contrast active states.

### 6.2 `[Open]` Color Contrast Audit in Dark Mode (`X1`)
- **Location**: `src/index.css`
- **Details**: `--text-subtle` (`#4a5568` on `#000`) falls below WCAG AA 4.5:1 ratio.
- **Plan**: Increase dark mode muted text contrast to `#8899a6`.

### 6.3 `[Open]` Accessible ARIA Labels on Icon Buttons (`X2`)
- **Location**: `src/dashboard/icons.tsx`, `BookmarkCard.tsx`
- **Details**: Action icon buttons lack `aria-label` or `aria-hidden` attributes.
- **Plan**: Add descriptive `aria-label` props to all interactive buttons.

### 6.4 `[Open]` Focus-Visible Style System (`X3`)
- **Location**: `src/index.css`
- **Details**: Interactive elements lack distinct `:focus-visible` outlines.
- **Plan**: Add global focus ring style (`outline: 2px solid var(--accent)`).

### 6.5 `[Open]` Keyboard Accessibility for Drag-and-Drop Picker (`X4`)
- **Location**: `src/dashboard/components/InteractiveBar.tsx`
- **Details**: Button position relies exclusively on mouse drag-and-drop.
- **Plan**: Add explicit dropdown/radio selection alternative for position selection.

### 6.6 `[Open]` Unified Accent Color Derivation (`V1`, `I10`)
- **Location**: `src/index.css`, `Dashboard.tsx`, `App.tsx`
- **Details**: Accent color hovers are hardcoded in JavaScript objects rather than CSS `color-mix`.
- **Plan**: Refactor accent hover/light states to CSS variables using `color-mix()`.

### 6.7 `[Open]` X Theme Synchronization (`V2`)
- **Location**: `src/content/navigation.ts`, `src/index.css`
- **Details**: Extension sniffing relies on 3 hardcoded background hexes; fails on custom X themes.
- **Plan**: Read X root CSS variables (`--background-color`) directly.

### 6.8 `[Open]` Avatar Styling Consistency (`V3`)
- **Location**: `src/dashboard/components/BookmarkCard.tsx`
- **Details**: Purple gradient avatar placeholder clashes with flat X design language.
- **Plan**: Switch to handle-derived flat color palette or clean border style.

### 6.9 `[Open]` Compact Card Density Toggle (`V4`)
- **Location**: `src/dashboard/components/BookmarkCard.tsx`, `src/index.css`
- **Details**: Large card padding (16px) limits scannability on desktop.
- **Plan**: Add Comfortable / Compact list view toggle.

### 6.10 `[Open]` Loading & Empty State Enhancements (`S1`, `S2`, `S3`)
- **Location**: `src/dashboard/components/BookmarkList.tsx`, `AICard.tsx`
- **Details**: Flash of empty state during IndexedDB loading; static empty state without action links.
- **Plan**: Add skeleton loading cards, actionable empty states with deep links, and explicit AI model download progress states.

---

## 7. Product Roadmap & Strategic Backlog

### Phase A: Core Polish & Usability (Immediate Focus)
1. Implement collapsible settings panel in Dashboard (`3.8`).
2. Add inline guidance tooltips for **Injected vs Native Override** and **Normal vs Quick Save** (`4.1`, `4.2`).
3. Replace browser `confirm()` / `alert()` with custom in-app `<Dialog>` / `<Toast>` (`3.10`).
4. Fix single tweet detail view icon rendering (`1.9`).
5. Fix article card metadata extraction (`1.10`).

### Phase B: Organization & Power User Features
1. Enable tag inputs in category popover and tag filters in Dashboard (`3.15`).
2. Add bulk selection and multi-row action toolbar (`3.14`).
3. Implement 6-second undo toast for deletions (`3.16`).
4. Add keyboard shortcuts (`/` search, `Esc` close, `g a` navigation) (`3.12`).

### Phase C: Accessibility & Scaling
1. Complete WCAG AA contrast audit and `:focus-visible` ring system (`6.2`, `6.4`).
2. Add ARIA labels to all icon buttons (`6.3`).
3. Add accessible fallback for position drag-and-drop (`6.5`).
4. Integrate `useDeferredValue` and list virtualization for 10,000+ bookmark collections (`5.5`, `5.6`).

---

## 8. Cursor Composer 2.5 Audit

> **Independent codebase review — Jul 2026**  
> Findings from a full pass over dashboard, popup, content script, and styling. Cross-references earlier sections where overlap exists; items here emphasize net-new observations or sharper framing.

### Status Summary

| Category | Items |
| :--- | :---: |
| UI | 7 |
| Accessibility | 8 |
| Performance | 5 |
| UX | 10 |
| Design Language | 7 |
| **Total** | **37** |

---

### 8.1 UI

#### 8.1.1 `[Open]` Bookmark Card Actions Hidden Until Hover
- **Location**: `src/index.css` (`.bm-actions { opacity: 0 }`), `src/dashboard/components/BookmarkCard.tsx`
- **Details**: Delete and external-link controls only appear on `:hover`. On touch devices and keyboard-only navigation they are effectively invisible unless the user discovers hover emulation.
- **Plan**: Always show a compact overflow menu (`⋯`) or keep actions visible at reduced opacity on `@media (hover: none)`.

#### 8.1.2 `[Open]` Whole-Card Click Target Fights Nested Interactions
- **Location**: `src/dashboard/components/BookmarkCard.tsx` (root `onClick={() => window.open(...)}`)
- **Details**: The entire card opens the tweet in a new tab. Notes, category picker, media tiles, and quoted tweets rely on `stopPropagation()` patches. Easy to mis-click and lose in-progress edits.
- **Plan**: Limit navigation to explicit "View tweet" / author links; remove the root click handler.

#### 8.1.3 `[Open]` Loading vs Empty State Not Distinguished
- **Location**: `src/dashboard/components/BookmarkList.tsx`, `src/dashboard/Dashboard.tsx`
- **Details**: When `useLiveQuery` is still resolving, `bookmarks` is `undefined` and `filteredBookmarks` becomes `[]`, showing "No bookmarks found" during load — a flash of false empty state.
- **Plan**: Gate the list on `bookmarks === undefined` with skeleton placeholders (see also `6.10`).

#### 8.1.4 `[Open]` Popup Recent List Lacks Dashboard Richness
- **Location**: `src/App.tsx`
- **Details**: Popup renders plain `{bm.text}` without mention/link formatting, quoted-tweet blocks, or article cards that `BookmarkCard` provides. Same data feels like a downgrade between surfaces.
- **Plan**: Extract shared tweet preview renderer or reuse a slim `BookmarkCard` variant in the popup.

#### 8.1.5 `[Open]` Article Card Background Breaks in Light Mode
- **Location**: `src/dashboard/components/BookmarkCard.tsx` (article blocks)
- **Details**: Article attachment rows use `background: 'rgba(255, 255, 255, 0.02)'`, which is nearly invisible on a white dashboard background and reads as a broken/missing card treatment.
- **Plan**: Replace with `var(--bg-secondary)` and shared `.bm-attachment` class.

#### 8.1.6 `[Open]` Settings Split Across Sidebar and Right Panel
- **Location**: `src/dashboard/components/SettingsPanel.tsx`, `src/dashboard/components/Sidebar.tsx` (`AICard`)
- **Details**: AI auto-categorize lives in the left sidebar (`AICard`) while save configuration and accent color live in the right settings panel. `SettingsPanel` accepts AI props but never renders `AICard`, so related settings are physically separated.
- **Plan**: Consolidate all configuration into one panel or add clear section grouping with cross-links.

#### 8.1.7 `[Open]` Responsive Layout Only Adapts Settings Column
- **Location**: `src/index.css` (`@media (max-width: 1100px)`)
- **Details**: Below 1100px the right settings drawer becomes a slide-over, but the 280px category sidebar remains fixed. On tablets the bookmark list is squeezed between two persistent columns.
- **Plan**: Collapse or drawer-ize the category sidebar at the same breakpoint, or stack to a single-column layout.

---

### 8.2 Accessibility

#### 8.2.1 `[Open]` Modal Missing Dialog Semantics and Focus Trap
- **Location**: `src/dashboard/components/Modal.tsx`
- **Details**: Overlay uses a plain `<div>` with no `role="dialog"`, `aria-modal`, `aria-labelledby`, initial focus, or Tab-cycle trap. Screen-reader and keyboard users can interact with content behind the modal.
- **Plan**: Add focus trap (e.g. `@radix-ui/react-dialog` or lightweight hook), `role="dialog"`, and restore focus on close.

#### 8.2.2 `[Open]` Settings Collapse Toggle Is Not a Button
- **Location**: `src/dashboard/components/SettingsPanel.tsx`
- **Details**: The "Settings" expand/collapse control is a `<div onClick>` without `role="button"`, `tabIndex`, or keyboard handlers.
- **Plan**: Replace with `<button type="button" aria-expanded={settingsExpanded}>`.

#### 8.2.3 `[Open]` Accent Color Swatches Are Non-Focusable Spans
- **Location**: `src/dashboard/components/SettingsPanel.tsx`
- **Details**: Color pickers are `<span onClick>` elements — not reachable or operable via keyboard, no `aria-label` describing each color.
- **Plan**: Use `<button type="button" aria-label="Accent: Blue">` with visible focus ring.

#### 8.2.4 `[Open]` Sort Dropdown Menu Lacks Menu Pattern
- **Location**: `src/dashboard/components/SortDropdown.tsx`
- **Details**: Trigger is a `<button>` but options are `<div onClick>` with no `role="menu"`, `role="menuitem"`, `aria-expanded`, or arrow-key navigation. Sort trigger also lacks `aria-label`.
- **Plan**: Implement WAI-ARIA menu pattern or native `<select>` for sort.

#### 8.2.5 `[Open]` Dashboard Icon Buttons Missing Accessible Names
- **Location**: `src/dashboard/components/BookmarkCard.tsx`, `src/dashboard/components/BookmarkList.tsx`, `src/dashboard/icons.tsx`
- **Details**: Link and delete controls use `title` only; SVG icons have no `aria-hidden`. Header Export/Import/Settings buttons rely on visible text but icon-only variants would fail audit.
- **Plan**: Add `aria-label` to all icon-only controls; mark decorative SVGs `aria-hidden="true"`.

#### 8.2.6 `[Open]` Category Sidebar Items Not Keyboard Operable
- **Location**: `src/dashboard/components/Sidebar.tsx`
- **Details**: Category filter rows are `<li onClick>` without `tabIndex`, Enter/Space handlers, or `aria-current` for the active filter.
- **Plan**: Use `<button>` inside list items or add roving tabindex + `aria-current="true"`.

#### 8.2.7 `[Open]` Note Textarea Missing Label Association
- **Location**: `src/dashboard/components/BookmarkCard.tsx`
- **Details**: Inline note editor uses `<textarea placeholder="...">` with no `<label>` or `aria-label`, so assistive tech announces an unlabeled field.
- **Plan**: Add visually hidden `<label htmlFor>` or `aria-label="Bookmark note"`.

#### 8.2.8 `[Open]` No `prefers-reduced-motion` Handling
- **Location**: `src/index.css` (`twtbk-fade-in`, `twtbk-scale-up`, `twtbk-slot-pop`, `InteractiveBar.tsx` drag animations)
- **Details**: Popover, modal, toast, and slot-pop animations always run. Vestibular-sensitive users get no reduced-motion fallback.
- **Plan**: Wrap animations in `@media (prefers-reduced-motion: no-preference)` and disable transforms otherwise.

---

### 8.3 Performance

#### 8.3.1 `[Open]` Full Table Loaded on Every Dashboard Mount
- **Location**: `src/dashboard/Dashboard.tsx` (`db.bookmarks.orderBy('savedAt').reverse().toArray()`)
- **Details**: All bookmarks are fetched into memory at once. Filtering and sorting happen in JS on the full array. Large libraries will slow initial paint and every settings change that triggers re-render.
- **Plan**: Paginate or virtualize list; defer sort/filter to IndexedDB queries where possible (see also `5.5`, `5.7`).

#### 8.3.2 `[Open]` Synchronous Filter + Sort on Every Keystroke
- **Location**: `src/dashboard/Dashboard.tsx` (`filteredBookmarks` `useMemo`)
- **Details**: Search re-filters and re-sorts the entire in-memory array on each character with no debounce or `useDeferredValue`.
- **Plan**: Debounce input or use React 19 `useDeferredValue` for `searchQuery` (see also `5.6`).

#### 8.3.3 `[Open]` Tweet Text Formatting Regex Runs Per Render Per Card
- **Location**: `src/dashboard/components/BookmarkCard.tsx` (`renderFormattedTweetText`, `repairTweetText`)
- **Details**: Complex URL/mention/hashtag regex parsing executes on every render for every visible card, including quoted tweets.
- **Plan**: Memoize formatted output per `bookmark.id` + `bookmark.text` with `useMemo` or precompute on save.

#### 8.3.4 `[Open]` Sidebar Re-Counts Categories on Every Render
- **Location**: `src/dashboard/components/Sidebar.tsx`
- **Details**: Each category row runs `bookmarks?.filter(b => b.categoryIds.includes(cat.id)).length` inside `.map()`, an O(categories × bookmarks) pass per render.
- **Plan**: Precompute counts once in `useMemo` keyed on `bookmarks` and `categories`.

#### 8.3.5 `[Open]` Popup Fetches Categories for All Recent Items
- **Location**: `src/App.tsx`
- **Details**: Category badges resolve via `categories.find()` inside each recent-bookmark map. Minor today (5 items) but duplicates lookup pattern that scales poorly if popup shows more.
- **Plan**: Build a `Map<id, Category>` once via `useMemo`.

---

### 8.4 UX

#### 8.4.1 `[Fixed]` Search Ignores Notes and Tags
- **Location**: `src/dashboard/Dashboard.tsx` (`filteredBookmarks`)
- **Details**: Search only matched `text`, `authorName`, and `authorHandle`. Notes, quoted tweet text/author, and article titles could not be searched.
- **Resolution**: Updated `filteredBookmarks` predicate to match `b.note`, `b.tags`, `b.quotedTweet`, and `b.articles` metadata.

#### 8.4.2 `[Open]` Single-Category Picker Despite Multi-Category Schema
- **Location**: `src/dashboard/components/BookmarkCard.tsx`, `src/content/popover.ts`
- **Details**: `categoryIds` is an array but UI always replaces with a single selection (`categoryIds: [cat.id]`). Multi-category organization is impossible in practice.
- **Plan**: Multi-select chips in popover and card picker, or document single-category as intentional and simplify schema.

#### 8.4.3 `[Fixed]` Content Script Still Uses Native `alert()`
- **Location**: `src/content/inject.ts`, `src/content/popover.ts`
- **Details**: Dashboard migrated to in-app `Modal`/`Toast`, but X-page save flows still called `alert()` for context invalidation and save failures.
- **Resolution**: Replaced native `alert()` prompts with X-styled non-blocking `showToast(...)` notifications.

#### 8.4.4 `[Open]` Save Mode Controls Lack Contextual Help
- **Location**: `src/dashboard/components/SaveConfigCard.tsx`
- **Details**: "Injected" vs "Override Native" and "Replace Click" vs "Add Arrow Dropdown" are label-only. New users cannot tell which mode fits their workflow without reading external docs.
- **Plan**: Add short descriptions under each mode and a "recommended for…" hint (see also `4.1`, `4.2`).

#### 8.4.5 `[Open]` Dead `buttonAlignment` Setting Still Persisted
- **Location**: `src/dashboard/components/SaveConfigCard.tsx` (commented UI), `src/content/settings.ts`, `useChromeStorage`
- **Details**: Button alignment UI is commented out but the setting is still loaded, stored, and passed through props. Users cannot change it; code paths may still read a stale value.
- **Plan**: Remove from storage schema or restore the control.

#### 8.4.6 `[Open]` Import Overwrites Without Validation or Category Merge
- **Location**: `src/dashboard/Dashboard.tsx` (`handleImport`)
- **Details**: JSON import calls `bulkPut` on bookmarks only. No schema validation, duplicate reporting, or category import. Malformed files partially import with silent data loss risk.
- **Plan**: Validate shape, report skipped rows, optionally import categories in the same file.

#### 8.4.7 `[Fixed]` Delete Confirmation Has No Undo Window
- **Location**: `src/dashboard/Dashboard.tsx` (`handleDelete`, `requestBulkDelete`)
- **Details**: Single and bulk deletes require safe, reversible feedback.
- **Resolution**: Implemented 6-second `Toast` window with single and bulk restoration (`Undo`).

#### 8.4.8 `[Open]` Popup Empty State Omits Bulk Sync Path
- **Location**: `src/App.tsx`
- **Details**: Empty popup says "Click the save button on any tweet!" but never mentions the sidebar "Sync Bookmarks" importer — the primary onboarding path for existing X bookmark libraries.
- **Plan**: Add secondary CTA: "Or sync existing bookmarks from X →".

#### 8.4.9 `[Open]` Uncategorized Count Computed but Never Shown
- **Location**: `src/dashboard/Dashboard.tsx` (`uncategorizedCount`)
- **Details**: `uncategorizedCount` is derived via `useMemo` but never passed to sidebar or list header. Users lack a quick filter for unsorted bookmarks.
- **Plan**: Surface as sidebar item or badge, or remove dead computation.

#### 8.4.10 `[Open]` Popover Category Names Injected via Unescaped `innerHTML`
- **Location**: `src/content/popover.ts`
- **Details**: Category names are interpolated into `innerHTML` template strings. A category name containing `<` or `"` could break markup or introduce XSS if names ever sync from untrusted sources.
- **Plan**: Use `textContent` / DOM APIs or escape HTML entities before insertion.

---

### 8.5 Design Language

#### 8.5.1 `[Open]` Inter Font Referenced but Not Loaded
- **Location**: `src/index.css` (`font-family: 'Inter', ...`)
- **Details**: CSS names Inter first but no `@font-face` or bundled font file exists (Google Fonts import was removed per `3.2`). Dashboard typography falls back to system UI fonts, drifting from the polished X-adjacent intent.
- **Plan**: Bundle Inter locally or drop it from the stack and document system-font-first as intentional.

#### 8.5.2 `[Open]` Three Divergent Category Color Palettes
- **Location**: `src/dashboard/helpers.ts`, `src/content/popover.ts`, `src/App.tsx`
- **Details**: Dashboard uses `['#1d9bf0', '#00c4b6', ...]`, popover uses `['#1d9bf0', '#9333ea', '#ec4899', ...]`, and popup duplicates its own `categoryColors` + `hoverMap`. Default category dots differ between save popover and dashboard.
- **Plan**: Single exported `CATEGORY_PALETTE` and `ACCENT_HOVER_MAP` in `src/shared/colors.ts`.

#### 8.5.3 `[Open]` Accent Hover States Hardcoded in JavaScript
- **Location**: `src/App.tsx` (`hoverMap`), `src/dashboard/hooks/useAccentColor.ts`
- **Details**: Hover and light tints are computed in JS objects rather than CSS `color-mix()`. Adding a new accent swatch requires updating multiple files.
- **Plan**: Derive `--accent-hover` and `--accent-light` purely from `--accent` in CSS (see also `6.6`).

#### 8.5.4 `[Open]` BookmarkCard Mixes CSS Classes with Heavy Inline Styles
- **Location**: `src/dashboard/components/BookmarkCard.tsx`
- **Details**: Quoted tweets, articles, media grids, and notes use large inline `style={{}}` blocks while author row uses classes. Hard to theme consistently and duplicates values already in `index.css` tokens.
- **Plan**: Extract `.bm-quote`, `.bm-article`, `.bm-media-grid`, `.bm-note` component classes.

#### 8.5.5 `[Open]` Gradient Avatar Placeholder Clashes with X Flat Aesthetic
- **Location**: `src/index.css` (`.bm-avatar { background: linear-gradient(135deg, var(--accent), #9333ea) }`)
- **Details**: Purple gradient initials avatar reads as generic SaaS, not X-native. Conflicts with flat circular avatars on x.com.
- **Plan**: Handle-derived flat color or neutral gray circle (see also `6.8`).

#### 8.5.6 `[Open]` Segmented Control Styling Duplicated Inline
- **Location**: `src/dashboard/components/SaveConfigCard.tsx`
- **Details**: Save mode and override action toggles repeat identical pill-button inline styles (~20 lines each). Future token changes require multiple edits.
- **Plan**: Shared `.segmented-control` / `.segmented-option` CSS component.

#### 8.5.7 `[Open]` Duplicate "View Tweet" Affordances on Same Card
- **Location**: `src/dashboard/components/BookmarkCard.tsx`
- **Details**: Cards expose both a link icon in the hover actions row and a "View tweet ↗" text link in the footer, plus the whole-card click — three ways to do the same thing with uneven discoverability.
- **Plan**: Keep one primary external-link control; align with fix in `8.1.2`.

---

### 8.6 Mobile & Responsive Layout

#### 8.6.1 `[Fixed]` Mobile Sidebar Drawer Navigation & Gesture Touch Targets
- **Location**: `src/dashboard/Dashboard.tsx`, `src/dashboard/components/Sidebar.tsx`, `src/index.css`
- **Details**: On mobile viewports (< 768px), category navigation and settings relied on static stacked layouts. Hamburger toggle, backdrop tap-to-dismiss, and min-44px touch targets were needed for comfortable one-handed use.
- **Resolution**: Added responsive column stacking on viewports < 900px, 44px touch target min-heights, and auto-collapsing sidebar.

#### 8.6.2 `[Fixed]` Mobile Bookmark Toolbar & Multi-Select Action Bar Overflow
- **Location**: `src/dashboard/components/MultiSelectActionBar.tsx`, `src/index.css`
- **Details**: Header search, filter pills, and floating multi-select bulk bar wrapped awkwardly on narrow viewports (< 480px), causing action buttons to clip or squeeze together.
- **Resolution**: Implemented responsive flex wrap, header stacking, and compact mobile bottom action sheet rules.

#### 8.6.3 `[Open]` Mobile Touch-Friendly Card Actions & Media Grid Scaling
- **Location**: `src/dashboard/components/BookmarkCard.tsx`, `src/index.css`
- **Details**: Desktop hover-dependent action buttons (`:hover .bm-actions`) require taps or focus to reveal on mobile. Media grids (images/videos) can exceed mobile container height.
- **Plan**: Always expose tap-friendly action menus on touch viewports, improve responsive media aspect ratios, and optimize card line-height and padding for small screens.

