import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react';
import { cx } from '../../lib/classNames.js';
import './WheelPicker.css';

export const WHEEL_ITEM_HEIGHT = 36;
const SETTLE_DELAY = 110;

/**
 * One scrollable wheel column. Scrolling snaps natively (CSS scroll-snap); the
 * value is only reported once scrolling settles, so React doesn't re-render on
 * every scroll frame. Arrow keys, Page Up/Down, Home/End and tapping a row also
 * change the value. `options` are { value, label }.
 */
export function WheelColumn({ label, options, value, onChange, className }) {
  const scrollerRef = useRef(null);
  const settleTimer = useRef(0);
  // `interacting`: the user is scrolling. `programmatic`: the wheel is scrolling
  // itself to a value set by a tap, a key or the parent; that must never be read
  // back as a choice, or a quick series of key presses would undo itself.
  const interacting = useRef(false);
  const programmatic = useRef(false);
  const mounted = useRef(false);
  const baseId = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const settle = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    interacting.current = false;
    const next = Math.min(options.length - 1, Math.max(0, Math.round(scroller.scrollTop / WHEEL_ITEM_HEIGHT)));
    if (options[next] && options[next].value !== value) onChange(options[next].value);
    else if (Math.abs(scroller.scrollTop - next * WHEEL_ITEM_HEIGHT) > 1) {
      scroller.scrollTo({ top: next * WHEEL_ITEM_HEIGHT, behavior: 'smooth' });
    }
  }, [options, value, onChange]);

  // Keep the wheel on the current value when it changes from outside (or a tap).
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const top = index * WHEEL_ITEM_HEIGHT;
    if (interacting.current || Math.abs(scroller.scrollTop - top) < 1) return;
    programmatic.current = true;
    scroller.scrollTo({ top, behavior: mounted.current ? 'smooth' : 'instant' });
  }, [index]);
  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const supportsScrollEnd = 'onscrollend' in window;
    const endProgrammatic = () => {
      programmatic.current = false;
    };
    const onScroll = () => {
      window.clearTimeout(settleTimer.current);
      if (programmatic.current) {
        if (!supportsScrollEnd) settleTimer.current = window.setTimeout(endProgrammatic, SETTLE_DELAY);
        return;
      }
      interacting.current = true;
      if (!supportsScrollEnd) settleTimer.current = window.setTimeout(settle, SETTLE_DELAY);
    };
    const onScrollEnd = () => {
      window.clearTimeout(settleTimer.current);
      if (programmatic.current) {
        endProgrammatic();
        return;
      }
      // A short pause lets a fling's final snap land before reading the position.
      settleTimer.current = window.setTimeout(settle, 40);
    };
    // A finger or wheel on the column always takes over from an automatic scroll.
    const onUserInput = () => {
      programmatic.current = false;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) scroller.addEventListener('scrollend', onScrollEnd);
    scroller.addEventListener('pointerdown', onUserInput, { passive: true });
    scroller.addEventListener('touchstart', onUserInput, { passive: true });
    scroller.addEventListener('wheel', onUserInput, { passive: true });
    return () => {
      window.clearTimeout(settleTimer.current);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('scrollend', onScrollEnd);
      scroller.removeEventListener('pointerdown', onUserInput);
      scroller.removeEventListener('touchstart', onUserInput);
      scroller.removeEventListener('wheel', onUserInput);
    };
  }, [settle]);

  const choose = (nextIndex) => {
    const bounded = Math.min(options.length - 1, Math.max(0, nextIndex));
    if (options[bounded].value !== value) onChange(options[bounded].value);
  };

  const onKeyDown = (event) => {
    const moves = { ArrowUp: index - 1, ArrowDown: index + 1, PageUp: index - 5, PageDown: index + 5, Home: 0, End: options.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    choose(moves[event.key]);
  };

  return (
    <div
      ref={scrollerRef}
      className={cx('wheel-column', className)}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${baseId}-${index}`}
      onKeyDown={onKeyDown}
    >
      <div className="wheel-spacer" aria-hidden="true" />
      {options.map((option, optionIndex) => (
        <div
          key={option.value}
          id={`${baseId}-${optionIndex}`}
          role="option"
          aria-selected={optionIndex === index}
          className={cx('wheel-item', optionIndex === index && 'is-selected')}
          onClick={() => choose(optionIndex)}
        >
          {option.label}
        </div>
      ))}
      <div className="wheel-spacer" aria-hidden="true" />
    </div>
  );
}

/** Columns side by side with one shared selection band. */
export function WheelGroup({ label, children, className }) {
  return (
    <div className={cx('wheel-group', className)} role="group" aria-label={label}>
      <div className="wheel-band" aria-hidden="true" />
      {children}
    </div>
  );
}
