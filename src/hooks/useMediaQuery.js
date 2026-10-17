import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export const COMPACT_QUERY = '(max-width: 720px)';
/** Phones and portrait tablets get the tab-based mobile app. */
export const MOBILE_QUERY = '(max-width: 820px)';
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
