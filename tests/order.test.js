import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appReducer } from '../src/data/appReducer.js';
import { applyBackup, parseBackup } from '../src/lib/backup.js';
import { moveItem, reorderSubset } from '../src/lib/order.js';
import { parseState, serializeState } from '../src/lib/storage.js';
import { getOverallProgress, getHabitStreaks } from '../src/lib/stats.js';

const habit = (id) => ({ id, name: id.toUpperCase(), icon: 'book', emoji: null, color: 'sage', createdAt: '2026-10-01', schedule: null });
const task = (id, completedAt = null) => ({ id, name: id, notes: '', dueDate: null, dueTime: null, priority: null, completedAt, createdAt: 1 });
const base = () => ({
  habits: ['a', 'b', 'c'].map(habit),
  completions: { a: { '2026-10-18': true }, b: {}, c: { '2026-10-19': true } },
  tasks: [task('t1'), task('t2', 5), task('t3'), task('t4')],
  preferences: { theme: 'dark' },
});
const ids = (list) => list.map((item) => item.id);

test('moveItem moves one item and copes with edges', () => {
  assert.deepEqual(moveItem([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem([1, 2, 3, 4], 3, 0), [4, 1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 1, 1), [1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 1, 99), [1, 3, 2]);
});

test('reorderSubset ignores unknown and duplicate ids and never drops items', () => {
  const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  assert.deepEqual(ids(reorderSubset(items, ['d', 'c', 'b', 'a'])), ['d', 'c', 'b', 'a']);
  assert.deepEqual(ids(reorderSubset(items, ['c', 'ghost', 'a', 'c'])), ['c', 'b', 'a', 'd']);
  assert.deepEqual(ids(reorderSubset(items, [])), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(reorderSubset(items, 'nonsense')), ['a', 'b', 'c', 'd']);
});

test('habits and tasks reorder independently; nothing else changes', () => {
  const before = base();
  let state = appReducer(before, { type: 'reorderHabits', ids: ['c', 'a', 'b'] });
  assert.deepEqual(ids(state.habits), ['c', 'a', 'b']);
  assert.deepEqual(ids(state.tasks), ['t1', 't2', 't3', 't4']);
  // Reordering pending tasks leaves the completed task (t2) in its slot.
  state = appReducer(state, { type: 'reorderTasks', ids: ['t4', 't1', 't3'] });
  assert.deepEqual(ids(state.tasks), ['t4', 't2', 't1', 't3']);
  assert.deepEqual(ids(state.habits), ['c', 'a', 'b']);
  // A habit id passed as a task order (or the reverse) is ignored.
  assert.deepEqual(ids(appReducer(state, { type: 'reorderTasks', ids: ['a', 'b'] }).tasks), ids(state.tasks));
  assert.deepEqual(ids(appReducer(state, { type: 'reorderHabits', ids: ['t1'] }).habits), ids(state.habits));
  assert.deepEqual(state.completions, before.completions);
  assert.deepEqual(state.preferences, before.preferences);
  // Order never affects metrics.
  const keys = ['2026-10-18', '2026-10-19'];
  assert.deepEqual(getOverallProgress(state.habits, state.completions, keys), getOverallProgress(before.habits, before.completions, keys));
  assert.deepEqual(getHabitStreaks(state.habits[0], state.completions, '2026-10-19'), getHabitStreaks(before.habits[2], before.completions, '2026-10-19'));
});

test('order survives save/reload and backup export/import', () => {
  let state = appReducer(base(), { type: 'reorderHabits', ids: ['b', 'c', 'a'] });
  state = appReducer(state, { type: 'reorderTasks', ids: ['t3', 't1'] });
  const reloaded = parseState(serializeState(state));
  assert.deepEqual(ids(reloaded.habits), ['b', 'c', 'a']);
  assert.deepEqual(ids(reloaded.tasks), ids(state.tasks));
  const restored = applyBackup(base(), parseBackup(serializeState(state)));
  assert.deepEqual(ids(restored.habits), ['b', 'c', 'a']);
  assert.deepEqual(ids(restored.tasks), ids(state.tasks));
});

test('older backups without any order information import in their stored order', () => {
  const legacy = JSON.stringify({ version: 1, habits: [habit('z'), habit('y')], completions: { z: {}, y: {} } });
  const restored = applyBackup(base(), parseBackup(legacy));
  assert.deepEqual(ids(restored.habits), ['z', 'y']);
  assert.deepEqual(ids(restored.tasks), ['t1', 't2', 't3', 't4']); // device tasks kept
});

test('rapid repeated taps leave a consistent state', () => {
  let state = base();
  for (let i = 0; i < 7; i++) state = appReducer(state, { type: 'toggle', habitId: 'b', dateKey: '2026-10-19' });
  assert.deepEqual(state.completions.b, { '2026-10-19': true }); // odd number of taps: done
  state = appReducer(state, { type: 'toggle', habitId: 'b', dateKey: '2026-10-19' });
  assert.deepEqual(state.completions.b, {});
  assert.deepEqual(state.completions.a, base().completions.a);
});
