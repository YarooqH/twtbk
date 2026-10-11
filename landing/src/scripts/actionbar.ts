import { pulseAt } from './dotfield';

// The hero's action bar, mirroring the "Button position" setting in the
// extension dashboard: drag the XMarks book into any of seven slots (the other
// icons spring aside), click it to save, or switch to "Override native", where
// X's own bookmark button saves to XMarks instead.

const NATIVE = ['reply', 'repost', 'like', 'views', 'bookmark', 'share'];
const SLOT_LABELS = ['Before Reply', 'After Reply', 'After Repost', 'After Like', 'After Views', 'After Bookmark', 'After Share'];
const DRAG_THRESHOLD = 5;

export function initActionBar() {
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  const book = document.querySelector<HTMLButtonElement>('[data-book]');
  const star = document.querySelector<HTMLButtonElement>('[data-star]');
  const placed = document.querySelector<HTMLElement>('[data-placed]');
  const help = document.querySelector<HTMLElement>('[data-help]');
  const toast = document.querySelector<HTMLElement>('[data-toast]');
  if (!stage || !book || !star || !placed || !help || !toast) return;

  const icons = new Map<string, HTMLElement>();
  stage.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => icons.set(el.dataset.icon!, el));
  const zones = Array.from(stage.querySelectorAll<HTMLButtonElement>('[data-zone]'));
  const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mode]')).filter((el) => el.tagName === 'BUTTON');

  let mode: 'injected' | 'native-override' = 'injected';
  let slot = 5;
  let preview: number | null = null;
  let saved = false;
  let drag: { startX: number; moved: boolean } | null = null;
  let suppressClick = false;
  let toastTimer = 0;

  const pct = (i: number, n: number) => `${((i + 0.5) / n) * 100}%`;

  function layout() {
    if (mode === 'injected') {
      const at = preview ?? slot;
      let n = 0;
      for (let s = 0; s < 7; s++) {
        if (s === at) {
          if (!drag?.moved) book!.style.left = pct(s, 7);
          continue;
        }
        icons.get(NATIVE[n++])!.style.left = pct(s, 7);
      }
      zones.forEach((z, i) => {
        z.style.left = `${(i / 7) * 100}%`;
        z.classList.toggle('is-target', preview === i);
      });
      placed!.textContent = `Placed: ${SLOT_LABELS[at]}`;
    } else {
      NATIVE.forEach((key, i) => { icons.get(key)!.style.left = pct(i, 6); });
      star!.style.left = pct(NATIVE.indexOf('bookmark'), 6);
      placed!.textContent = 'Mode: X’s bookmark button saves a copy into XMarks';
    }
  }

  function showToast(message: string) {
    toast!.textContent = message;
    toast!.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast!.classList.remove('is-on'), 2800);
  }

  function pulseFrom(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    pulseAt(r.left + r.width / 2, r.top + r.height / 2);
  }

  function setSaved(next: boolean, from: HTMLElement) {
    saved = next;
    book!.classList.toggle('is-saved', saved);
    star!.classList.toggle('is-saved', saved);
    const label = saved ? 'Saved to XMarks' : 'Save to XMarks';
    book!.setAttribute('aria-label', `${label}. Arrow keys move it.`);
    star!.setAttribute('aria-label', label);
    if (saved) pulseFrom(from);
    showToast(saved ? 'Saved to XMarks!' : 'Removed from XMarks');
  }

  function setMode(next: typeof mode) {
    mode = next;
    stage!.dataset.mode = mode;
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    book!.hidden = mode !== 'injected';
    star!.hidden = mode === 'injected';
    icons.get('bookmark')!.hidden = mode !== 'injected';
    help!.textContent = mode === 'injected' ? 'Drag the book to any slot. Click it to save.' : 'Your X bookmark button now saves to XMarks. Click it.';
    layout();
  }

  function place(next: number) {
    slot = Math.max(0, Math.min(6, next));
    layout();
  }

  const slotAt = (clientX: number) => {
    const r = stage!.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    return { x, s: Math.min(6, Math.floor(x / (r.width / 7))) };
  };

  // Pointer-driven drag (not HTML5 drag-and-drop): the book follows the pointer
  // and lands in the slot it's released over, wherever the pointer is.
  book.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { startX: e.clientX, moved: false };
    book.setPointerCapture(e.pointerId);
  });

  book.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD) return;
    drag.moved = true;
    book.classList.add('is-dragging');
    const { x, s } = slotAt(e.clientX);
    book.style.left = `${x}px`;
    if (preview !== s) {
      preview = s;
      layout();
    }
  });

  const endDrag = (e: PointerEvent, commit: boolean) => {
    const d = drag;
    drag = null;
    if (book.hasPointerCapture(e.pointerId)) book.releasePointerCapture(e.pointerId);
    if (!d?.moved) return;
    // The click that follows a drag shouldn't also toggle the save.
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 0);
    book.classList.remove('is-dragging');
    const target = commit ? slotAt(e.clientX).s : slot;
    preview = null;
    place(target);
    if (commit) window.requestAnimationFrame(() => pulseFrom(zones[target]));
  };
  book.addEventListener('pointerup', (e) => endDrag(e, true));
  book.addEventListener('pointercancel', (e) => endDrag(e, false));

  book.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    setSaved(!saved, book);
  });

  book.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      place(slot + (e.key === 'ArrowLeft' ? -1 : 1));
    }
  });

  star.addEventListener('click', () => setSaved(!saved, star));
  zones.forEach((z, i) => z.addEventListener('click', () => place(i)));
  modeButtons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as typeof mode)));

  layout();
}
