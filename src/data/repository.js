// The single place the app reads and writes habit data.
//
// The UI only talks to a repository through this small interface:
//
//   load()               -> state | null          the saved state, or null if none
//   save(state)          -> boolean               false if the write was refused
//   subscribe(listener)  -> unsubscribe()         listener(state) when data changes elsewhere
//
// Today the implementation is LocalStorage, so data stays on the device it was
// recorded on. In the Android app each save is also mirrored to native storage
// (see nativeMirror.js). To add cloud sync later, write another object with the same
// three methods (for example one that saves locally first and pushes to an API
// in the background, calling `listener` when remote changes arrive) and pass
// it to useHabitStore. No component needs to change.

import { STORAGE_KEY, parseState, serializeState } from '../lib/storage.js';
import { isNativeApp } from '../lib/platform.js';
import { mirrorSave } from './nativeMirror.js';

/** `afterSave(raw)` runs after each successful write, with the serialized state. */
export function createLocalRepository(key = STORAGE_KEY, { afterSave } = {}) {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const state = parseState(raw);
        // Unreadable data is set aside rather than silently overwritten.
        if (!state) window.localStorage.setItem(`${key}.unreadable-${Date.now()}`, raw);
        return state;
      } catch {
        return null;
      }
    },

    save(state) {
      try {
        const raw = serializeState(state);
        window.localStorage.setItem(key, raw);
        afterSave?.(raw);
        return true;
      } catch {
        return false;
      }
    },

    // Other tabs or windows of the app on the same device.
    subscribe(listener) {
      const onStorage = (event) => {
        if (event.key !== key || !event.newValue) return;
        const next = parseState(event.newValue);
        if (next) listener(next);
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}

export const habitRepository = createLocalRepository(STORAGE_KEY, isNativeApp ? { afterSave: mirrorSave } : {});
