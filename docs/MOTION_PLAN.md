# Motion Library Plan

## Recommendation

Use the modern `motion` package for the React dashboard and popup, while keeping CSS-based animation for the X content-script layer.

The dashboard currently mixes CSS transitions, inline transforms, keyframes, and `requestAnimationFrame` scroll logic. A shared motion library can make component transitions more consistent, interruptible, and easier to tune.

## Why Motion

Motion is a good fit for the React surfaces because it supports:

- `AnimatePresence` for enter and exit transitions.
- Layout-aware animation for expanding/collapsing panels.
- Shared duration and easing behavior.
- Interruptible animations when users click repeatedly.
- React-friendly reduced-motion handling.
- Smooth drawer, modal, toast, and onboarding transitions.

Example accordion pattern:

```tsx
import { AnimatePresence, motion } from 'motion/react';

<AnimatePresence initial={false}>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

## What Should Use Motion

### Dashboard

Use Motion for:

- Settings panel and mobile settings drawer.
- AI Assistant expansion.
- Welcome and onboarding surfaces.
- Modal entry and exit.
- Toast entry and exit.
- Bulk-selection action bar appearance.
- Sort dropdown transitions.
- Empty-state transitions.

### Popup

Use Motion selectively for:

- Empty-state onboarding appearance.
- Recent bookmark list entry.
- Footer action transitions.

### X content script

Do **not** use the motion library for the X page injection layer unless there is a specific need.

Keep content-script motion in CSS because:

- X's DOM is an unstable integration surface.
- The injected script should remain lightweight.
- CSS avoids adding unnecessary bundle weight to the content script.
- X's own React rendering should not be affected by a second animation runtime.
- The existing sync progress animation is already well suited to CSS.

## Driver.js Compatibility

Motion and Driver.js can coexist:

- Driver.js handles tour positioning, spotlighting, and navigation.
- Motion handles surrounding React UI transitions.
- Driver.js should own its own popover lifecycle instead of having Motion and Driver.js animate the same element simultaneously.

Use Motion for the Settings drawer, onboarding preface, mobile layout changes, and completion feedback around the tour.

## Migration Phases

### Phase 1 — Motion foundation

- Add the `motion` dependency.
- Add shared animation presets in `src/motion/`:
  - `fade`
  - `slideUp`
  - `slideFromRight`
  - `accordion`
  - `scale`
- Define shared duration and easing tokens.
- Add a reduced-motion policy using Motion's reduced-motion support.
- Document which surfaces are controlled by Motion and which remain CSS-driven.

**Acceptance criteria:**

- Motion is available in the dashboard and popup bundles.
- Shared presets are used instead of repeated ad hoc transition values.
- Reduced-motion users do not receive unnecessary movement.

### Phase 2 — Replace unstable accordions

Migrate:

- Settings content expansion.
- AI Assistant expansion.
- Mobile Settings drawer.

Use `AnimatePresence` and height auto animation where appropriate. Remove obsolete grid-row/max-height animation rules after each component is verified.

**Acceptance criteria:**

- Open and close animations are smooth in both directions.
- Rapid repeated clicks do not leave a stuck or half-open state.
- Closing a drawer restores body scrolling correctly.
- The last visible content is not clipped during exit.

### Phase 3 — Presence-based components

Migrate:

- Modal.
- Toast.
- Bulk-selection action bar.
- Dashboard welcome panel.
- Empty-state onboarding.

Use enter and exit animations rather than relying on components disappearing immediately when unmounted.

**Acceptance criteria:**

- Components animate in and out without layout glitches.
- Toast actions remain clickable during their entrance and exit.
- Destructive confirmation dialogs remain accessible while animating.
- The bulk action bar does not cover content unexpectedly.

### Phase 4 — Onboarding tour integration

Use Driver.js-style targeting for the dashboard tour, with Motion handling:

- The pre-tour welcome state.
- Settings drawer opening before a Settings step.
- Mobile layout changes.
- Tour completion feedback.
- Post-tour contextual hints.

Add stable `data-onboarding` landmarks so the tour does not depend on fragile styling selectors.

**Acceptance criteria:**

- The tour can skip missing optional targets.
- The Settings target works on both desktop and mobile.
- The tour can be dismissed with Escape.
- Completion and dismissal persist correctly.
- Motion does not fight Driver.js positioning.

### Phase 5 — QA and polish

Test:

- Desktop dashboard.
- Mobile dashboard.
- Popup lifecycle, including popup close/reopen behavior.
- Light mode and dark mode.
- Reduced-motion preferences.
- Keyboard navigation.
- Rapid open/close interactions.
- Repeated component mount/unmount cycles.
- Chrome extension reloads.
- Settings drawer scroll locking.
- Long content and narrow viewports.

## Motion Guidelines

- Use 150–300ms for micro-interactions.
- Use ease-out for entering and ease-in for exiting.
- Prefer transform and opacity over top/left/width/height where layout does not need to change.
- Use height auto animation only for intentional accordions and drawers.
- Keep animations interruptible.
- Do not animate every bookmark card during normal database updates.
- Avoid decorative animation that does not communicate a state change.
- Keep hover feedback in CSS.
- Keep X content-script animations in CSS.
- Respect `prefers-reduced-motion`.
- Avoid multiple animation systems controlling the same element.
- Keep the primary action usable throughout transitions.

## Recommended Initial Targets

Start with these high-impact surfaces:

1. Settings drawer.
2. AI Assistant accordion.
3. Modal and Toast.
4. Bulk-selection action bar.
5. Dashboard onboarding/welcome state.
6. Mobile header and category navigation.

Do not begin by migrating every existing transition. Migrate one surface at a time, validate it, then remove its old CSS animation rules.

## Definition of Done

- React dashboard motion follows shared duration/easing presets.
- Settings and AI panels no longer rely on conflicting custom accordion animations.
- Modal, Toast, bulk action, and onboarding enter/exit states are smooth.
- Motion is reduced or disabled when requested by the user.
- Mobile and desktop behavior are both tested.
- X content-script UI remains lightweight and CSS-driven.
- Existing functionality and all current tests continue to pass.
