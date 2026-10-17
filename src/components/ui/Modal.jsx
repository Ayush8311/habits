import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import { cx } from '../../lib/classNames.js';
import { IconButton } from './Button.jsx';
import './Modal.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])';
const EXIT_DURATION = 160;

/**
 * Accessible dialog with focus trapping, Escape/backdrop dismissal and an exit
 * transition. `children` may be a function that receives `close`, so content
 * can dismiss the dialog through the same animated path.
 */
export function Modal({ title, description, onClose, children, footer, size = 'md', role = 'dialog' }) {
  const titleId = useId();
  const descriptionId = useId();
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, reducedMotion ? 0 : EXIT_DURATION);
  }, [onClose, reducedMotion]);

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    const target = panel.querySelector('[data-autofocus]') ?? panel.querySelector(FOCUSABLE) ?? panel;
    target.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  // Keep a bottom sheet's actions above the on-screen keyboard on iOS, where the
  // keyboard overlays the page instead of resizing it.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
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
      <div className="modal-backdrop" onMouseDown={close} aria-hidden="true" />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx('modal', `modal-${size}`)}
      >
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
        {children && <div className="modal-body">{render(children)}</div>}
        {footer && <footer className="modal-footer">{render(footer)}</footer>}
      </div>
    </div>,
    document.body,
  );
}
