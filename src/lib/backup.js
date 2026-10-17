// Export and import of the full habit state as a JSON file. Until cloud sync
// exists, this is how data moves between a computer and a phone.

import { getTodayKey } from './dates.js';
import { parseState, serializeState } from './storage.js';

/** Saves a backup through the share sheet on phones, or as a download elsewhere. */
export async function exportBackup(state) {
  const fileName = `habit-backup-${getTodayKey()}.json`;
  const blob = new Blob([serializeState(state)], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Habit backup' });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Fall through to a download if sharing is unavailable after all.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** Resolves to validated state, or null if the file isn't a Habit backup. */
export async function readBackup(file) {
  if (!file || file.size > 5 * 1024 * 1024) return null;
  return parseState(await file.text());
}

export const countCheckIns = (state) =>
  Object.values(state.completions).reduce((sum, record) => sum + Object.keys(record).length, 0);
