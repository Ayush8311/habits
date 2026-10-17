import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './useMediaQuery.js';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/** Eases a number towards `value` so statistics count up instead of jumping. */
export function useAnimatedNumber(value, duration = 400) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    const from = currentRef.current;
    if (reducedMotion || from === value) {
      currentRef.current = value;
      setDisplay(value);
      return undefined;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * easeOutCubic(progress);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reducedMotion]);

  return display;
}
