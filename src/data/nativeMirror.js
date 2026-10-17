// Durable copy of the habit data for the Android app.
//
// The WebView writes LocalStorage to disk lazily (after about a second), so if
// Android ends the app right after a check-in — for example when it is swiped away
// from Recents — the last change could be lost. In the app, every save is therefore
// also written to Android's SharedPreferences (via @capacitor/preferences), which
// reaches disk immediately and is flushed before the app is stopped. Both copies
// carry the same timestamp; on launch the newer one wins.

import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEY, parseState } from '../lib/storage.js';

const STAMP_KEY = `${STORAGE_KEY}.savedAt`;

/** Called after each LocalStorage save, with the serialized state just written. */
export function mirrorSave(raw) {
  const savedAt = Date.now();
  try {
    window.localStorage.setItem(STAMP_KEY, String(savedAt));
  } catch {
    // LocalStorage refused the write; the native copy below still keeps the data.
  }
  Preferences.set({ key: STORAGE_KEY, value: JSON.stringify({ savedAt, raw }) }).catch(() => {});
}

/** Before the app renders: if the native copy is newer than LocalStorage, restore it. */
export async function restoreNewerNativeCopy() {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return false;
    const { savedAt, raw } = JSON.parse(value);
    const localSavedAt = Number(window.localStorage.getItem(STAMP_KEY)) || 0;
    if (!(savedAt > localSavedAt) || !parseState(raw)) return false;
    window.localStorage.setItem(STORAGE_KEY, raw);
    window.localStorage.setItem(STAMP_KEY, String(savedAt));
    return true;
  } catch {
    return false; // Fall back to whatever LocalStorage holds.
  }
}
