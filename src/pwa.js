// Service worker registration, update notification and install state.
//
// Installation differs by platform, so nothing here assumes one method:
//  - Chromium browsers (Chrome, Edge, Samsung Internet…) fire `beforeinstallprompt`
//    when the app is installable; we keep that event and replay it from our button.
//  - Safari (iOS and macOS) and Firefox have no in-page install API; the UI shows
//    manual instructions instead (see src/lib/installPlatform.js).

import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

const HOUR = 60 * 60 * 1000;
const STANDALONE_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: window-controls-overlay)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
];

let installEvent = null;
let installedThisSession = false;
let offlineReady = false;
let needRefresh = false;
let updateServiceWorker = null;

/** True when Habit is running as an installed app rather than in a browser tab. */
export const isStandalone = () =>
  STANDALONE_QUERIES.some((query) => window.matchMedia(query).matches) || window.navigator.standalone === true;

const listeners = new Set();
let snapshot = createSnapshot();

function createSnapshot() {
  return {
    canPrompt: installEvent !== null,
    standalone: isStandalone(),
    installedThisSession,
    offlineReady,
    needRefresh,
  };
}
function emit() {
  snapshot = createSnapshot();
  listeners.forEach((listener) => listener());
}
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setupPWA() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's own mini-infobar from appearing; the user installs from our button.
    event.preventDefault();
    installEvent = event;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    installedThisSession = true;
    emit();
  });
  for (const query of STANDALONE_QUERIES) window.matchMedia(query).addEventListener('change', emit);

  if (!('serviceWorker' in navigator)) return;
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onOfflineReady() {
      offlineReady = true;
      emit();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.active) {
        offlineReady = true;
        emit();
      }
      // Look for a new deployment hourly and whenever the app returns to the foreground.
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {});
      };
      window.setInterval(check, HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}

/**
 * Shows the browser's native install dialog if one is available.
 * Resolves to 'accepted', 'dismissed' or 'unavailable'. A saved prompt can be
 * used only once; Chromium fires a fresh event later if installing is still possible.
 */
export async function promptInstall() {
  const event = installEvent;
  if (!event) return 'unavailable';
  installEvent = null;
  emit();
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'unavailable';
  }
}

/** Activates the waiting service worker and reloads into the new version. */
export function applyUpdate() {
  updateServiceWorker?.(true);
}
export function dismissUpdate() {
  needRefresh = false;
  emit();
}

export const usePWAState = () => useSyncExternalStore(subscribe, () => snapshot);
