import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * A number that eases to new values. Each frame writes the text directly to the
 * element, so counting up costs no React renders (it used to re-render its
 * component on every frame). Interrupted counts continue from the shown value.
 */
export function AnimatedNumber({ value, className, duration = 320 }) {
  const ref = useRef(null);
  const shown = useRef(value);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = ref.current;
    const from = shown.current;
    if (!element) return undefined;
    if (reducedMotion || from === value) {
      shown.current = value;
      element.textContent = String(Math.round(value));
      return undefined;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      shown.current = from + (value - from) * easeOutCubic(progress);
      element.textContent = String(Math.round(shown.current));
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reducedMotion]);

  return (
    <span ref={ref} className={className ?? 'tabular'}>
      {Math.round(shown.current)}
    </span>
  );
}
