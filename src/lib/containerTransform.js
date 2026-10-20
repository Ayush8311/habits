import { flushSync } from 'react-dom';

// The shared element of a container transform (see MobileApp.css): a task-list card
// that grows into the opened list's page, and shrinks back into its card.
export const MORPH_NAME = 'list-morph';

let running = null;

/**
 * Runs `update` (a React state change) as a container transform: `from` (the
 * element on screen now) morphs into the element `to()` returns once the update has
 * rendered (and `after`, e.g. restoring a scroll position, has run). Uses the View
 * Transitions API, which animates snapshots on the compositor, so the page itself
 * does no layout work per frame. Without the API, or with reduced motion, the
 * update simply happens (a CSS fade covers the former).
 *
 * `direction` ('open' | 'close') picks the timing in CSS. A new call while one is
 * running finishes the running one at once, so rapid taps never queue up.
 */
export function containerTransform({ from, to, update, after, direction, reducedMotion }) {
  if (reducedMotion || typeof document.startViewTransition !== 'function' || !from) {
    flushSync(update);
    after?.();
    return;
  }
  running?.skipTransition();
  const root = document.documentElement;
  let target = null;
  from.style.viewTransitionName = MORPH_NAME;
  root.dataset.morph = direction;
  const transition = document.startViewTransition(() => {
    from.style.viewTransitionName = '';
    flushSync(update);
    after?.();
    target = to();
    if (target) target.style.viewTransitionName = MORPH_NAME;
  });
  running = transition;
  transition.finished.finally(() => {
    from.style.viewTransitionName = '';
    if (target) target.style.viewTransitionName = '';
    if (running === transition) {
      running = null;
      delete root.dataset.morph;
    }
  });
}
