# XMarks Onboarding Plan

## Status

**Planning document.** No onboarding implementation is included in this plan's creation.

XMarks already has an onboarding strategy in `docs/ONBOARDING_STRATEGY.md`. This document turns that strategy into an implementation-oriented plan focused on the first successful user journey:

> Install XMarks → understand the value → save or sync a bookmark → find it in the dashboard → organize it.

## Product Context

XMarks is a local-first Chrome extension for turning X bookmarks into a searchable, organized reference library. It does not require an account or cloud setup. The most important onboarding promise is therefore speed and clarity, not configuration:

> Your bookmarks stay local, and XMarks makes them searchable and organized in a few clicks.

The primary activation event should be:

1. The user completes their first successful save or bookmark sync.
2. The user opens the dashboard and sees that bookmark in their library.
3. The user performs one useful library action: search, categorize, add a note, or export.

## Current Gaps

### Popup

- The popup shows recent saves and a count, but the empty state only tells the user to click the save button on a tweet.
- It does not clearly explain the bulk sync path from the X Bookmarks page.
- There is no prominent first-run action that takes a new user to the right place.
- The popup does not explain the local-first/privacy value at the moment of first use.

### X page / sync flow

- The injected Sync Bookmarks action is the most important first-run entry point, but it relies on the user discovering it inside X.
- The user needs to know what will happen before starting a large sync: local processing, duplicate handling, progress, pause/resume, and where the results will appear.
- Completion should provide a direct path to the dashboard.

### Dashboard

- The empty state explains that the user should save tweets, but does not provide a complete first-run path.
- Search, categories, notes, tags, export, and bulk actions are powerful but are not introduced progressively.
- Settings and save-mode choices can be encountered before the user understands the core workflow.
- The first successful save or sync needs a clear confirmation and next step.

### Save configuration

- Injected mode and native override mode are meaningful choices, but the distinction can be confusing during first use.
- Quick Save / Normal Save behavior needs short inline explanations rather than a modal tour.
- Advanced placement and alignment settings should remain secondary until the user needs them.

## Onboarding Principles

1. **Contextual over modal.** Explain a feature where it is used. Reserve dialogs for confirmation or irreversible actions.
2. **One primary action per surface.** Do not present sync, settings, export, and configuration as equal first-run choices.
3. **Get to value first.** The first useful bookmark should happen before advanced configuration.
4. **Progressive disclosure.** Show essential controls first; reveal advanced settings when requested.
5. **Use plain language.** Prefer “Sync your X bookmarks” over internal terms such as “bulk importer.”
6. **Always provide a next step.** Every empty, loading, success, and error state should tell the user what to do next.
7. **Respect local-first privacy.** Explain that data stays in the browser without creating anxiety or requiring a privacy tutorial.
8. **Make guidance dismissible.** Hints should not permanently occupy the interface after the user has completed the related action.
9. **Support keyboard and touch.** Onboarding controls must be accessible, large enough to tap, and fully keyboard-operable.

## Target First-Run Journey

### Step 1: Install / first popup open

**Goal:** Establish value and give the user one obvious next action.

For a new installation with zero bookmarks, show:

- XMarks logo and concise value statement.
- Privacy note: “Your bookmarks stay in this browser.”
- Primary button: **Open X Bookmarks**.
- Secondary text link: **Open dashboard**.
- Short explanation: “Use Sync Bookmarks to bring in your existing library, or save tweets normally and XMarks will keep a searchable copy.”

The primary action should open `x.com/i/bookmarks` (or the configured X bookmarks URL) in a new tab.

**Avoid:** a multi-step product tour, account creation, or asking the user to configure every save option before they can use XMarks.

### Step 2: First X bookmarks visit

**Goal:** Make the injected sync action self-explanatory.

When the sync action is injected, provide a first-use hint anchored to it:

```text
Sync your existing X bookmarks
XMarks saves a local, searchable copy. Duplicates are skipped.
```

The hint should:

- Appear only for first-time users.
- Be dismissible.
- Disappear after the user starts sync or dismisses it.
- Include a “Learn how it works” link or expandable detail.
- Never block the X interface.

Before sync begins, the sync panel should state:

- What is being processed.
- That data is stored locally.
- That duplicates are skipped.
- That the user can pause and resume.
- That the dashboard is available after completion.

### Step 3: Sync in progress

**Goal:** Maintain confidence during a potentially long operation.

The sync UI should include:

- Current progress and total when known.
- A determinate progress bar when possible.
- Current state: scanning, saving, paused, completed, or failed.
- Pause/resume control.
- Duplicate and newly saved counts where available.
- A clear path to continue using X while sync runs if technically safe.

Example:

```text
Syncing your bookmarks
128 of 430 processed
94 new · 34 already saved
[Pause]
```

### Step 4: Sync completion

**Goal:** Connect the completed action to the searchable library.

Show a completion state with:

- New bookmarks saved.
- Duplicates skipped.
- Any failed items, with retry guidance.
- Primary action: **Open your library**.
- Secondary action: **Keep browsing X**.

The completion message should avoid an exclamation-heavy tone and should remain useful if zero new bookmarks were found.

### Step 5: Dashboard first visit

**Goal:** Help the user understand the library without requiring a tour.

If bookmarks exist but the dashboard has not been visited, show a compact welcome panel above the list:

```text
Your library is ready
Search, categorize, and add notes to your saved bookmarks.
[Search your bookmarks]  [Dismiss]
```

The panel should disappear after the user searches, categorizes, edits a note, exports, or dismisses it.

If there are no bookmarks, use a composed empty state with two paths:

- **Sync existing X bookmarks**
- **Save a bookmark on X**

The empty state should explain the difference between those two actions.

### Step 6: First save confirmation

**Goal:** Confirm that the product is working and teach the next useful action.

After the first successful save, show a short toast or inline confirmation:

```text
Saved locally to XMarks
Find it in your dashboard or add a category now.
[Open dashboard]
```

Do not interrupt the user with a blocking dialog.

### Step 7: First organization action

**Goal:** Introduce the library’s differentiating value.

After the first dashboard visit or first saved item, offer one lightweight contextual hint:

- Search hint: “Search bookmark text, authors, notes, and tags.”
- Category hint: “Categories make your saved ideas easier to revisit.”
- Notes hint: “Add a private note without changing the original tweet.”
- Bulk selection hint: “Select multiple bookmarks to categorize, export, or delete them.”

Show only one hint at a time and prioritize the feature closest to the user’s current action.

## Save Mode Onboarding

### Default recommendation

Keep the current default mode that gives the lowest-friction first-use experience. Explain it inline:

```text
Save mode
XMarks button — adds a separate save action beside X’s controls.
```

For native override mode:

```text
Native override
Use X’s bookmark button to save directly into XMarks. This changes the native bookmark action.
```

### Progressive disclosure

Show the basic save-mode choice first. Put the following behind an “Advanced placement” or “More options” disclosure:

- Injected button position.
- Button alignment.
- Native override action.
- Also save to X natively.

### First-run nudge

If the user has not selected a mode explicitly, show one non-blocking hint near Save Configuration. Do not reopen it on every dashboard visit. Persist dismissal/completion in local storage or `chrome.storage.sync`.

## Guidance State Model

Introduce a small persisted onboarding state rather than scattering independent booleans across components.

Suggested shape:

```ts
type OnboardingState = {
  version: number;
  popupSeenAt?: string;
  dashboardSeenAt?: string;
  syncHintDismissed?: boolean;
  firstSyncCompleted?: boolean;
  firstSaveCompleted?: boolean;
  firstDashboardActionCompleted?: boolean;
  welcomePanelDismissed?: boolean;
  saveModeGuidanceDismissed?: boolean;
  shortcutsHintDismissed?: boolean;
};
```

Store onboarding state locally because the product is local-first. If settings already use `chrome.storage.sync`, keep onboarding state there only if cross-device browser profile behavior is desired; otherwise use `chrome.storage.local`.

Rules:

- Version the state so future onboarding changes can be introduced safely.
- Mark completion from real user actions, not merely component mounts.
- Allow hints to expire or be dismissed.
- Do not show multiple onboarding surfaces at once.
- Never let onboarding state block core functionality.

## Proposed Implementation Phases

### Phase 1 — First-run foundations

**Files likely involved:**

- `src/App.tsx`
- `src/dashboard/Dashboard.tsx`
- `src/dashboard/components/BookmarkList.tsx`
- `src/dashboard/components/Toast.tsx`
- `src/content/importer.ts`
- `src/content/popover.ts`
- New `src/onboarding/` state/helper module

Tasks:

- Add versioned onboarding state storage.
- Detect first popup open, first dashboard open, first sync, and first save.
- Improve the popup empty state with a primary “Open X Bookmarks” action.
- Add dashboard empty-state paths for sync and save.
- Add a dismissible dashboard welcome panel.

**Acceptance criteria:**

- A new user always has a clear first action from the popup.
- A user with no bookmarks can reach either X Bookmarks or the dashboard.
- Existing users are not shown the first-run welcome repeatedly.

### Phase 2 — Sync guidance and progress

**Files likely involved:**

- `src/content/importer.ts`
- `src/content/popover.ts`
- `src/content/toast.ts`
- `src/background.ts`
- Relevant sync message types in `src/messages.ts`

Tasks:

- Add first-use anchored sync guidance.
- Improve sync preflight copy.
- Show progress, pause/resume, duplicate counts, and completion actions.
- Add explicit failure and retry states.
- Link completion directly to the dashboard.

**Acceptance criteria:**

- A first-time user understands what Sync Bookmarks does before starting.
- Long sync operations communicate progress and do not appear frozen.
- Completion always provides a path to the resulting library.

### Phase 3 — Dashboard activation

**Files likely involved:**

- `src/dashboard/Dashboard.tsx`
- `src/dashboard/components/BookmarkList.tsx`
- `src/dashboard/components/BookmarkCard.tsx`
- `src/dashboard/components/Sidebar.tsx`
- `src/index.css`

Tasks:

- Replace the current generic empty state with guided first-run states.
- Add a dismissible welcome panel for the first populated dashboard.
- Add contextual hints for search, categories, notes, and bulk actions.
- Add first-save confirmation with an Open dashboard action.
- Ensure onboarding hints work on mobile and do not conflict with the settings drawer.

**Acceptance criteria:**

- The first populated dashboard teaches one useful next action.
- Empty, loading, success, and failure states all have actionable copy.
- Hints do not cover bookmark content or interfere with selection and scrolling.

### Phase 4 — Save-mode clarity

**Files likely involved:**

- `src/dashboard/components/SaveConfigCard.tsx`
- `src/dashboard/components/SettingsPanel.tsx`
- `src/dashboard/components/InteractiveBar.tsx`
- `src/dashboard/hooks/useChromeStorage.ts`

Tasks:

- Add concise inline explanations for injected and native override modes.
- Move advanced options behind progressive disclosure.
- Add first-run guidance with persistent dismissal.
- Add a preview or example that clearly shows where the button appears.

**Acceptance criteria:**

- A new user can choose a save mode without understanding every advanced setting.
- The difference between XMarks button mode and native override mode is clear.
- Existing saved settings are not changed by onboarding UI.

### Phase 5 — Accessibility, polish, and measurement

Tasks:

- Ensure all banners, hints, and progress states have appropriate `aria-live` behavior.
- Manage focus when opening dialogs or guided panels.
- Ensure Escape dismisses non-critical guidance where appropriate.
- Test keyboard, touch, dark mode, reduced motion, and narrow screens.
- Add local development-only event logging or an adapter for future analytics if measurement is desired.
- Avoid collecting content or tweet text as part of onboarding measurement.

## Success Metrics

Because XMarks is local-first and currently does not require analytics, start with product-state metrics and manual validation.

### Primary activation metrics

- Percentage of new installs that open X Bookmarks.
- Percentage that complete at least one save or sync.
- Percentage that open the dashboard after saving or syncing.
- Time from first popup open to first successful save/sync.
- Percentage of activated users who perform a search or organization action.

### Quality metrics

- Sync cancellation rate.
- Sync failure and retry rate.
- Percentage of users who dismiss onboarding hints immediately.
- Number of repeated onboarding surfaces shown per session.
- Support/issues related to save mode confusion.
- Mobile completion rate compared with desktop.

### Qualitative checks

Ask a new user to complete these tasks without explanation:

1. Save one tweet with XMarks.
2. Sync existing bookmarks.
3. Find the saved bookmark in the dashboard.
4. Add a category or note.
5. Explain where their data is stored.

The user should be able to complete each task without guessing which screen to visit next.

## Testing Plan

### Automated tests

Add coverage for:

- New, partially completed, completed, dismissed, and version-migrated onboarding state.
- Popup empty state actions.
- Dashboard empty-state actions.
- First-save and first-sync success handling.
- Progress updates and completion states.
- Retry behavior after sync failure.
- Save-mode guidance visibility and persistence.
- Keyboard dismissal and accessible live-region content.

### Manual test matrix

- Fresh install with no bookmarks.
- Existing database with bookmarks but no onboarding state.
- Existing onboarding state from an older version.
- First save through XMarks’ injected control.
- First save through native override mode.
- Small sync, large sync, paused sync, resumed sync, failed sync.
- Empty dashboard and populated dashboard.
- Desktop, tablet, mobile, dark mode, and reduced motion.
- Screen-reader and keyboard-only navigation.

## Definition of Done

- A new user understands what XMarks does within the first popup view.
- The user has a clear path to save a tweet or sync existing bookmarks.
- Sync progress, completion, and failure states are visible and actionable.
- The dashboard explains what to do when empty and what to do next when populated.
- Save mode choices are understandable without a configuration tour.
- Onboarding is contextual, dismissible, persisted, and non-blocking.
- Mobile and accessibility behavior is tested.
- Existing users are not disrupted by new first-run UI.
- The implementation is covered by automated tests and documented in the issue tracker.

## Related Documents

- `docs/ONBOARDING_STRATEGY.md`
- `docs/ISSUES.md` — sections 4.1–4.4 and related accessibility/settings issues
- `.agents/product-marketing.md`
- `README.md`
