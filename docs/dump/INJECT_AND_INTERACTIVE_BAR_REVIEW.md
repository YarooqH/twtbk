# inject.ts & InteractiveBar Drag-and-Drop — Bug Analysis & Plan

> **Scope**: `src/content/inject.ts`, `src/dashboard/components/InteractiveBar.tsx`, and the bridge between them (`settings.ts`, `xDomAdapter.ts`).
> **Goal**: Document every concrete bug, structural flaw, and UX problem, then propose a prioritized fix plan.

---

## 1. `InteractiveBar.tsx` — Drag & Drop Issues

### 1.1 `[Critical]` `getSlotFromMouseX` slot-to-pixel math is wrong

**File**: `InteractiveBar.tsx:99–105`

```ts
const getSlotFromMouseX = (e: React.DragEvent<HTMLDivElement>): number => {
  const bar = e.currentTarget as HTMLDivElement;
  const rect = bar.getBoundingClientRect();
  const relX = e.clientX - rect.left;
  const fraction = relX / rect.width;
  return Math.min(6, Math.max(0, Math.round(fraction * 6)));
};
```

**Problem**: The bar is a flex container with:
- 6 fixed-width native icons (`flex: 0 0 22px`) totaling **132px**
- 7 "zone" cells (`flex: 1 1 0%`) that share the **remaining space equally**
- Padding of `6px 8px` on the container

`getSlotFromMouseX` assumes 7 equal-width zones spanning 100% of the bar width. In reality, the zones have **variable widths** (they expand to fill whatever space the fixed icons leave behind, divided by 7). The resulting `fraction × 6` maps a drop at ~43% of the bar width to slot 3 regardless of how many icons are actually visible, or how much padding/gap exists.

**Impact**: Drag-and-drop frequently lands the button at a slot offset from where the user dragged. The visual "hover zone" highlight is misaligned with the actual drop target.

---

### 1.2 `[High]` Action bar uses hardcoded icon count — breaks in views that omit "Views"

**File**: `InteractiveBar.tsx:82–89`

```ts
const nativeIcons = [
  { key: 'reply',    icon: svgIcons.reply },
  { key: 'retweet', icon: svgIcons.retweet },
  { key: 'like',    icon: svgIcons.like },
  { key: 'views',    icon: svgIcons.views },
  { key: 'bookmark',icon: svgIcons.bookmark },
  { key: 'share',   icon: svgIcons.share },
];
```

**Problem**: Timeline/reply feeds show 6 icons (including "Views"); detail/main tweet view omits Views. The drag-and-drop UI always renders 6 icons. When the user is on a detail view and drops into the Views zone, `inject.ts` correctly falls back to the "after-views" → bookmark/share fallback logic (line 338–342), but the InteractiveBar gives no hint of this. The user sees no visual indication that their chosen position will behave differently in this view.

---

### 1.3 `[Resolved]` `next-to-bookmark` and `rightmost` render the button INSIDE a zone cell instead of as a standalone icon — FIXED

**File**: `src/dashboard/components/InteractiveBar.tsx`

**Resolution (Option A implemented)**: Updated `InteractiveBar.tsx` so that when a slot is placed (`isPlaced`), the zone cell switches from an expanding flex box (`flex: 1 1 0` with a full-zone border) to a fixed standalone icon button cell (`flex: 0 0 auto`, `minWidth: 28px`). Inside it, the placed button renders as a 26x26px styled icon button node (`background: ${accentColor}22`, `border: 1.5px solid var(--accent)`). Unplaced gap cells remain as flexible drop targets (`flex: 1 1 0`). This ensures the button looks like a standalone action bar icon in all 7 positions including `next-to-bookmark` and `rightmost`.

---

### 1.4 `[Medium]` `onDragOver` on both container and zone cells causes duplicate highlight logic

**File**: `InteractiveBar.tsx:176–181, 222–228`

**Problem**: The outer `<div>` handles `onDragOver` with `setDragOver(getSlotFromMouseX(e))`, and each zone cell also has its own `onDragOver` that calls `setDragOver(cell.slotIdx)`. If a zone cell's `stopPropagation()` prevents the event from bubbling, both handlers can fire during a drag, creating a brief double-highlight flicker. The handlers are redundant — the zone-level `onDragOver` already sets the correct slot; the container-level one can be removed.

---

### 1.5 `[Low]` No keyboard accessibility or ARIA for the drag-and-drop interface

**File**: `InteractiveBar.tsx` (entire component)

**Problem**: Screen reader users receive no instructions. The drag-and-drop affordance is entirely pointer/mouse-based. The component has no `role`, `aria-label`, or keyboard alternative (e.g., clickable zones to set position without dragging).

---

### 1.6 `[Low]` No touch support for drag-and-drop

**Problem**: On mobile/tablet, native HTML5 drag-and-drop is unreliable. A long-press typically triggers text selection or context menu, not a drag. The component silently fails for touch users.

---

## 2. `inject.ts` — Injection Logic Issues

### 2.1 `[Critical]` `computePlacement()` and `validateWrapper()` never agree for non-trivial positions

**File**: `inject.ts:60–63, 70–84`

```ts
function computePlacement(): string {
  if (settingSaveMode === 'native-override') return 'next-to-bookmark';
  return settingInjectedPosition; // ← returns 'after-reply', 'after-retweet', etc.
}

function validateWrapper(wrapper, actionBar, tweetId, mode, placement): boolean {
  // ...
  if (wrapper.dataset.twtbkPlacement !== placement) return false; // ← almost always false
  return true;
}
```

**Problem**: `injectedPosition` has values like `'after-reply'`, `'after-retweet'`, `'after-like'`, `'after-views'`, `'rightmost'`, `'leftmost'`. None of these are ever transformed by `computePlacement`. `validateWrapper` compares the dataset string (e.g. `'after-reply'`) against `computePlacement()`'s output — which returns `'after-reply'` unchanged. So for these values, validation **passes**.

However, `computePlacement` was clearly **designed** to be a normalization layer (note the special case for `'next-to-bookmark'` under native-override). The inconsistency is:
- When `settingSaveMode === 'native-override'` → `computePlacement` returns `'next-to-bookmark'` but `mode` is `'replace'` or `'arrow'`, so `validateWrapper` already returns false due to mode mismatch before reaching the placement check.
- The `'next-to-bookmark'` special case in `computePlacement` is **dead code** for injected mode — it only runs when `settingSaveMode === 'native-override'`, but in that mode `injectSaveButtons` returns early (line 147: `if (mode === 'replace') return;`). For `arrow` mode, injection proceeds but `computePlacement` returns `'next-to-bookmark'` while the wrapper's dataset stores the actual `mode` (`'arrow'`), so the mode mismatch in `validateWrapper` would fail anyway.

**Impact**: Low in practice (injections still work via the orphan-cleanup path at lines 168–171), but the idempotency WeakMap state is unreliable for non-trivial positions. Every `injectSaveButtons()` call on a healthy tweet removes and rebuilds the wrapper.

---

### 2.2 `[High]` `injectSaveButtons` skips `settingsLoaded` check on re-runs via `debouncedInjectSaveButtons`

**File**: `inject.ts:385–391`

```ts
export const debouncedInjectSaveButtons = () => {
  if (injectAnimationFrame !== null) return;
  injectAnimationFrame = requestAnimationFrame(() => {
    injectAnimationFrame = null;
    injectSaveButtons(); // ← calls without checking settingsLoaded
  });
};
```

**Problem**: The `settingsLoaded` guard at line 143 (`if (!settingsLoaded) return;`) only runs on the very first call. Once `settingsLoaded` is `true` and `injectSaveButtons` has run, subsequent calls (via the `MutationObserver` in `navigation.ts`, or the `onChanged` listener in `index.ts`) bypass the guard because `settingsLoaded` is already `true`. This is fine — but if `settingsLoaded` is ever reset (it isn't currently, but the pattern is fragile), re-runs would silently proceed without settings.

More concretely: the `settingsLoaded` check makes the first call no-op if settings haven't loaded yet. Subsequent calls from MutationObserver/`onChanged` always proceed. This is correct, but the guard is **inconsistent** — it gates initial injection but not re-injection, which is intentional but undocumented.

---

### 2.3 `[Medium]` Tweet ID extraction silently returns `''` on failure — no fallback

**File**: `inject.ts:191–192`

```ts
const tweetIdResult = getTweetId(tweet);
const tweetId = tweetIdResult.element ?? '';
```

**Problem**: When `getTweetId` fails (no `/status/` link found), `tweetId` becomes `''`. The injected wrapper's `dataset.twtbkTweetId = ''` is set, and the `validateWrapper` check at line 79 (`wrapper.dataset.twtbkTweetId !== tweetId`) will always fail for this tweet, causing a rebuild on every `injectSaveButtons` call. The saved-state check at line 273 (`if (tweetId && chrome.runtime?.id)`) silently skips. No logging.

---

### 2.4 `[Medium]` Count-based action bar verification is fragile to X DOM changes

**File**: `inject.ts:179`

```ts
if (scoreActionGroup(actionBar) < MIN_ACTION_BAR_SCORE) return;
```

`scoreActionGroup` counts actions found by `findAction`, which uses `data-testid` → `aria-label` → structural fallbacks. If X renames a `data-testid` or restructures the action bar, score drops below 3 and **all injection silently stops for that tweet type** with no warning logged. The test suite (JSDOM fixtures) can't catch this because it uses simplified DOM structures.

---

### 2.5 `[Medium]` `findActionItem` fallback hides adapter failures

**File**: `inject.ts:131–139`

```ts
export function findActionItem(actionBar: Element, testId: string): Element | null {
  const actionType = testIdToActionType(testId);
  if (actionType) {
    const result = findAction(actionBar, actionType);
    return result.element ?? null;
  }
  // Fallback for unrecognized testIds: direct data-testid lookup
  return actionBar.querySelector(`[data-testid="${testId}"]`);
}
```

**Problem**: When `testIdToActionType` doesn't recognize the `testId` (e.g., `'analytics'` for the views action), the code silently falls back to a raw `data-testid` query. This works but bypasses the adapter entirely, so `confidence` information is lost and the call site has no way to know the lookup was "low confidence". For unrecognized testIds, this is fine; the concern is that the fallback masks cases where the adapter *should* work but returns `null` unexpectedly.

---

### 2.6 `[Low]` Arrow mode injection logic has duplicate placement branch

**File**: `inject.ts:314–325` (arrow mode) vs `inject.ts:343–360` (`next-to-bookmark`)

Both branches insert the button **after the bookmark wrapper** (or after share as fallback). The logic is identical but written twice. The arrow mode branch at 314–325 doesn't handle the missing-bookmark fallback (share fallback is in the `next-to-bookmark` branch only).

---

## 3. Cross-Cutting Issues

### 3.1 `[High]` Settings type inconsistency between dashboard and content script

| Setting | `settings.ts` type | `InteractiveBar.tsx` SlotId | `inject.ts` position values |
|---|---|---|---|
| `injectedPosition` | `'leftmost' \| 'after-reply' \| 'after-retweet' \| 'after-like' \| 'after-views' \| 'next-to-bookmark' \| 'rightmost'` | `'leftmost' \| 'reply' \| 'retweet' \| 'like' \| 'views' \| 'next-to-bookmark' \| 'bookmark' \| 'share'` (internal SlotId) | Same as settings.ts |

The `SlotId` type in `InteractiveBar` is an **internal implementation detail** that doesn't match any persisted type. The `posToSlot`/`slotToPos` converters create a 1:1 mapping, but the `SlotId` type itself (`'reply'`, `'retweet'`, etc.) is never used as a TypeScript type outside the component — making it an unnecessary source of confusion. The "bookmark" and "share" slots in `SlotId` are never referenced as drop targets; they exist only as visual markers in the cells array.

### 3.2 `[Medium]` `injectedPosition` is passed through SaveConfigCard but not included in the prop interface

**File**: `SaveConfigCard.tsx:7`

```ts
interface SaveConfigCardProps {
  // ...
  injectedPosition: 'leftmost' | 'after-reply' | 'after-retweet' | 'after-like' | 'after-views' | 'rightmost' | 'next-to-bookmark';
  // ...
}
```

The prop is defined but `next-to-bookmark` is included in the type definition yet the `injectedPosition` prop passed from `SettingsPanel` is typed slightly differently. TypeScript resolves this correctly, but the interface doesn't match the actual union used in `InteractiveBar`.

### 3.3 `[Low]` `debouncedInjectSaveButtons` uses a single animation frame — races with MutationObserver batches

**File**: `inject.ts:384–391`

If the MutationObserver fires many mutations in quick succession (e.g., scrolling a timeline), `debouncedInjectSaveButtons` queues at most one `injectSaveButtons` call per animation frame. On very fast feeds, this could mean a tweet that appears, gets injected, then gets removed before the animation frame fires — the injection runs on the now-absent tweet (harmless, no-op). However, if a tweet is added, injected, then X re-renders the action bar within one frame, the second injection call sees a stale WeakMap entry and rebuilds unnecessarily.

---

## 4. Proposed Fix Plan (Priority Order)

### Phase 1 — Fix the drag-and-drop zone rendering (1.1, 1.3, 1.4)

**Priority: Critical — fixes the visual bugs for bookmark-adjacent and share-adjacent placements.**

1. **Fix the cell layout (1.3)**: Replace the interleaved zone/icon cells array with a layout that renders the injected button as a **dedicated standalone cell** when its slot is active, positioned correctly relative to bookmark/share. Specifically:
   - `next-to-bookmark`: Render the injected button as a standalone cell between the bookmark icon cell and the share icon cell (not inside zone5).
   - `rightmost`: Render the injected button as a standalone trailing cell after share (not inside zone6).
   - The injected button should be rendered with the same styling as native icon cells (`width: 22px; flex: 0 0 22px`) when it is the active slot, so it visually matches the surrounding icons.
   - Inactive zones can show a dashed placeholder indicator.

2. **Fix slot calculation (1.1)**: Replace `getSlotFromMouseX` with a **cumulative-offset-based** algorithm that accounts for the actual widths of each cell (fixed icon width vs flex zone width).

3. **Remove duplicate drag handlers (1.4)**: Remove the container-level `onDragOver`/`onDragLeave`. Zone cells already handle `onDragOver` individually with `stopPropagation` — the container handler is redundant and causes flicker.

4. **Update posToSlot/slotToPos**: After fixing the cell layout, ensure the slot-to-position mapping reflects the new cell structure accurately.

### Phase 2 — Make the InteractiveBar view-aware (1.2, 1.3)
1. Accept a `hasViews` prop (default `true`). When `false`, remove the `views` icon from `nativeIcons` and adjust `posToSlot`/`slotToPos` to produce `after-like` when the user drops in the slot that would be "views".
2. Add a subtle tooltip or label on the zone cells describing the fallback behavior for views-omitted views.

### Phase 3 — Clean up `inject.ts` idempotency (2.1, 2.3, 2.6)
1. `computePlacement()` should normalize all positions to a single canonical string (e.g., `'leftmost'`, `'after-[action]'`, `'rightmost'`). The `'next-to-bookmark'` special case for `native-override` is redundant — remove it; `computePlacement` should just return `settingInjectedPosition`.
2. Remove the duplicate arrow-mode placement branch in `injectSaveButtons`. Factor into `insertWrapperAfterTestId('bookmark')` with the same share fallback.
3. Add a `console.warn` when `tweetId` extraction fails, gated on `__DEV__` or a settings flag.

### Phase 4 — Hardening (2.4, 1.5, 1.6, 3.3)
1. Add a logged counter for `scoreActionGroup` scores below `MIN_ACTION_BAR_SCORE` to detect X DOM changes in production.
2. Add click-to-place as a keyboard fallback: zones are already `cursor: pointer` and have `onClick` handlers — expose a hidden `role="radiogroup"` with `aria-label="Choose bookmark button position"` for screen readers.
3. For touch: implement `@use-gesture/react` or a custom pointer-event fallback that converts touch moves into drag events.
4. Consider debouncing the `MutationObserver` callback itself (in addition to the RAF debounce) to coalesce rapid batches.

### Phase 5 — Type and API cleanup (3.1, 3.2)
1. Remove the `SlotId` type alias from `InteractiveBar` — it serves no role as a shared type. Keep the string literal union for `posToSlot`/`slotToPos` locally.
2. Ensure `SaveConfigCardProps.injectedPosition` type exactly matches `settings.ts`'s `settingInjectedPosition` type by importing/exporting it from a shared `types.ts`.

---

## 5. Not Bugs (Design Decisions)

- **WeakMap keyed on tweet element** (`injectionStates`): intentional. X doesn't nest tweets; quote tweet inner tweets have separate action bars. Keying on the tweet element rather than the action bar is correct.
- **`settingsLoaded` not reset on `onChanged`**: correct — settings changes fire `injectSaveButtons` via `index.ts` listener, not via the `settingsLoaded` path.
- **`debouncedInjectSaveButtons` using a single RAF slot**: intentional (coalesce rapid mutations). The animation-frame approach is sound.
- **JSDOM fixtures vs production DOM**: test fixtures model simplified DOM; live X.com may differ. Tests validate structure, not visual rendering.
