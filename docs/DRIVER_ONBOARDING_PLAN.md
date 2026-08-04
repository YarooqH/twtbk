# Guided Dashboard Onboarding Plan

## Purpose

Use a guided-tour pattern, similar to Driver.js, to show a first-time user where the main XMarks controls are located instead of relying on a single welcome banner.

The tour should answer:

- Where are my bookmark categories?
- Where do I search?
- Where do I change how XMarks saves tweets?
- What can I do with a bookmark card?
- Where do bulk actions appear?

This plan extends `docs/ONBOARDING_STRATEGY.md` and `docs/ONBOARDING_PLAN.md`. It should replace the current generic dashboard welcome panel as the primary first-dashboard orientation experience.

## Recommendation

Use Driver.js, or a small equivalent guided-tour layer, for the **dashboard only**.

Do not use the same tour library to drive onboarding through X's DOM. X's selectors and layout are an unstable integration surface. The X page should use a separate contextual hint anchored to the XMarks-injected Sync Bookmarks control.

### Why Driver.js-style onboarding fits here

- It can spotlight real controls instead of creating a second fake interface.
- It can position a popover around desktop and mobile targets.
- It provides next/back/close behavior and keyboard support.
- It can dim the rest of the page while preserving the target's context.
- It can wait for or skip targets that are hidden at a given breakpoint.

### Dependency decision

Before adding the dependency:

1. Verify the current Driver.js version, bundle size, and license.
2. Confirm it works with React 19, Vite, and the extension's content security policy.
3. Confirm its CSS can use XMarks variables for background, text, borders, and accent color.
4. Prefer a small internal wrapper so the rest of the app does not depend directly on Driver.js APIs.

If the dependency is too heavy or its CSS conflicts with the dashboard, implement a small internal tour with the same contract: target selector, popover, overlay, next/back/skip, focus handling, and persisted completion.

## Tour Scope

The first tour should be short: **four or five steps maximum**. It should not explain every feature at once.

### Step 1 — Library navigation

**Target:** desktop `.sidebar` or mobile `.mobile-category-nav`

**Title:** `Your library`

**Copy:**

> Browse all saved bookmarks, uncategorized items, and your categories here.

**Desktop action:** spotlight the left sidebar library/category area.

**Mobile action:** spotlight the horizontal category strip. Do not point at the hidden desktop sidebar.

### Step 2 — Search and sort

**Target:** `.search-input` and the adjacent sort control

**Title:** `Find anything quickly`

**Copy:**

> Search bookmark text, authors, notes, and tags. Use Sort to change the order.

The tour should spotlight the combined search/sort row without hiding the sticky search field during the tour.

### Step 3 — Bookmark card

**Target:** first `.bookmark-card`, if one exists

**Title:** `Each bookmark stays useful`

**Copy:**

> Open the original post, add a note or category, edit tags, or use the card menu for more actions.

If there are no bookmarks, skip this step rather than pointing at the empty state as if it were a bookmark.

### Step 4 — Settings

**Target:** desktop `.sidebar-toggle-bar` or mobile `.mobile-settings-btn`

**Title:** `Control how XMarks saves`

**Copy:**

> Choose the save mode, adjust placement, customize the accent color, and enable local AI categorization.

Desktop behavior:

- Open or spotlight the Settings control in the right panel.
- Do not force the entire settings panel open unless the user chooses `Next`.

Mobile behavior:

- Spotlight the Settings icon in the header.
- On `Next`, open the settings drawer if necessary.
- Ensure the tour can close the drawer and restore the prior state.

### Step 5 — Bulk selection, contextual follow-up

Do not include bulk selection in the first tour unless the user already has multiple bookmarks and the selection controls are visible.

Instead, show a contextual hint the first time the user selects a bookmark:

> Select more bookmarks to categorize, export, or delete them together.

**Target:** `.multi-select-bar`

This keeps the first tour focused and introduces bulk actions at the moment they become relevant.

## Tour Entry Conditions

Start the dashboard tour only when all of the following are true:

- The dashboard has finished loading.
- The user has not completed or dismissed the current tour version.
- No modal, settings drawer, dropdown, or bulk operation is active.
- The dashboard has rendered its primary landmarks.
- The user has not already completed a meaningful dashboard action, unless they explicitly restart the tour.

Do not start the tour on every dashboard open.

### Empty library behavior

The tour should still be useful with zero bookmarks:

- Show Library/categories if available.
- Show Search/sort.
- Skip the bookmark-card step.
- Show Settings.
- End with a clear next action in the empty state: `Open X Bookmarks`.

### Populated library behavior

With bookmarks:

- Include the first bookmark-card step.
- Show the dashboard welcome context only once, or remove it when the tour starts.
- Do not show both a large welcome panel and a tour overlay at the same time.

## Persisted State

Extend the existing local onboarding state with versioned tour fields:

```ts
type OnboardingState = {
  version: number;
  dashboardTourVersion?: number;
  dashboardTourCompleted?: boolean;
  dashboardTourDismissed?: boolean;
  dashboardTourStartedAt?: string;
  dashboardTourCompletedAt?: string;
  dashboardTourStep?: number;
  bulkHintDismissed?: boolean;
};
```

### Persistence rules

- Store in `chrome.storage.local`.
- Increment `dashboardTourVersion` when the step content or landmarks materially change.
- Save completion only after the user reaches the final step or chooses `Finish`.
- Save dismissal when the user chooses `Skip tour` or closes the tour.
- Do not overwrite bookmark data or save-mode settings.
- If the tour is interrupted by a reload, resume only if a step was explicitly persisted; otherwise restart at step one.
- Never block dashboard use if storage is unavailable.

## UI and Interaction Requirements

### Visual treatment

Use the existing design tokens:

- Background: `var(--bg)` or `var(--bg-secondary)`
- Text: `var(--text)` and `var(--text-muted)`
- Accent: `var(--accent)`
- Borders: `var(--border-strong)`
- Radius: existing dashboard radius tokens
- Shadows: existing shadow tokens

The popover should look like part of XMarks, not a third-party widget.

### Controls

Every step should provide:

- Step title
- One short explanation
- `Back` where applicable
- `Next` or `Finish`
- `Skip tour` or a clearly labeled close button
- Step progress, such as `2 of 4`

Do not use emoji as the only visual cue.

### Keyboard and accessibility

- Focus the tour popover when it opens.
- Keep focus inside the popover while it is active.
- Support `Escape` to dismiss.
- Support Enter/Space on controls.
- Provide `aria-label` on close and navigation controls.
- Announce step changes with an `aria-live` region.
- Maintain a visible focus ring.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone to identify the target.
- Restore focus to the element that launched the tour after close.

### Touch and mobile

- Popovers must fit within the viewport at 320px and 390px widths.
- Buttons must have at least a 44px touch target.
- Avoid horizontal scrolling inside the tour popover.
- The overlay must not prevent the Settings drawer from scrolling when the tour targets a drawer item.
- Recalculate target position after the mobile settings drawer opens.
- Do not spotlight the hidden desktop sidebar on mobile.

## Dashboard Landmarks

Add stable, purpose-specific onboarding hooks instead of relying only on styling classes:

```tsx
data-onboarding="library"
data-onboarding="search"
data-onboarding="bookmark-card"
data-onboarding="settings"
data-onboarding="bulk-actions"
```

Recommended locations:

- Library: desktop sidebar library/category container.
- Mobile library: mobile category navigation.
- Search: search input wrapper plus sort control row.
- Bookmark card: first bookmark card.
- Settings: desktop Settings toggle and mobile Settings button.
- Bulk actions: contextual multi-select action bar.

The tour should query `data-onboarding` targets first and use class selectors only as a fallback.

## Architecture

Create a small onboarding module:

```text
src/onboarding/
  state.ts          persisted onboarding state
  tour.tsx          React wrapper around Driver.js or internal tour
  tourSteps.ts      step definitions and target availability
  useTour.ts        start/complete/dismiss lifecycle
```

### Suggested API

```ts
const { startDashboardTour, isTourActive } = useTour({
  version: 1,
  surface: 'dashboard',
});
```

The dashboard should own when the tour starts. Step definitions should not directly mutate dashboard state.

### Target availability

Each step should define:

```ts
type TourStep = {
  id: string;
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  optional?: boolean;
  beforeShow?: () => Promise<void> | void;
};
```

Optional steps should be skipped if their targets are not rendered. A missing target must never throw or leave a stuck overlay.

## X Bookmarks Contextual Guidance

Keep X page guidance separate from the dashboard tour.

When the Sync Bookmarks button is first injected:

- Show a small non-blocking hint near the button.
- Explain that it creates a local searchable copy.
- Mention duplicate skipping and pause/resume.
- Include `Got it` and `Start sync` actions.
- Persist `syncHintDismissed`.
- Remove the hint after sync starts or the user dismisses it.

Do not use dashboard selectors or Driver.js against X's DOM.

## Implementation Phases

### Phase 1 — Tour foundation

- Verify Driver.js compatibility and license.
- Add the dependency only if needed.
- Add `data-onboarding` landmarks.
- Create the tour wrapper and state integration.
- Add the current tour version.
- Implement focus, Escape, skip, and completion behavior.

**Acceptance:** A tour can start, advance, close, and complete without changing bookmark data.

### Phase 2 — Dashboard tour

- Implement Library, Search, Bookmark Card, and Settings steps.
- Skip optional bookmark-card step for an empty library.
- Add desktop and mobile target resolution.
- Prevent the existing welcome panel from showing simultaneously.
- Add the first-run start trigger after dashboard landmarks render.

**Acceptance:** A fresh user can understand the dashboard without guessing where search, categories, and settings are located.

### Phase 3 — Contextual bulk guidance

- Add the first-selection hint.
- Spotlight the multi-select action bar only after a selection exists.
- Add dismissal/completion state.

**Acceptance:** Bulk actions are taught at the moment they become relevant, not before.

### Phase 4 — X sync hint

- Add the first-use Sync Bookmarks hint.
- Connect it to the existing sync panel.
- Keep sync progress, pause/resume, completion, and dashboard CTA visible.
- Persist sync hint dismissal and completion.

**Acceptance:** A first-time user understands what Sync does before starting it and knows where the results went afterward.

### Phase 5 — QA and polish

- Test fresh state, dismissed state, completed state, and version migration.
- Test empty and populated libraries.
- Test desktop, tablet, and mobile targets.
- Test the Settings drawer opening during the tour.
- Test reduced motion and keyboard-only use.
- Test extension reload and popup/dashboard navigation.
- Add automated tests for state transitions and missing optional targets.

## Manual Test Matrix

- Fresh profile with no bookmarks.
- Fresh profile with one bookmark.
- Existing profile with dismissed welcome panel.
- Existing profile with completed tour version 1.
- Tour opened from desktop dashboard.
- Tour opened from mobile dashboard.
- Settings drawer opened during the Settings step.
- Search input focused while the tour starts.
- Long category names and narrow viewport.
- Missing first bookmark card.
- User closes the tour halfway through.
- User reloads while the tour is open.
- User presses Escape.
- Reduced-motion preference enabled.

## Definition of Done

- The dashboard has a clear, short, one-time guided tour.
- The user is shown where Library, Search, Settings, and bookmark actions live.
- The tour behaves correctly on empty and populated libraries.
- The tour does not reappear after completion or dismissal.
- Mobile uses mobile landmarks rather than hidden desktop elements.
- Bulk actions and X sync have contextual follow-up guidance.
- No onboarding surface blocks core functionality permanently.
- Build, tests, accessibility checks, and manual viewport checks pass.
