import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import { cx } from '../../lib/classNames.js';
import { isIOS } from '../../lib/platform.js';
import { IconButton } from './Button.jsx';
import './Modal.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])';
const TEXT_FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="color"]), textarea';
// Must match Modal.css. Phones get a bottom sheet that rises from the bottom edge.
export const SHEET_QUERY = '(max-width: 560px)';
const TIMING = {
  sheet: { enter: 380, exit: 260 },
  dialog: { enter: 250, exit: 160 },
  reduced: { enter: 140, exit: 140 },
};

/**
 * Accessible dialog with focus trapping, Escape/backdrop dismissal and an exit
 * transition. `children` may be a function that receives `close`, so content
 * can dismiss the dialog through the same animated path.
 *
 * `header`, when given, replaces the standard title row: a function receiving
 * `{ close, titleId }`, which must render an element with id `titleId`.
 */
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  header,
  size = 'md',
  role = 'dialog',
  className,
  bodyClassName,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const closingRef = useRef(false);
  const openingRef = useRef(true);
  const [closing, setClosing] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const isSheet = useMediaQuery(SHEET_QUERY);
  const timing = reducedMotion ? TIMING.reduced : isSheet ? TIMING.sheet : TIMING.dialog;
  const timingRef = useRef(timing);
  timingRef.current = timing;

  // One dismissal path for Cancel, Save, the close button, the backdrop, Escape and
  // Android Back: it runs once, and the sheet ignores taps while it leaves.
  // Height of the screen when the dialog opened (keyboard down), to tell how much
  // of it the keyboard takes when the dialog closes.
  const openHeight = useRef(typeof window === 'undefined' ? 0 : window.innerHeight);
  const exitObserver = useRef(null);
  useEffect(() => () => exitObserver.current?.disconnect(), []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const root = rootRef.current;
    const keyboard = isIOS ? 0 : Math.max(0, openHeight.current - window.innerHeight);
    if (root && keyboard > 80 && typeof ResizeObserver !== 'undefined') {
      // Closing with the keyboard up (Android): the screen grows back while the sheet
      // leaves. Hold the sheet's distance from the bottom edge as it grows (in the
      // same frame, from a ResizeObserver), and let the exit travel that much
      // further, so the sheet keeps sliding instead of jumping down with the resize.
      const heightAtClose = root.clientHeight;
      root.style.setProperty('--exit-extra', `${keyboard}px`);
      exitObserver.current = new ResizeObserver(() => {
        root.style.paddingBottom = `${Math.max(0, root.clientHeight - heightAtClose)}px`;
      });
      exitObserver.current.observe(root);
    }
    // Put the keyboard away as the sheet starts to leave, rather than when it
    // unmounts (which resized the screen in the middle of the closing animation).
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && panelRef.current?.contains(focused) && focused.matches(TEXT_FIELD)) {
      focused.blur();
    }
    setClosing(true);
    window.setTimeout(onClose, timingRef.current.exit);
  }, [onClose]);

  // Focus moves into the dialog at once (the panel itself), so keyboard and screen
  // reader users land inside it. A text field that should take focus gets it once
  // the sheet has settled: on Android the keyboard then resizes the screen after
  // the entrance, never in the middle of it, so the sheet can't jump.
  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    const scrollY = window.scrollY;
    const target = panel.querySelector('[data-autofocus]') ?? panel.querySelector(FOCUSABLE) ?? panel;
    const deferred = target.matches(TEXT_FIELD);
    (deferred ? panel : target).focus({ preventScroll: true });

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      openingRef.current = false;
      // Unless the user already chose something else in the meantime.
      if (deferred && panel.isConnected && document.activeElement === panel) target.focus({ preventScroll: true });
    };
    const onAnimationEnd = (event) => {
      if (event.target === panel) settle();
    };
    panel.addEventListener('animationend', onAnimationEnd);
    const fallback = window.setTimeout(settle, timingRef.current.enter + 80);

    // The page behind stays put: no scroll bleed while open, same position after.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(fallback);
      panel.removeEventListener('animationend', onAnimationEnd);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
      if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
    };
  }, []);

  // Keep a bottom sheet's actions above the on-screen keyboard on iOS, where the
  // keyboard overlays the page instead of resizing it. Not on Android: there the
  // WebView is resized, and this inset (from a momentarily stale visual viewport)
  // was making the sheet jump for a frame as the keyboard opened and closed.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !isIOS) return undefined;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      rootRef.current?.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const render = (content) => (typeof content === 'function' ? content(close) : content);

  return createPortal(
    <div ref={rootRef} className={cx('modal-root', closing && 'is-closing')} onKeyDown={onKeyDown}>
      <div
        className="modal-backdrop"
        // A tap that lands while the sheet is still rising (e.g. the tail of the
        // gesture that opened it) doesn't dismiss it.
        onMouseDown={() => {
          if (!openingRef.current) close();
        }}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx('modal', `modal-${size}`, className)}
      >
        {header ? (
          header({ close, titleId })
        ) : (
          <header className={cx('modal-header', !children && 'is-standalone')}>
            <div>
              <h2 id={titleId} className="modal-title">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="modal-description">
                  {description}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Close" size="sm" onClick={close} className="modal-close" />
          </header>
        )}
        {children && <div className={cx('modal-body', bodyClassName)}>{render(children)}</div>}
        {footer && <footer className="modal-footer">{render(footer)}</footer>}
      </div>
    </div>,
    document.body,
  );
}
