import { memo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import { tapFeedback } from '../lib/haptics.js';
import { classifyMovement, knobOffset, resolveSwipe } from '../lib/swipe.js';
import './AddActionBar.css';

const COMMIT_ANIMATION = 170;
const REOPEN_LOCK = 700;

/**
 * The Today screen's add control. Tap: the Add new sheet. Swipe right: New Task.
 * Swipe left: New Habit. The knob follows the finger through direct style writes
 * (no React render per move), and each gesture can open at most one form.
 */
export const AddActionBar = memo(function AddActionBar({ onTap, onSwipeRight, onSwipeLeft }) {
  const barRef = useRef(null);
  const knobRef = useRef(null);
  const maskRef = useRef(null);
  const gesture = useRef(null);
  const frame = useRef(0);
  const lockedUntil = useRef(0);
  const suppressClick = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);

  // The knob carries a white copy of the "Habit" and "Task" labels, clipped to the
  // knob and moved the opposite way, so it lines up exactly with the real labels.
  // Wherever the green knob covers a label, the white copy shows on green; elsewhere
  // the original grey label shows on the track. Both stay readable at every point.
  useEffect(() => {
    const bar = barRef.current;
    const knob = knobRef.current;
    const measure = () => {
      bar.style.setProperty('--bar-w', `${bar.clientWidth}px`);
      bar.style.setProperty('--bar-h', `${bar.clientHeight}px`);
      bar.style.setProperty('--knob-w', `${knob.offsetWidth}px`);
      bar.style.setProperty('--knob-h', `${knob.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    observer.observe(knob);
    return () => observer.disconnect();
  }, []);

  const travel = () => {
    const bar = barRef.current;
    const knob = knobRef.current;
    return Math.max(0, (bar.clientWidth - knob.offsetWidth) / 2 - 6);
  };

  const setOffset = (x, animate) => {
    const bar = barRef.current;
    const knob = knobRef.current;
    if (!bar || !knob) return;
    const mask = maskRef.current;
    const transition = animate && !reducedMotion ? '' : 'none';
    knob.style.transition = transition;
    knob.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
    if (mask) {
      mask.style.transition = transition;
      mask.style.transform = x ? `translate3d(${-x}px, 0, 0)` : '';
    }
    const limit = travel() || 1;
    bar.style.setProperty('--swipe', String(Math.max(-1, Math.min(1, x / limit))));
  };

  const finish = (dx, max) => {
    const target = resolveSwipe(dx, max);
    barRef.current?.classList.remove('is-dragging');
    if (!target) {
      setOffset(0, true);
      return;
    }
    lockedUntil.current = Date.now() + REOPEN_LOCK;
    tapFeedback();
    setOffset(target === 'task' ? max : -max, true);
    window.setTimeout(
      () => {
        (target === 'task' ? onSwipeRight : onSwipeLeft)();
        setOffset(0, false);
      },
      reducedMotion ? 0 : COMMIT_ANIMATION,
    );
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (Date.now() < lockedUntil.current) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x0: event.clientX, y0: event.clientY, mode: 'pending', dx: 0, max: travel() };
  };

  const onPointerMove = (event) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || current.mode === 'scroll') return;
    const dx = event.clientX - current.x0;
    const dy = event.clientY - current.y0;
    if (current.mode === 'pending') {
      current.mode = classifyMovement(dx, dy);
      if (current.mode !== 'drag') return;
      suppressClick.current = true;
      barRef.current.classList.add('is-dragging');
      barRef.current.setPointerCapture?.(event.pointerId);
    }
    // Follow the finger; past the end, resist (rubber band) instead of stopping dead.
    current.dx = knobOffset(dx, current.max);
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => setOffset(current.dx, false));
  };

  const onPointerUp = (event) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    window.cancelAnimationFrame(frame.current);
    if (current.mode === 'drag') {
      finish(current.dx, current.max);
      // Touch drags don't produce a click to consume this, so it must expire, or a
      // later keyboard or accessibility activation of the bar would be ignored.
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 400);
    }
  };

  const onPointerCancel = () => {
    const current = gesture.current;
    gesture.current = null;
    window.cancelAnimationFrame(frame.current);
    if (current?.mode === 'drag') {
      barRef.current?.classList.remove('is-dragging');
      setOffset(0, true);
    }
  };

  return (
    <div className="add-bar-dock">
      <button
        ref={barRef}
        type="button"
        className="add-bar"
        aria-haspopup="dialog"
        aria-label="Add new. Opens a choice of habit or task. Swipe right for a new task, or left for a new habit."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (Date.now() < lockedUntil.current) return;
          lockedUntil.current = Date.now() + REOPEN_LOCK;
          tapFeedback();
          onTap();
        }}
      >
        <span className="add-bar-hint is-left" aria-hidden="true">
          <ChevronLeft size={17} strokeWidth={2.2} />
          Habit
        </span>
        <span ref={knobRef} className="add-bar-knob" aria-hidden="true">
          <span ref={maskRef} className="add-bar-knob-mask">
            <span className="add-bar-hint is-left">
              <ChevronLeft size={17} strokeWidth={2.2} />
              Habit
            </span>
            <span className="add-bar-hint is-right">
              Task
              <ChevronRight size={17} strokeWidth={2.2} />
            </span>
          </span>
          <span className="add-bar-knob-label">
            <Plus size={19} strokeWidth={2.4} />
            Add new
          </span>
        </span>
        <span className="add-bar-hint is-right" aria-hidden="true">
          Task
          <ChevronRight size={17} strokeWidth={2.2} />
        </span>
      </button>
    </div>
  );
});
