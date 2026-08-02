# XMarks — UI Improvement Suggestions

> Grounded in the actual current code: `src/index.css`, `src/App.css`, `src/App.tsx` (popup), `src/dashboard/{Dashboard.tsx,components/*,hooks/*}`, `src/content/{popover,inject,importer,toast,navigation}.ts`. Every suggestion cites a real file/class so it's actionable, not abstract.
>
> Organized by leverage: **Quick wins → Interaction → Information architecture → Accessibility → Visual system → States → Popup-specific → Content-script UI → Scaling**. Each item says *what*, *why*, *where*, and a concrete *how*.

---

## 🟢 Quick wins (low risk, high polish-per-minute)

### [x] ✅ W1. Delete `src/App.css` — it's 100% dead Vite boilerplate
**Where:** `src/App.css` (~100 lines: `.hero`, `.base`, `.framework`, `.vite`, `#center`, `#next-steps`, `#docs`, `.ticks`, `.counter`).
**Why:** None of these classes exist in `App.tsx` or any dashboard component — it's leftover Vite template scaffolding that still ships in the bundle and confuses readers. `src/App.tsx` doesn't even import `App.css` (it imports `./index.css`).
**How:** `rm src/App.css`. Verify `npx tsc -b` + `vite build` still green (they will). Saves ~100 lines and a parse step.

### [x] ✅ W2. Stop blocking render on a Google Fonts `@import`
**Where:** `src/index.css` line 1 — `@import url('https://fonts.googleapis.com/css2?family=Inter...');`
**Why:** CSS `@import` is render-blocking and forces a network round-trip before any paint. In an extension (especially the dashboard opened from a cold start) this visibly delays first paint, and it fails under strict CSP without `font-src` allowance.
**How:** Either (a) self-host `Inter` woff2 in `public/` and `@font-face` it, or (b) drop it entirely and rely on the `'Inter', -apple-system, ...` fallback stack you already declare — the native stack is instant and visually near-identical. Option (b) is the privacy-first choice consistent with the product's "all local" positioning.

### [x] ✅ W3. Make the settings panel reachable on small screens
**Where:** `src/index.css` ~`.settings-sidebar { @media (max-width:1100px) { display:none } }`.
**Why:** On a laptop window narrower than 1100px the **entire settings panel disappears with no replacement** — users can't change save mode, accent color, or AI settings at all. That's a feature-blackout, not responsive design.
**How:** Replace `display:none` with an off-canvas drawer (slide-in from right, triggered by a gear button that appears in the content header when `≤1100px`), or a modal. Minimum: keep the gear icon visible and overlay the panel on a backdrop tap.

### [x] ✅ W4. Replace native `confirm()`/`alert()` with in-app dialogs
**Where:** `Dashboard.tsx` `handleDelete` (`confirm('Delete this bookmark?')`), `toggleAutoCategorize` (`window.confirm(...)`), `handleImport` (`alert('Import successful!')` / `'Invalid JSON file'`), `runAutoCategorizeJobs` (`alert(...)`), `content/popover.ts` (`alert('Failed to save...')`), `content/importer.ts` (`showToast` is good — keep it).
**Why:** Raw browser dialogs are visually jarring, can't be themed, block the main thread, and on the extension pages break the design language. `alert()` specifically can truncate long messages on some platforms.
**How:** Small reusable `<Dialog>` + `<Toast>` (you already have a nice toast in `content/toast.ts` — port the concept into the dashboard as `src/dashboard/components/Toast.tsx` and a confirm-dialog variant). For delete, prefer **undo** over confirm (see I6).

### [x] ✅ W5. Strip dead state vars left by modularization
**Where:** `src/dashboard/Dashboard.tsx` — `catMenuPickingColor`, `catMenuRenaming`, `catMenuRenameVal` are stranded (declared, never meaningfully used after the component split).
**Why:** Harmless today (tsconfig `noUnusedLocals:false`) but they're noise that misleads the next reader into thinking there's a working context-menu rename flow.
**How:** Delete the three `useState` lines and any references; ~6 lines. Verify `tsc` green.

---

## 🟠 Interaction & UX

### I1. Show actions without requiring hover
**Where:** `BookmarkCard.tsx` `.bm-actions { opacity:0 }` revealed only on `.bookmark-card:hover`; category color-picker and rename pencil similarly hover-gated in `Sidebar.tsx`.
**Why:** Hover-only affordances are **invisible on touch devices and on laptops with no precise pointer** (trackpad tap doesn't fire `:hover` reliably). X gets away with it because it's a mouse-first desktop site; a bookmark *manager* dashboard will be used on tablets and via the popup on cramped viewports.
**How:** Keep hover-reveal as the polish layer, but add a persistent "⋯" overflow menu button on each card visible at all times (low-emphasis gray, accent on hover) that contains Open / Delete / Edit note / Change category. Mobile = always visible; desktop = visible-on-hover + always-visible on focus-within.

### I2. Add keyboard shortcuts (sortable, and the `OPEN_DASHBOARD` path already exists)
**Where:** No keyboard handling anywhere in `src/dashboard/*` or `src/App.tsx`.
**Suggested bindings:**
- `/` — focus search (`src/dashboard/components/BookmarkList.tsx` search input)
- `Esc` — closes any open popover / picker / notes editor
- `g` then `a` — go to All Bookmarks; `g` then a digit — go to Nth category
- `c` — create new category (focus the "New category…" input in `Sidebar.tsx`)
- `e` on a focused card — edit note; `Delete`/`Backspace` on focused card — delete (with undo)
- `?` — show the shortcut cheatsheet
**Why:** Power users (this product's exact audience — people who hit X's bookmark limits) expect Vim-style nav. It also makes the dashboard genuinely usable without the mouse.
**How:** Add `src/dashboard/hooks/useKeyboardShortcuts.ts` keyed off `(document.activeElement` not being an input/textarea). Print a small `?` cheatsheet overlay component.

### I3. Make the custom dropdowns real dropdowns (a11y + keyboard)
**Where:** `BookmarkCard.tsx` category dropdown (`.bm-cat-dropdown-menu`), `Sidebar.tsx` color picker, `SaveConfigCard.tsx`/`InteractiveBar.tsx` mode toggles.
**Why:** Today these are `<div>`/`<button>` with `onClick` only — no `role="menu"`/`listbox`, no `aria-expanded`, no `aria-activedescendant`, no arrow-key/`Home`/`End` nav, no `Esc` to close. Screen-reader users can't operate them; keyboard users can only Tab in then click.
**How:** Use a small `useListbox` primitive or `<select>`-backed styled control. Minimum viable: add `role`, `aria-expanded`, `aria-label`, focus-trap, `Esc`, and arrow-key handlers. The category dropdown benefits most because its items are dynamic.

### I4. Add bulk selection + bulk actions
**Where:** `BookmarkList.tsx` currently renders a flat list of cards.
**Why:** "Re-tag 50 dev tweets as *React*," "delete everything I imported from that old account," "export only the *Design* category" are the actual jobs the data model already supports (`categoryIds`, `tags`, `source`) but the UI offers no way to act on more than one row.
**How:** Add row checkboxes (visible on hover or when one is selected), a sticky "selection bar" at the top showing count + actions: *Set category · Add tag · Move to… · Export selected · Delete*. Wire to `db.bookmarks.bulkGet/bulkDelete` (Dexie supports it; you already use `bulkPut`).

### I5. Add **tags** to the UI — the schema has them, the UI doesn't
**Where:** `db/index.ts` `Bookmark.tags: string[]` exists; nothing in `Sidebar`, `BookmarkCard`, `BookmarkList`, or `content/popover.ts` reads or writes it. The popover only sets `categoryIds`.
**Why:** It's free taxonomy that the plan doc anticipated ("tag and organize"). For users with hundreds of bookmarks, one category is too coarse; tags make search actually powerful.
**How:**
- In `content/popover.ts`: add a tag input (chip-style, Enter to add, backspace to remove) next to the note.
- In `BookmarkCard.tsx` footer: render tag chips below the category badge.
- In `Sidebar.tsx`: add a "Tags" section listing distinct tags with counts (like categories).
- In `BookmarkList.tsx`: filter by clicking a tag chip.

### I6. Replace delete-confirm with **Undo** toast
**Where:** `Dashboard.tsx` `handleDelete` → `confirm('Delete this bookmark?')`.
**Why:** Confirm dialogs are friction for a low-stakes delete, and most users hit Enter without reading. An undoable delete (Gmail-style) is both faster *and* safer: the row collapses, a toast shows "Deleted — Undo" for 6s, and only then does it persist.
**How:** Optimistic local removal + 6s timer + a `db.bookmarks.delete()` only if not undone. You already have a toast primitive to port from `content/toast.ts`.

### I7. Full-text search across more fields + search "chips"
**Where:** `Dashboard.tsx` `filteredBookmarks` only matches `text`, `authorName`, `authorHandle`.
**Why:** Users write `note`s and (once I5 lands) add `tags`; they expect `#react` to find tagged rows and `note:invoice` to find notes. The DB already has all fields — the query is just incomplete.
**How:**
- Expand the filter predicate to include `note`, `tags[]`, and `quotedTweet.text`.
- Support a tiny query language: `from:@handle`, `tag:react`, `has:media`, `has:note`, `note:"exact phrase"`, `cat:Design`. Even 4 of these make search 10× more useful.
- Reflect active filters as removable chips above the list.

### [x] ✅ I8. Surface the original tweet date (it's in the schema, never shown)
**Where:** `db/index.ts` `Bookmark.createdAt?: Date` is captured but `BookmarkCard.tsx` only shows `formatDate(bookmark.savedAt)` as `.bm-date`.
**Why:** "When did I save this" is rarely what users want; "when was this posted" is. The data is there — you're paying the extraction cost (`content/extract.ts` already pulls the `<time>` link) but throwing away the display value.
**How:** Show both: `posted Apr 3 · saved 2d ago`. Add "Posted: newest/oldest" to the sort selector (which today only has *New/Old* = savedAt, and *A-Z* = author). This also unlocks I9.

### I9. Add more sort modes + grouping
**Where:** `Dashboard.tsx` sort selector has only `newest | oldest | author`.
**Why:** With a few thousand bookmarks a flat reverse-chronological list is unusable. Groups ("Today · This week · This month · Earlier") and sort-by-posted-date are standard in every read-later/bookmark app.
**How:** Add `saved`/`posted` axis switch + `Today/Earlier` group headers in `BookmarkList.tsx`. Cheap and high-impact.

### I10. Make the accent-color hover map derived, not hardcoded
**Where:** `Dashboard.tsx` `hoverMap` and `lightColors` `Record<string,string>` keyed by exact hex (only 6 colors); `App.tsx` duplicates a `hoverMap`. And `content/index.ts` (now `settings.ts`) does `currentAccentColor + 'CC'` for hover alpha.
**Why:** Pick a 7th accent color and its hover state silently falls back to the base color (no darker variant) — the map silently misses. The content-script uses a different alpha trick (`+ 'CC'`) than the dashboard (`hoverMap`), so the same accent looks different in the popup vs on x.com.
**How:** Derive hover/light programmatically: `lighten/hsl` helpers or `color-mix(in srgb, var(--accent) 12%, transparent)`. One source of truth, works for any accent the user could (future) pick.

---

## 🟡 Information architecture / data surfaced

### A1. Show stats in the sidebar (counts per category exist; add totals + tag counts)
**Where:** `Sidebar.tsx` shows per-category counts. No "saved this week," "with media," "uncategorized" roll-ups.
**Why:** A library manager's value is *knowing what you have*. A small "stats" footer in the sidebar ("1,204 saved · 26 uncategorized · 12 tags") turns the sidebar from nav into a dashboard.
**How:** Add a read-only `db.bookmarks.count()` + a couple of `.filter().count()` memos; render in a faint strip under the category list. The "uncategorized" number should be a clickable filter (jumps to the uncategorized set — pair with the existing AI auto-categorizer CTA).

### A2. Distinguish "Imported from X" vs "saved manually" in the card
**Where:** `Bookmark.source: 'extension' | 'x-bookmark-import'` is stored but invisible in `BookmarkCard.tsx`.
**Why:** Users syncing thousands of bookmarks want to know which ones they curated by hand vs bulk-imported — that maps directly to "trust" and to bulk-actions (e.g., "auto-categorize only imports").
**How:** A faint badge ("imported") on cards where `source === 'x-bookmark-import'`. Add a `source` filter chip alongside tags.

### A3. Quoted tweets and article cards could be more compact
**Where:** `BookmarkCard.tsx` renders both with heavy `1px solid var(--border)` borders + padding, inside a card that itself has borders.
**Why:** Nested bordered boxes stacked inside a bordered card reads as "cards-inside-cards" — busy and a little cheap-looking. It's also a lot of vertical space per row when you have hundreds.
**How:** Flatten the quoted tweet to a left-accent-bar quote (no border, just a 2px accent strip + indent). Article cards: drop the border, keep the thumbnail, use a single muted divider + domain in caps. Better density and hierarchy.

### A4. Media grid: add a lightbox and a real "max" indicator
**Where:** `BookmarkCard.tsx` media grid shows `slice(0,4)` and videos just `window.open(item.url)`.
**Why:** Clicking media opens a raw CDN URL in a new tab — jarring for images (downloads or in-tab) and broken for blob-hls videos (you already noted the blob fallback in `extract.ts`). Rows with 4 images silently drop the 5th+.
**How:** A tiny in-dashboard lightbox modal (arrow keys to paginate, click backdrop to close, Esc). On `slice(0,4)` when `media.length > 4`, show a "+N" overlay on the 4th tile that opens the lightbox at index 4.

---

## 🔵 Accessibility (a11y) — currently ~zero

### X1. Audit color contrast in dark mode
**Where:** `src/index.css` `@media (prefers-color-scheme: dark)` — `--text-subtle:#4a5568` on `--bg:#000`.
**Why:** `.bm-date`, `.empty-desc`, and `.sidebar-logo-sub` use `--text-subtle` and land **below WCAG AA (4.5:1)** on pure black. "subtle" should be quiet, not unread.
**How:** Raise `--text-subtle` to ~`#71767b` or `#8899a6` in dark (match X's actual muted gray, not a randomly darker hex). Run the其在 Lighthouse/issues pass on the dashboard.

### X2. Meaningful `aria-label`s everywhere icons are the only label
**Where:** All the new icon components in `src/dashboard/icons.tsx` render `<svg>` with no `aria-label` or `aria-hidden`. The `<button>`s wrapping them (link, delete, gear) have no `aria-label`.
**Why:** A screen-reader reads "button" with no name. Delete buttons especially must be labeled.
**How:** Add `aria-label="Delete bookmark"`, `aria-label="Open on X"`, etc. on every `.bm-action-btn` and `.btn-icon`. Mark decorative SVGs `aria-hidden="true"`.

### X3. Focus-visible styles (currently only the toggle input has them)
**Where:** `.btn`, `.sidebar-item`, `.bm-action-btn`, `.bookmark-card` have hover/focus *background* but no `:focus-visible` outline.
**Why:** Keyboard users get no visible focus ring because the browser outline was likely stripped and never replaced. `App.css`'s `.counter:focus-visible` shows the right pattern — it's just unused.
**How:** Add `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` (or a `box-shadow` ring) to every interactive element. Reusable via a `.focus-ring` mixin.

### X4. The interactive drag-bar position picker needs an equivalent non-drag path
**Where:** `InteractiveBar.tsx` — the save-button position is set by drag-and-drop only.
**Why:** Drag-and-drop is unusable for keyboard and assistive-tech users, and flaky on trackpads. It's a delightful *extra*, but not a usable *only* path.
**How:** Keep the drag bar; add a `<select>` (or radio group) alongside it labeled "Button position" with the 7 options as a fallback. Power users keep the drag; everyone else has a reliable control.

### X5. Toast notifications: announce to AT + auto-dismiss respects user preference
**Where:** `content/toast.ts` and the planned dashboard toast.
**Why:** Toasts that convey status should use `role="status"`/`aria-live="polite"` so screen readers announce them; they currently don't. Also the 4s/6s timers ignore `prefers-reduced-transparency`.
**How:** `role="status"` + `aria-live="polite"`; honor `prefers-reduced-motion` (no slide) and give a manual close `×` always (not only after the timer).

---

## 🎨 Visual system / consistency

### V1. Three accent-color systems exist — collapse to one
**Where:**
- `index.css`: `--accent / --accent-hover / --accent-light` defined for 6 values *in code* (the `useAccentColor` hook rewrites them on change).
- `Dashboard.tsx`: `hoverMap`/`lightColors` hardcoded the same 6.
- `App.tsx`: its own `hoverMap`.
- `content/settings.ts`: `currentAccentColor + 'CC'` / `+ '1A'` ad-hoc alpha.
**Why:** The same accent renders differently in popup vs dashboard vs on x.com. Adding a custom color picker later breaks all three.
**How:** W3 — derive hover/light from `--accent` via `color-mix`. Delete the maps. One source of truth.

### V2. Align dark-mode strategy with X's three themes
**Where:** `index.css` uses `@media (prefers-color-scheme: dark)` only; `content/extract.ts`... actually `content/navigation.ts`/`importer.ts` `getXTheme()` sniffs `body` background RGB and matches **3 hardcoded values** (`#000`, `#15202b`, `#fff`).
**Why:** X ships **Default (white), Dim (#15202b), and Lights-out (#000)**. The dashboard only respects OS light/dark — so a user on X's *Dim* theme gets the dashboard in OS-default, and the content-script theme detection misses any X theme it didn't hardcode (X tweaks these values over time; your #15202b literal will rot).
**How:** Read X's actual CSS variable (X exposes `--background-color` etc. on `:root` when you're on the page — more stable than RGB sniffing). For the dashboard, let the user pick *Light/Dim/Lights-out* explicitly in the new Personalization card (A-personalization), defaulting to OS.

### V3. Avatar placeholder is inconsistent with X
**Where:** `.bm-avatar` and `.popup-bm-avatar` use `background: linear-gradient(135deg, var(--accent), #9333ea)` — a purple-gradient circle with white initials.
**Why:** X uses flat-on-brand profile tiles; a purple gradient reads as a generic LLM-template placeholder (your own design skills flag "purple gradient avatar") and clashes with the otherwise flat, X-matching aesthetic. It also means two bookmarks by the same author look identical to two *different* authors (initials collide).
**How:** Flat `--bg-secondary` circle + `--text` initials, with a 1px `--border`. Or deterministically derive a hue from the handle (`hsl(hash(handle) …)`) for a flat tint — gives distinct-but-stable colors per author without the gradient tell.

### V4. Density: cards are over-padded for a library app
**Where:** `.bookmark-card { padding:16px }` + 6px–10px internal gaps.
**Why:** At the current density a 600px column shows ~3–4 cards. For a *reference library* with potentially thousands of rows, skim-density matters more than tweet-fidelity.
**How:** Offer a **Density toggle** (Comfortable / Compact) in Personalization. Compact: 12px card padding, 4px gaps, 14px body text, media grid max-height 160px. Saves ~40% vertical space.

### V5. Typography stack isn't X's
**Where:** `index.css` `font-family: 'Inter', -apple-system, ...`.
**Why:** X uses its own `TwitterChirp` face; the content script already sets `TwitterChirp, -apple-system, ...` for popover/toast/importer, but the dashboard uses Inter. The disconnect makes the dashboard feel like a *different app* from the in-page UI.
**How:** Mirror the content-script stack in the dashboard: `font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. If TwitterChirp isn't available on the dashboard page (it's only loaded on x.com), the native fallback still reads better than Inter for this product.

---

## ⚪ States (empty / loading / error)

### S1. Add a **loading** state — there is none
**Where:** `Dashboard.tsx` uses `useLiveQuery` but the list jumps from "empty state" to fully painted.
**Why:** `useLiveQuery` is async; on a slow IndexedDB read or first mount the user stares at the "No bookmarks found" empty state for a beat before their thousands of rows appear — misleading and flickery.
**How:** Distinguish `bookmarks === undefined` (loading) from `bookmarks.length === 0` (empty). Render a skeleton (3–5 gray placeholder cards with a shimmer) while undefined.

### S2. Make the empty state an **action**, not a dead-end
**Where:** `BookmarkList.tsx` empty state text: `"Start saving tweets using the button injected into X."`
**Why:** It tells you *what to do* but gives no way to do it from here. And if the user is on the uncategorized filter, the copy is wrong.
**Why now:** the popover/importer already exist; the empty state should send you to them.
**How:** Context-aware empty states with a CTA button:
- No bookmarks at all → "Open x.com and sync" (deep-link to your bookmarks page) + "Import JSON" if a backup exists.
- Filtered to a category with 0 → "No bookmarks in *Design* yet" + "Browse All".
- Search with no hits → "No matches for '`q`'" + "Clear filters".

### S3. AI panel: differentiate states more clearly
**Where:** `AICard.tsx` — toggle, progress bar, "Run now" button. No state for "model failed to download."
**Why:** The classifier downloads 45MB from HF; on a flaky connection it can fail (your own review noted the CSP `eval` runtime risk). Today a failure silently toggles back to off with an `alert`. The user has no visibility into *why* it's off.
**How:** Add an explicit **error chip** ("Download failed — Retry") with the error message, and a "Model ready ✓" success state once `isModelLoaded` is true. This pairs with the boxed-consent dialog: after consent, show the model card's lifecycle (Downloading → Ready → In-use → Idle).

### S4. Import progress: show a real progress bar, not a text counter
**Where:** `content/importer.ts` `toggleImporterPanel` shows text "Total saved: N" via `updatePanelUI`.
**Why:** Bulk import scrolls through thousands of bookmarks and can take minutes; a bare number gives no sense of progress or ETA.
**How:** Add a determinate-ish bar (rate of new IDs per scroll × remaining estimated page height) or at least a spinner + "scrolled N tweets, saved M new". Add a "Pause/Resume" alongside "Stop" (the loop already supports the concept; expose it).

---

## 📦 Popup-specific (`src/App.tsx`)

### P1. Add a quick search box in the popup
**Where:** `App.tsx` popup shows 5 recent saves + "Open Dashboard."
**Why:** The popup is the most-reached surface. Today the only path to a specific bookmark is "Open full dashboard" → search there. A single input in the popup that filters the recent list (and, on Enter, opens the dashboard pre-filtered) saves a round-trip.
**How:** A search input above the recent list that does client-side filtering of (a larger) recent set (e.g. last 50) — instant. Enter → `chrome.tabs.create` dashboard with `?q=...` and have `Dashboard.tsx` read the query param to prefill search.

### P2. Show category + tag counts in the popup
**Where:** Popup only shows total count ("`{N}` saved").
**Why:** The number "1,204" tells you nothing about organization. "1,204 · 14 cats · 26 tags" is a 5-second health check.
**How:** Tiny line under the title. A click routes to the dashboard's relevant view.

### P3. Add "Save current tab" if the user is on a tweet
**Where:** Popup never inspects the active tab.
**Why:** If you're reading a tweet and open the popup to find it, there's no shortcut to save *that* tweet — you have to close the popup and use the injected button.
**How:** On popup open, `chrome.tabs.query({active:true})` → if URL matches `x.com/*/status/*`, show a "★ Save this tweet" primary button at top that messages the content script to trigger `saveTweet` for that tweet. Closes the loop on the most common popup intent.

### P4. "Sync Bookmarks" shortcut in the popup
**Where:** Popup has only "Open Dashboard."
**Why:** The bulk importer is the headline feature but it's only reachable by navigating to x.com/bookmarks and spotting the injected sidebar button. A popup CTA ("Sync now" → opens x.com bookmarks in a new tab) dramatically improves discoverability.
**How:** Second button in `popup-footer`: "Sync Bookmarks" → `chrome.tabs.create({url:'https://x.com/i/bookmarks'})`. The injected button does the rest.

---

## 🧷 Content-script UI (`src/content/*`)

### [x] ✅ C1. The injected save button has no saved/unsaved state
**Where:** `content/inject.ts` `injectSaveButtons` — every `.twtbk-save-btn` looks identical whether or not the tweet is already in the DB.
**Why:** Users can't tell at a glance which tweets they've already saved, so they either re-save (you dedup, fine) or skip saving because they think they might already have it. This is the single biggest UX gap in the in-page experience.
**How:** On injection, `chrome.runtime.sendMessage({type:'CHECK_TWEET_SAVED', payload:{id}})` (the handler already exists in `background.ts`). If saved, tint the icon with `currentAccentColor` + show a subtle ✓ state (matches X's "filled bookmark" pattern). Hover tooltip: "Already in XMarks."

### C2. The category popover lacks keyboard/focus handling and positioning edge cases
**Where:** `content/popover.ts` `showCategoryPopover` — positions with `rect.right - popoverWidth` clamp but doesn't handle very narrow viewports, and the new-category input isn't autofocused.
**Why:** On a half-screen window the popover can still clip; the user has to click into the input manually (the native X menu behavior auto-focuses).
**How:** Auto-focus `#twtbk-new-cat` on show. Add an `Esc`↔cleanup handler (currently only outside-click closes it). Position: if `rect.bottom + popoverHeight > innerHeight`, open *upward* (you already do this for the importer panel in `toggleImporterPanel` — reuse the logic).

### C3. The sidebar- importer button "@2x sync" copy and icon differ from X
**Where:** `content/importer.ts` `injectImporterSidebarUI` uses a bookmark-outline icon + "Sync Bookmarks" label, styled to *roughly* match the Post button.
**Why:** Side-by-side with X's actual nav it's close but not pixel-perfect — the icon weight, the pill height, and the label color drift. Power users on a polished product notice.
**How:** Pull the exact computed styles of `SideNav_NewTweet_Button` at runtime and copy `height`, `border-radius`, `font`, `padding`, `letter-spacing` (you already clone `className` + `style` — extend to copy the *computed* values too). This makes it theme-rot-proof.

### C4. Toast: add a manual close and progress fade
**Where:** `content/toast.ts` `showToast`.
**Why:** The toast auto-dismisses in 4s with no manual close — if a user is mid-task they can lose it. Also the slide animation isn't reduced-motion aware.
**How:** Always show a `×` close; honor `prefers-reduced-motion` (instant show/hide); add a thin bottom-progress bar that depletes over the 4s so the user *sees* it's about to vanish.

---

## ⚡ Scaling (when the library gets big)

### N1. Virtualize the bookmark list
**Where:** `BookmarkList.tsx` renders `filteredBookmarks.map(...)` — every row mounted to the DOM.
**Why:** A few thousand cards will jank the dashboard hard on mount and on every filter change. `BookmarkCard.tsx` is 364 lines of JSX per row × N = a lot of DOM nodes.
**How:** `react-virtuoso` or a manual `IntersectionObserver` windower. Keep the current card component, just render a window of it. Pair with S1 skeletons.

### N2. Debounce search input
**Where:** `Dashboard.tsx` `filteredBookmarks` recomputes on every `searchQuery` keystroke (no debounce).
**Why:** Over thousands of rows + a `.filter()` that touches multiple string fields, each keystroke does real work. Fine at 100 rows, laggy at 5000.
**How:** `useDeferredValue(searchQuery)` (React 19 — you're on `react@^19.2.7`) or a 150ms `useDebounce`. `useDeferredValue` is the modern one-liner and keeps input snappy.

### N3. Index the search fields in Dexie
**Where:** `db/index.ts` `stores` indexes `id, savedAt, *categoryIds, *tags, source, syncStatus`.
**Why:** The dashboard search is a full `.toArray().filter()` — fine now, O(n) forever. With `tags` and `note` indexed as multiEntry, you can move search into Dexie for big collections.
**How:** Add `*note` (or a derived `searchBlob`) and `authorHandle` to the stores. Optional, only once N1+N2 aren't enough.

---

## Suggested order of attack (impact ÷ effort)

1. **W1** (delete dead App.css) + **W5** (strip dead state) — 5 min, instant cleanliness.
2. **C1** (saved/unsaved state on injected button) — highest-impact in-page UX win, uses an existing background handler.
3. **I8** (show posted date) + **I9** (sort modes) + **A1** (sidebar stats) — data you already have, just surface it.
4. **W3** (settings reachable <1100px) — fixes a real feature-blackout.
5. **I5** (tags in UI) + **I7** (better search) + **I4** (bulk actions) — turns the dashboard from a list into a tool.
6. **A11y batch X1–X5** — contract-grade; do once, ship.
7. **S1+S2+S3** (loading/empty/error states) — makes every surface feel finished.
8. **V2** (3-theme alignment) + **V1** (one accent system) — visual consistency pass.
9. **N1+N2** (virtualize + deferred search) — when the library is real-sized.
10. **P1–P4** (popup) — make the most-reached surface earn its keep.

Each is shippable independently and leaves `tsc -b` + `vite build` green. Most map directly to the modular files we just created — e.g. C1 lives in `content/inject.ts`, I8/I9 in `Dashboard.tsx`+`helpers.ts`, the a11y batch touches `icons.tsx` + `index.css`, the popup batch is all `App.tsx`+`App.css`.