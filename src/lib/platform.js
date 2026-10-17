import { Capacitor } from '@capacitor/core';

/**
 * True inside the Android app built with Capacitor. Its web assets are bundled in
 * the APK, so there is no service worker, install prompt or web update to manage.
 */
export const isNativeApp = Capacitor.isNativePlatform();
