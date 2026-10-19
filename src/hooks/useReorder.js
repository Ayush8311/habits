import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { moveItem } from '../lib/order.js';
import { usePrefersReducedMotion } from './useMediaQuery.js';

const SETTLE_MS = 160;
const EDGE = 72; // px from the top, or from the bottom controls, where dragging scrolls the page
const BOTTOM_CONTROLS = 150; // tab bar + add bar

/**
 * Drag-to-reorder for one list. Rows carry `data-reorder-id`; each row's handle gets
 * `handleProps(id, name)`. The dragged row follows the finger and its neighbours
 * slide aside, all through transforms written directly to the DOM (no React render
 * per move). On release the row glides into its slot, then `onReorder(newIds)` is
 * called and the inline transforms are cleared in the same frame, so nothing jumps.
 * Lists are independent: a row can only move within its own list.
 */
export function useReorder({ ids, onReorder }) {
  const listRef = useRef(null);
  const drag = useRef(null);
  const settling = useRef(false);
  const focusAfter = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const order = ids.join('\n');

  const rows = () => [...(listRef.current?.querySelectorAll(':scope > [data-reorder-id]') ?? [])];

  // After a reorder React has moved the rows into place; drop the drag styling now.
  useLayoutEffect(() => {
    if (settling.current) {
      settling.current = false;
      const els = rows();
      for (const el of els) {
        el.style.transition = 'none';
        el.style.transform = '';
        el.classList.remove('is-dragging');
      }
      listRef.current?.classList.remove('is-reordering');
      void listRef.current?.offsetHeight; // apply the reset before transitions come back
      for (const el of els) el.style.transition = '';
    }
    if (focusAfter.current) {
      listRef.current?.querySelector(`[data-reorder-handle="${CSS.escape(focusAfter.current)}"]`)?.focus();
      focusAfter.current = null;
    }
  }, [order]);

  useEffect(() => () => window.cancelAnimationFrame(drag.current?.frame ?? 0), []);

  const layout = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const pageY = d.pointerY + window.scrollY;
    const { index, tops, heights, els } = d;
    const last = els.length - 1;
    const min = tops[0] - tops[index];
    const max = tops[last] + heights[last] - (tops[index] + heights[index]);
    const dy = Math.max(min, Math.min(max, pageY - d.startY));
    d.dy = dy;
    els[index].style.transform = `translate3d(0, ${dy}px, 0)`;

    const center = tops[index] + heights[index] / 2 + dy;
    let target = index;
    // Inclusive, so a row held at the very top or bottom (where the drag is clamped)
    // takes the end slot.
    for (let i = index + 1; i <= last; i += 1) if (center >= tops[i] + heights[i] / 2) target = i;
    for (let i = index - 1; i >= 0; i -= 1) if (center <= tops[i] + heights[i] / 2) target = i;
    d.target = target;

    const slot = heights[index];
    els.forEach((el, i) => {
      if (i === index) return;
      const offset = i > index && i <= target ? -slot : i < index && i >= target ? slot : 0;
      el.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : '';
    });
  }, []);

  // While dragging near the top or the bottom controls, scroll the page.
  const autoScroll = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const bottomEdge = window.innerHeight - BOTTOM_CONTROLS;
    let speed = 0;
    if (d.pointerY < EDGE) speed = -Math.ceil((EDGE - d.pointerY) / 6);
    else if (d.pointerY > bottomEdge) speed = Math.ceil((d.pointerY - bottomEdge) / 6);
    if (speed) {
      window.scrollBy(0, speed);
      layout();
    }
    d.frame = window.requestAnimationFrame(autoScroll);
  }, [layout]);

  const finish = useCallback(
    (commit) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      window.cancelAnimationFrame(d.frame);
      const { index, target, els, tops, heights } = d;
      const moved = commit && target !== index;
      const finalDy = !moved
        ? 0
        : target > index
          ? tops[target] + heights[target] - (tops[index] + heights[index])
          : tops[target] - tops[index];
      const dragged = els[index];
      dragged.style.transition = reducedMotion ? 'none' : `transform ${SETTLE_MS}ms var(--ease-out)`;
      dragged.style.transform = finalDy ? `translate3d(0, ${finalDy}px, 0)` : '';
      if (!moved) {
        for (const el of els) if (el !== dragged) el.style.transform = '';
      }
      window.setTimeout(
        () => {
          if (moved) {
            settling.current = true;
            onReorder(moveItem(ids, index, target));
          } else {
            dragged.classList.remove('is-dragging');
            dragged.style.transition = '';
            listRef.current?.classList.remove('is-reordering');
          }
        },
        reducedMotion ? 0 : SETTLE_MS,
      );
    },
    [ids, onReorder, reducedMotion],
  );

  const handleProps = (id, name) => ({
    'data-reorder-handle': id,
    'aria-label': `Reorder ${name}. Use the up and down arrow keys to move it.`,
    onPointerDown: (event) => {
      if (drag.current || settling.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      const els = rows();
      const index = els.findIndex((el) => el.dataset.reorderId === id);
      if (index < 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      drag.current = {
        index,
        target: index,
        els,
        tops: els.map((el) => el.getBoundingClientRect().top + window.scrollY),
        heights: els.map((el) => el.offsetHeight),
        startY: event.clientY + window.scrollY,
        pointerY: event.clientY,
        dy: 0,
        frame: 0,
      };
      listRef.current.classList.add('is-reordering');
      els[index].classList.add('is-dragging');
      els[index].style.transition = 'none';
      for (const el of els) if (el !== els[index]) el.style.transition = reducedMotion ? 'none' : '';
      drag.current.frame = window.requestAnimationFrame(autoScroll);
    },
    onPointerMove: (event) => {
      if (!drag.current) return;
      drag.current.pointerY = event.clientY;
      layout();
    },
    onPointerUp: () => finish(true),
    onPointerCancel: () => finish(false),
    onClick: (event) => event.stopPropagation(),
    onKeyDown: (event) => {
      const index = ids.indexOf(id);
      const to = { ArrowUp: index - 1, ArrowDown: index + 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      if (to < 0 || to >= ids.length) return;
      focusAfter.current = id;
      onReorder(moveItem(ids, index, to));
    },
  });

  /** Accessible alternative to dragging: move one place up (-1) or down (+1). */
  const move = (id, delta) => {
    const index = ids.indexOf(id);
    const to = index + delta;
    if (index < 0 || to < 0 || to >= ids.length) return;
    onReorder(moveItem(ids, index, to));
  };

  return { listRef, handleProps, move };
}
