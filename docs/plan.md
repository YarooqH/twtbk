# Bulk Select UI Improvement Plan

## Status

**Branch:** `fix/bulk-select-ui`

This document is the implementation plan for improving the bookmark bulk-selection experience. The main implementation is now in place: visible selection controls, a redesigned action bar, selected export, modal-based bulk deletion, undo feedback, responsive mobile styling, hidden-selection feedback, Escape-to-clear, and async busy/error states have been added. The work remains uncommitted and still needs browser QA and dedicated component tests.

## Goals

- Make bulk selection discoverable without relying on hover.
- Make selection and bulk actions comfortable on desktop, tablet, keyboard, touch, and mobile.
- Establish a clear visual hierarchy between normal, secondary, and destructive actions.
- Prevent the bulk toolbar from obscuring bookmark content.
- Make bulk operations safe, reversible where possible, and easy to understand.
- Keep the feature consistent with the existing dashboard design system and notification components.

## Current Problems

- Selection checkboxes were hidden until hover or selection.
- The fixed bottom action bar looked disconnected from the list and could cover content.
- Bulk actions had weak grouping and inconsistent visual hierarchy.
- Exporting only selected bookmarks was unavailable.
- Bulk delete used the browser-native `confirm()` dialog instead of the app's modal system.
- Bulk actions had limited loading, error, and success feedback.
- The selection model did not clearly communicate how filtering affects selected items.
- Selection controls and action buttons needed stronger keyboard and screen-reader support.

## Design Direction

### Desktop

Use a compact contextual toolbar associated with the bookmark list. It should communicate the selected count first, then expose selection-scope controls and bulk actions:

```text
12 bookmarks selected   Select visible   Categorize   Export   Delete   Clear
```

The selected count should be visually prominent. Delete should be separated through semantic danger styling. Secondary actions should remain visually subordinate.

### Mobile

Use a full-width bottom action bar with safe-area padding. Allow the action row to wrap or use a compact three-action grid rather than forcing all controls into a single horizontal pill.

The list must reserve space while the toolbar is visible so the last bookmark remains reachable.

### Bookmark cards

Keep the selection control visible on every card. Use a 44px-or-larger hit area, a visible focus ring, and both border/background and checkmark changes for the selected state.

## Implementation Phases

### Phase 1 — Selection affordance

**Files:**

- `src/dashboard/components/BookmarkCard.tsx`
- `src/index.css`

Tasks:

- Keep checkboxes visible instead of hover-only.
- Use an accessible label and descriptive `aria-label` for each bookmark.
- Add keyboard focus styling.
- Maintain stable card alignment when selection changes.
- Use a custom visual checkmark while preserving a native checkbox for semantics.
- Ensure touch targets are at least 44px.

**Acceptance criteria:**

- A first-time user can discover selection without hovering.
- Every checkbox is reachable and operable with keyboard and touch.
- Selected and unselected states are distinguishable in light and dark themes.

### Phase 2 — Action bar redesign

**Files:**

- `src/dashboard/components/MultiSelectActionBar.tsx`
- `src/index.css`
- `src/dashboard/icons.tsx` if additional icons are needed

Tasks:

- Present the selection count as the primary context.
- Add `Select visible` and `Clear visible` behavior.
- Add `Categorize`, `Export`, and `Delete` actions.
- Keep delete visually separated as destructive.
- Use existing iconography and accessible text labels.
- Add desktop and mobile responsive layouts.
- Add safe-area support and reserve mobile content space.
- Respect `prefers-reduced-motion`.

**Acceptance criteria:**

- The toolbar is usable at 320px, 390px, tablet, and desktop widths.
- No action is clipped or hidden behind another action.
- The toolbar does not obscure the final bookmark in the list.
- Keyboard focus remains visible for every toolbar control.

### Phase 3 — Selection scope and filtering behavior

**Files:**

- `src/dashboard/Dashboard.tsx`
- `src/dashboard/components/BookmarkList.tsx`
- `src/dashboard/components/MultiSelectActionBar.tsx`

Tasks:

- Define selection against the currently visible/filtered bookmark IDs.
- Support selecting all visible bookmarks without selecting hidden bookmarks.
- Decide and document behavior when filters or categories change.
- Prefer retaining hidden selections while communicating that some selected items are hidden, for example:

```text
12 selected · 4 hidden by current filter
```

- Add Escape-to-clear behavior where it does not conflict with existing shortcuts.
- Consider Shift-click range selection as a follow-up enhancement.

Implemented in this phase:

- Hidden selected items are retained when filters change and their count is shown.
- Escape clears the current selection when no modal is open.

**Acceptance criteria:**

- Users can tell exactly which scope an action will affect.
- Filtering never silently causes selected bookmarks to be lost.
- Select-all behavior is deterministic and testable.

### Phase 4 — Safe bulk operations

**Files:**

- `src/dashboard/Dashboard.tsx`
- `src/dashboard/components/MultiSelectActionBar.tsx`
- `src/db/index.ts` if database helpers are needed
- `src/dashboard/components/Modal.tsx`
- `src/dashboard/components/Toast.tsx`

Tasks:

- Export only the selected bookmarks.
- Categorize selected bookmarks in a Dexie transaction.
- Add loading/disabled states during async operations.
- Replace native confirmation dialogs with the existing in-app modal.
- Add undo for bulk deletion using the existing toast action pattern.
- Add clear success and error messages with affected bookmark counts.
- Prevent duplicate submissions while an operation is in progress.
- Handle missing records safely if a bookmark was deleted elsewhere before the action completes.

Implemented in this phase:

- Export, categorize, and delete actions expose busy/disabled states.
- Export, categorize, and delete failures show user-facing feedback.
- Missing records are filtered safely before export and restoration.

**Acceptance criteria:**

- Destructive actions require an in-app confirmation step.
- Bulk delete can be undone for the supported undo window.
- Failed operations do not leave the toolbar or selection in an ambiguous state.
- Users receive feedback for success, failure, and in-progress states.

### Phase 5 — Accessibility and visual QA

Tasks:

- Test keyboard-only navigation and focus order.
- Test with screen-reader labels and live-region announcements.
- Verify contrast for selected, focus, disabled, and danger states.
- Test at mobile, tablet, and desktop breakpoints.
- Test light mode and dark mode.
- Test long category names and large selection counts.
- Test empty, filtered-empty, and zero-visible-bookmark states.
- Verify reduced-motion behavior.
- Check that dropdown menus remain inside the viewport on narrow screens.

**Acceptance criteria:**

- No critical interaction depends on hover.
- Focus is always visible.
- The toolbar remains usable with long labels and large counts.
- The feature passes the existing build and test suite.

## Technical Notes

- Reuse existing CSS variables for color, spacing, borders, and shadows.
- Prefer CSS classes over component-level inline styles for the new visual system.
- Reuse the existing `Modal` and `Toast` components rather than introducing another notification pattern.
- Keep database operations in `Dashboard.tsx` or a dedicated helper rather than coupling the presentational action bar to Dexie.
- Use transactions for multi-record updates where practical.
- Keep the action bar's z-index within the project's existing layering scale instead of introducing arbitrary high values.
- Use tabular numerals for selected counts to reduce visual jitter.

## Testing Plan

### Automated

- Existing unit/integration tests must continue to pass.
- Add component coverage for:
  - Selecting and deselecting a bookmark.
  - Selecting all visible bookmarks.
  - Clearing visible selections.
  - Exporting selected bookmarks.
  - Confirming and cancelling bulk deletion.
  - Restoring deleted bookmarks with Undo.
  - Categorizing a selection.
  - Handling selected items hidden by a filter.

### Manual

- Desktop: 1280px and 1440px widths.
- Tablet: approximately 768px width.
- Mobile: 320px and 390px widths.
- Keyboard-only navigation.
- Light and dark color schemes.
- Long and short category names.
- One selected bookmark, many selected bookmarks, and all-visible selection.

## Definition of Done

- The complete bulk-select flow is visually consistent with the dashboard.
- Selection is discoverable and accessible without hover.
- Actions are responsive and do not cover content.
- Bulk export, categorize, and delete behave correctly.
- Destructive actions are confirmed and undoable where supported.
- Loading, success, and failure states are clear.
- Filtering behavior is documented and predictable.
- Automated tests pass and manual browser QA is complete.
- Changes are reviewed and committed on `fix/bulk-select-ui`.
