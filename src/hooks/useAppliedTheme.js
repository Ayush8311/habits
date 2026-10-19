import { useLayoutEffect } from 'react';
import { applyTheme, watchSystemTheme } from '../lib/theme.js';

/** Keeps the page's appearance in step with the preference, and with the OS while it is 'system'. */
export function useAppliedTheme(preference) {
  useLayoutEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return undefined;
    return watchSystemTheme(() => applyTheme(preference));
  }, [preference]);
}
