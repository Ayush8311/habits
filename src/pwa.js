// Service worker registration and install-prompt plumbing.

import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

const HOUR = 60 * 60 * 1000;
let installEvent = null;
let offlineReady = false;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

export function setupPWA() {
  // Chrome and Edge fire this when the app is installable; keep it for an in-app Install button.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    emit();
  });

  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
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
      // Look for a new deployment hourly and whenever the app comes back to the foreground.
      const check = () => registration.update().catch(() => {});
      window.setInterval(check, HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function usePWAStatus() {
  const canInstall = useSyncExternalStore(subscribe, () => installEvent !== null);
  const ready = useSyncExternalStore(subscribe, () => offlineReady);
  return {
    canInstall,
    offlineReady: ready,
    async install() {
      if (!installEvent) return false;
      installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      installEvent = null;
      emit();
      return outcome === 'accepted';
    },
  };
}
