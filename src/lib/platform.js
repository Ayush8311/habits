import { Capacitor } from '@capacitor/core';

/**
 * True inside the Android app built with Capacitor. Its web assets are bundled in
 * the APK, so there is no service worker, install prompt or web update to manage.
 */
export const isNativeApp = Capacitor.isNativePlatform();

/**
 * iPhone and iPad (including iPadOS, which reports itself as a Mac). There the
 * on-screen keyboard overlays the page and only the visual viewport shrinks;
 * on Android the WebView itself is resized, so the layout viewport is the truth.
 */
export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** Height of the area the page can use right now (above the keyboard). */
export const visibleHeight = () =>
  isIOS && window.visualViewport ? window.visualViewport.height : window.innerHeight;
