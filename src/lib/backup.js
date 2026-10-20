// Export and import of the full habit state as a JSON file. Until cloud sync
// exists, this is how data moves between a computer and a phone.

import { getTodayKey } from './dates.js';
import { isNativeApp } from './platform.js';
import { migrateState, serializeState } from './storage.js';
import { withValidList } from './tasks.js';

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

/**
 * A backup's validated state plus which optional parts it actually contains, or
 * null if the text isn't a Habit backup. Backups from before tasks or preferences
 * existed simply lack those fields.
 */
export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const state = migrateState(raw);
  if (!state) return null;
  return {
    state,
    hasTasks: Array.isArray(raw.tasks),
    hasTaskLists: Array.isArray(raw.taskLists),
    hasPreferences: Boolean(raw.preferences) && typeof raw.preferences === 'object',
  };
}

/** Resolves to a parsed backup (see parseBackup), or null if the file isn't a Habit backup. */
export async function readBackup(file) {
  if (!file || file.size > 5 * 1024 * 1024) return null;
  return parseBackup(await file.text());
}

/**
 * The state after restoring `backup` over `current`. Habits and check-ins come from
 * the backup, as they always have. Tasks and preferences come from it only when it
 * has them: restoring an older backup never deletes tasks or resets the theme.
 */
export function applyBackup(current, backup) {
  const { state, hasTasks, hasTaskLists, hasPreferences } = backup;
  const tasks = hasTasks ? state.tasks : (current.tasks ?? []);
  // Lists travel with the tasks. A backup from before lists keeps this device's lists
  // (its tasks are in none); tasks only stay in lists that exist after the restore.
  const taskLists = hasTaskLists ? state.taskLists : (current.taskLists ?? []);
  const listIds = new Set(taskLists.map((list) => list.id));
  return {
    habits: state.habits,
    completions: state.completions,
    tasks: tasks.map((task) => withValidList(task, listIds)),
    taskLists,
    preferences: hasPreferences ? { ...current.preferences, ...state.preferences } : (current.preferences ?? {}),
  };
}

export const countCheckIns = (state) =>
  Object.values(state.completions).reduce((sum, record) => sum + Object.keys(record).length, 0);
