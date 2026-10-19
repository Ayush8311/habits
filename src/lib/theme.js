// Applies the Light / Dark / System appearance to the page.
//
// The preference itself lives in the app state (see preferences.js), which is
// what persists, syncs to the Android mirror and goes into backups. A copy is
// kept under THEME_CACHE_KEY only so the inline script in index.html can set the
// theme before the first paint, without a white flash when Dark is chosen.

import { SystemBars, SystemBarsStyle, registerPlugin } from '@capacitor/core';
import { isNativeApp } from './platform.js';

export const THEME_CACHE_KEY = 'habit.theme';
// The page background of each theme (tokens.css --color-bg), for the native window.
const WINDOW_COLORS = { light: '#F6F5F1', dark: '#161816' };
// Local Android plugin (android/…/WindowThemePlugin.java).
const WindowTheme = isNativeApp ? registerPlugin('WindowTheme') : null;
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const systemPrefersDark = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;

/** 'light' | 'dark' | 'system' → 'light' | 'dark'. */
export const resolveTheme = (preference, prefersDark = systemPrefersDark()) =>
  preference === 'dark' || (preference === 'system' && prefersDark) ? 'dark' : 'light';

const listeners = new Set();

/** Sets data-theme and color-scheme on <html>, and the Android status bar icons. */
export function applyTheme(preference) {
  const theme = resolveTheme(preference);
  const root = document.documentElement;
  const changed = root.dataset.theme !== theme;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem(THEME_CACHE_KEY, preference);
  } catch {
    // Only the startup cache is lost; the preference itself is in the app state.
  }
  if (isNativeApp) {
    // LIGHT = dark icons for a light background, DARK = light icons for a dark one.
    // setStyle resets the window background, so the theme colour is applied after it.
    SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
      .catch(() => {})
      .then(() => WindowTheme.setBackgroundColor({ color: WINDOW_COLORS[theme] }))
      .catch(() => {});
  }
  if (changed) listeners.forEach((listener) => listener());
  return theme;
}

/** Calls `onChange` when the OS switches between light and dark. */
export function watchSystemTheme(onChange) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const list = window.matchMedia(DARK_QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

/** For useSyncExternalStore: the theme currently on the page. */
export const subscribeToAppliedTheme = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getAppliedTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
