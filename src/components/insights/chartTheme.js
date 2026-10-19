// SVG presentation attributes can't read CSS variables reliably, so the chart
// receives the palette as plain values, read from the theme tokens (tokens.css)
// and re-read whenever the appearance changes.

import { useMemo, useSyncExternalStore } from 'react';
import { getAppliedTheme, subscribeToAppliedTheme } from '../../lib/theme.js';

const TOKENS = {
  bar: '--chart-bar',
  barToday: '--color-accent',
  track: '--chart-track',
  grid: '--chart-grid',
  tick: '--chart-tick',
  cursor: '--chart-cursor',
};

export function useChartTheme() {
  const theme = useSyncExternalStore(subscribeToAppliedTheme, getAppliedTheme, () => 'light');
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(Object.entries(TOKENS).map(([name, token]) => [name, styles.getPropertyValue(token).trim()]));
    // `theme` is the dependency: the tokens it switches are what's read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
