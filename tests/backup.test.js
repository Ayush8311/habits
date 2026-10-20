import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appReducer } from '../src/data/appReducer.js';
import { applyBackup, parseBackup } from '../src/lib/backup.js';
import { getTheme, sanitizePreferences } from '../src/lib/preferences.js';
import { parseState, serializeState } from '../src/lib/storage.js';

const current = {
  habits: [{ id: 'now', name: 'Current habit', icon: 'book', emoji: null, color: 'sage', createdAt: '2026-10-01', schedule: null }],
  completions: { now: { '2026-10-19': true } },
  tasks: [{ id: 't', name: 'Keep me', notes: '', dueDate: null, dueTime: null, priority: null, completedAt: null, createdAt: 1 }],
  preferences: { theme: 'dark' },
};

// Exactly what v1.0.x exported: no tasks, no preferences, no schedules.
const legacyBackup = JSON.stringify({
  version: 1,
  habits: [{ id: 'old', name: 'Old habit', icon: 'moon', emoji: '🌙', color: '#123456', createdAt: '2026-08-01' }],
  completions: { old: { '2026-08-01': true, '2026-08-02': true } },
});

test('a v1.0 backup without tasks, preferences or schedules still imports', () => {
  const backup = parseBackup(legacyBackup);
  assert.ok(backup);
  assert.equal(backup.hasTasks, false);
  assert.equal(backup.hasPreferences, false);
  const habit = backup.state.habits[0];
  assert.equal(habit.schedule, null); // every day, as before
  assert.equal(habit.emoji, '🌙');
  assert.equal(habit.color, '#123456');
  assert.deepEqual(backup.state.completions, { old: { '2026-08-01': true, '2026-08-02': true } });

  // Restoring it replaces habits and check-ins, but keeps this device's tasks and theme.
  const restored = applyBackup(current, backup);
  assert.deepEqual(restored.habits.map((h) => h.id), ['old']);
  assert.deepEqual(restored.tasks, current.tasks);
  assert.deepEqual(restored.preferences, { theme: 'dark' });
});

test('a new backup round-trips tasks, schedules, check-ins, colours and preferences', () => {
  const state = {
    ...current,
    habits: [{ ...current.habits[0], schedule: [1, 3, 5], color: '#abcdef' }],
    tasks: [
      ...current.tasks,
      { id: 'p', name: 'With everything', notes: 'note', dueDate: '2026-11-01', dueTime: '18:30', priority: 'high', completedAt: 99, createdAt: 2, listId: 'L' },
    ],
    taskLists: [{ id: 'L', name: 'Errands', createdAt: 3 }],
  };
  const backup = parseBackup(serializeState(state));
  assert.equal(backup.hasTasks, true);
  assert.equal(backup.hasPreferences, true);
  const restored = applyBackup({ ...current, tasks: [], taskLists: [], preferences: {} }, backup);
  assert.deepEqual(restored, state);
  assert.equal(restored.tasks[1].listId, 'L'); // still in its list
  assert.equal(restored.tasks[0].priority, null); // still none after export + import
});

test('a backup with an empty task list replaces tasks; invalid files are refused', () => {
  const empty = parseBackup(serializeState({ ...current, tasks: [] }));
  assert.deepEqual(applyBackup(current, empty).tasks, []);
  assert.equal(parseBackup('not json'), null);
  assert.equal(parseBackup('{"habits":"nope"}'), null);
  assert.equal(parseBackup(JSON.stringify({ version: 99, habits: [] })), null); // from a newer app
});

test('restoring through the store keeps the rules above', () => {
  const next = appReducer(current, { type: 'restore', backup: parseBackup(legacyBackup) });
  assert.deepEqual(next.tasks, current.tasks);
  assert.equal(next.habits[0].id, 'old');
});

test('saved data from v1.0 loads unchanged, with empty tasks and default preferences', () => {
  const saved = parseState(legacyBackup);
  assert.deepEqual(saved.tasks, []);
  assert.deepEqual(saved.preferences, {});
  assert.equal(getTheme(saved.preferences), 'light');
  assert.deepEqual(saved.completions, { old: { '2026-08-01': true, '2026-08-02': true } });
});

test('theme preference: light by default, only known values kept', () => {
  assert.equal(getTheme({}), 'light');
  assert.equal(getTheme(undefined), 'light');
  assert.deepEqual(sanitizePreferences({ theme: 'system' }), { theme: 'system' });
  assert.deepEqual(sanitizePreferences({ theme: 'neon' }), {});
  let state = appReducer(current, { type: 'setTheme', theme: 'system' });
  assert.equal(state.preferences.theme, 'system');
  state = appReducer(state, { type: 'setTheme', theme: 'bogus' });
  assert.equal(state.preferences.theme, 'system');
  assert.equal(getTheme(parseState(serializeState(state)).preferences), 'system');
  assert.deepEqual(state.habits, current.habits);
});

test('habit schedules persist through save and reload; every-day stays implicit', () => {
  const state = { ...current, habits: [{ ...current.habits[0], schedule: [0, 6] }, { ...current.habits[0], id: 'b', schedule: null }] };
  state.completions = { ...state.completions, b: {} };
  const reloaded = parseState(serializeState(state));
  assert.deepEqual(reloaded.habits.map((h) => h.schedule), [[0, 6], null]);
});

test('page layout: Separate by default, persisted, and kept when an old backup is restored', async () => {
  const { getPageLayout } = await import('../src/lib/preferences.js');
  assert.equal(getPageLayout({}), 'separate');
  assert.equal(getPageLayout(undefined), 'separate');
  assert.deepEqual(sanitizePreferences({ pageLayout: 'combined', theme: 'dark' }), { theme: 'dark', pageLayout: 'combined' });
  assert.deepEqual(sanitizePreferences({ pageLayout: 'tabs' }), {});
  let state = appReducer(current, { type: 'setPageLayout', layout: 'combined' });
  state = appReducer(state, { type: 'setPageLayout', layout: 'bogus' });
  assert.equal(getPageLayout(state.preferences), 'combined');
  assert.equal(state.preferences.theme, 'dark'); // other preferences untouched
  assert.deepEqual([state.habits, state.completions, state.tasks], [current.habits, current.completions, current.tasks]);
  assert.equal(getPageLayout(parseState(serializeState(state)).preferences), 'combined');
  // A v1.0 backup has no preferences: the device's layout stays as chosen.
  const restored = applyBackup(state, parseBackup(legacyBackup));
  assert.equal(getPageLayout(restored.preferences), 'combined');
});

test('combined order and opening page: Tasks by default, saved choices kept, invalid ignored', async () => {
  const { getCombinedOrder, getOpeningPage, launchTab } = await import('../src/lib/preferences.js');
  // Fresh setup and existing installs without the preference: Tasks.
  assert.equal(getCombinedOrder({}), 'tasks-first');
  assert.equal(getOpeningPage({}), 'tasks');
  assert.equal(getOpeningPage({ theme: 'dark', pageLayout: 'separate' }), 'tasks');
  // Saved valid values are kept; invalid ones fall back.
  assert.deepEqual(sanitizePreferences({ combinedOrder: 'habits-first', openingPage: 'today' }), { combinedOrder: 'habits-first', openingPage: 'today' });
  assert.deepEqual(sanitizePreferences({ combinedOrder: 'sideways', openingPage: 'calendar' }), {});
  let state = appReducer(current, { type: 'setOpeningPage', page: 'today' });
  state = appReducer(state, { type: 'setCombinedOrder', order: 'habits-first' });
  state = appReducer(state, { type: 'setOpeningPage', page: 'nowhere' });
  assert.deepEqual(state.preferences, { theme: 'dark', openingPage: 'today', combinedOrder: 'habits-first' });
  const saved = parseState(serializeState(state)).preferences;
  assert.equal(getOpeningPage(saved), 'today');
  assert.equal(getCombinedOrder(saved), 'habits-first');
  // An old backup without these keeps the device's choices.
  assert.deepEqual(applyBackup(state, parseBackup(legacyBackup)).preferences, state.preferences);
  assert.deepEqual([state.habits, state.completions, state.tasks], [current.habits, current.completions, current.tasks]);

  // Launch page.
  const separateTabs = ['tasks', 'today', 'calendar', 'insights', 'settings'];
  const combinedTabs = ['today', 'calendar', 'insights', 'settings'];
  assert.equal(launchTab({}, '', separateTabs), 'tasks'); // fresh setup
  assert.equal(launchTab({ openingPage: 'today' }, '', separateTabs), 'today');
  assert.equal(launchTab({ openingPage: 'tasks' }, 'insights', separateTabs), 'insights'); // a link wins
  assert.equal(launchTab({ pageLayout: 'combined', openingPage: 'tasks' }, '', combinedTabs), 'today');
  assert.equal(launchTab({ pageLayout: 'combined' }, 'tasks', combinedTabs), 'today');
  assert.equal(launchTab({ openingPage: 'today' }, 'bogus', separateTabs), 'today');
});
