// Export and import of the full habit state as a JSON file. Until cloud sync
// exists, this is how data moves between a computer and a phone.

import { getTodayKey } from './dates.js';
import { isNativeApp } from './platform.js';
import { parseState, serializeState } from './storage.js';

/** Saves a backup through the share sheet on phones, or as a download elsewhere. */
export async function exportBackup(state) {
  const fileName = `habit-backup-${getTodayKey()}.json`;
  if (isNativeApp) return exportNative(fileName, serializeState(state));
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

// Android's WebView can neither download files nor use the Web Share API, so the
// app writes the backup to its cache and opens Android's share sheet (Save to
// Files, Drive, email…). Loaded only in the app, so the website doesn't carry it.
async function exportNative(fileName, json) {
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const { uri } = await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title: 'Habit backup', files: [uri], dialogTitle: 'Save your Habit backup' });
    return 'shared';
  } catch (error) {
    if (/cancel/i.test(String(error?.message ?? error))) return 'cancelled';
    throw error;
  }
}

/** Resolves to validated state, or null if the file isn't a Habit backup. */
export async function readBackup(file) {
  if (!file || file.size > 5 * 1024 * 1024) return null;
  return parseState(await file.text());
}

export const countCheckIns = (state) =>
  Object.values(state.completions).reduce((sum, record) => sum + Object.keys(record).length, 0);
