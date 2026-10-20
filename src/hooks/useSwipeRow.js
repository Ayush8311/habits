import { useEffect, useMemo, useRef } from 'react';
import { tapFeedback } from '../lib/haptics.js';
import {
  LONG_PRESS_MS,
  classifyMovement,
  movedPastSlop,
  resolveRowSwipe,
  rowCommitDistance,
  rowOffset,
} from '../lib/swipe.js';
import { usePrefersReducedMotion } from './useMediaQuery.js';

// After a swipe or a long press, the mouse events and click the browser sends on
// release are swallowed, so one gesture never does two things. This is page-wide:
// they land on whatever is under the finger by then, which after a long press is
// the editor it just opened (measured: the release tapped its Medium priority).
const CLICK_GUARD_MS = 400;
let swallowUntil = 0;
let swallowing = false;
function swallow(event) {
  if (Date.now() >= swallowUntil) return;
  event.preventDefault();
  event.stopPropagation();
}
function guardPage(ms) {
  if (!swallowing) {
    for (const type of ['mousedown', 'mouseup', 'click']) window.addEventListener(type, swallow, true);
    swallowing = true;
  }
  swallowUntil = Date.now() + ms;
}

/**
 * Tap, long press and sideways swipes on one list row, told apart from each other
 * and from vertical scrolling:
 *   - tap (and Enter/Space): the row's own click, which this lets through
 *   - long press with a finger, pen or mouse, or a right-click / context-menu key:
 *     `onLongPress`
 *   - a drag right or left past the commit point: `onSwipeRight` / `onSwipeLeft`
 *     (a side without a handler only gives a little and springs back)
 * Vertical movement is left to the page (the row is `touch-action: pan-y`), and a
 * press that moves never becomes a long press. The row follows the finger through
 * direct style writes on the surface, so a drag causes no React renders.
 *
 * Returns refs for the row (the element that receives the gesture) and its moving
 * surface, and the props to spread on the row.
 */
export function useSwipeRow({ enabled = true, onLongPress, onSwipeRight, onSwipeLeft }) {
  const rowRef = useRef(null);
  const surfaceRef = useRef(null);
  const gesture = useRef(null);
  const timer = useRef(0);
  const frame = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  // The newest callbacks, read at gesture time: memoised rows keep stable props.
  const latest = useRef(null);
  latest.current = { enabled, onLongPress, onSwipeRight, onSwipeLeft, reducedMotion };

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.cancelAnimationFrame(frame.current);
    },
    [],
  );

  const rowProps = useMemo(() => {
    const sides = () => ({ right: Boolean(latest.current.onSwipeRight), left: Boolean(latest.current.onSwipeLeft) });

    const draw = (x, width, animate) => {
      const row = rowRef.current;
      const surface = surfaceRef.current;
      if (!row || !surface) return;
      surface.style.transition = animate && !latest.current.reducedMotion ? '' : 'none';
      surface.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
      const progress = Math.min(1, Math.abs(x) / rowCommitDistance(width));
      row.style.setProperty('--swipe-progress', String(progress));
      if (x) row.dataset.swipe = x > 0 ? 'right' : 'left';
      else delete row.dataset.swipe;
      row.classList.toggle('is-armed', progress >= 1);
    };

    const endGuard = () => guardPage(CLICK_GUARD_MS);

    const fireLongPress = () => {
      const current = gesture.current;
      if (current) {
        current.mode = 'long';
        // The release comes back to this row even if the editor now covers it, so
        // its click is the one swallowed (touch already captures implicitly).
        try {
          rowRef.current?.setPointerCapture?.(current.id);
        } catch {
          // The pointer may already be gone.
        }
      }
      // Until the finger lifts (with a cap, should the release never arrive).
      guardPage(5000);
      tapFeedback();
      latest.current.onLongPress?.();
    };

    const finishDrag = (current, release) => {
      const row = rowRef.current;
      row?.classList.remove('is-swiping');
      draw(0, current.width, true);
      if (!release) return;
      const side = resolveRowSwipe(current.dx, current.width, sides());
      if (!side) return;
      tapFeedback();
      (side === 'right' ? latest.current.onSwipeRight : latest.current.onSwipeLeft)?.();
    };

    return {
      onPointerDown(event) {
        const { enabled: on, onLongPress: longPress } = latest.current;
        if (!on || (event.pointerType === 'mouse' && event.button !== 0)) return;
        window.clearTimeout(timer.current);
        gesture.current = {
          id: event.pointerId,
          x0: event.clientX,
          y0: event.clientY,
          mode: 'pending',
          dx: 0,
          width: rowRef.current?.offsetWidth ?? 0,
        };
        if (longPress) {
          timer.current = window.setTimeout(() => {
            if (gesture.current?.mode === 'pending') fireLongPress();
          }, LONG_PRESS_MS);
        }
      },
      onPointerMove(event) {
        const current = gesture.current;
        if (!current || current.id !== event.pointerId || current.mode === 'scroll' || current.mode === 'long') return;
        const dx = event.clientX - current.x0;
        const dy = event.clientY - current.y0;
        if (current.mode === 'pending') {
          if (movedPastSlop(dx, dy)) window.clearTimeout(timer.current);
          const kind = classifyMovement(dx, dy);
          if (kind === 'pending') return;
          const { right, left } = sides();
          if (kind === 'scroll' || (!right && !left)) {
            current.mode = 'scroll';
            window.clearTimeout(timer.current);
            return;
          }
          current.mode = 'drag';
          window.clearTimeout(timer.current);
          rowRef.current?.classList.add('is-swiping');
          rowRef.current?.setPointerCapture?.(event.pointerId);
        }
        current.dx = dx;
        const x = rowOffset(dx, current.width, sides());
        window.cancelAnimationFrame(frame.current);
        frame.current = window.requestAnimationFrame(() => draw(x, current.width, false));
      },
      onPointerUp(event) {
        const current = gesture.current;
        if (!current || current.id !== event.pointerId) return;
        gesture.current = null;
        window.clearTimeout(timer.current);
        window.cancelAnimationFrame(frame.current);
        if (current.mode === 'drag') {
          endGuard();
          finishDrag(current, true);
        } else if (current.mode === 'long') {
          endGuard();
        }
      },
      onPointerCancel() {
        const current = gesture.current;
        gesture.current = null;
        window.clearTimeout(timer.current);
        window.cancelAnimationFrame(frame.current);
        if (current?.mode === 'drag') finishDrag(current, false);
        if (current?.mode === 'long' || current?.mode === 'drag') endGuard();
      },
      // A long press on Android, a right-click or the context-menu key: the editor,
      // never the browser's own menu.
      onContextMenu(event) {
        const { enabled: on, onLongPress: longPress } = latest.current;
        if (!on || !longPress) return;
        event.preventDefault();
        const current = gesture.current;
        if (current && current.mode !== 'pending') return; // already handled (or a drag)
        window.clearTimeout(timer.current);
        fireLongPress();
        if (!current) endGuard(); // no press in progress (mouse or keyboard)
      },
    };
  }, []);

  return { rowRef, surfaceRef, rowProps };
}
