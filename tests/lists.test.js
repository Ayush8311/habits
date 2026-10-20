import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appReducer } from '../src/data/appReducer.js';
import { applyBackup, parseBackup } from '../src/lib/backup.js';
import {
  getAddBarOrder,
  getPageOrder,
  launchTab,
  sanitizePreferences,
  tabOrder,
} from '../src/lib/preferences.js';
import { getCalendarDay, getDailySeries, getHabitProgress } from '../src/lib/stats.js';
import { parseState, serializeState } from '../src/lib/storage.js';
import { movedPastSlop, resolveRowSwipe, rowCommitDistance, rowOffset } from '../src/lib/swipe.js';
import { generalTasks, sanitizeTaskLists, tasksInList, todaysTasks, validateListName } from '../src/lib/tasks.js';

const task = (id, fields = {}) => ({
  id,
  name: id,
  notes: '',
  dueDate: null,
  dueTime: null,
  priority: null,
  completedAt: null,
  createdAt: 1,
  ...fields,
});
const base = () => ({
  habits: [{ id: 'h', name: 'Read', icon: 'book', emoji: null, color: 'ocean', createdAt: '2026-10-15', schedule: null }],
  completions: { h: { '2026-10-19': true } },
  tasks: [task('a'), task('b', { priority: 'high', dueDate: '2026-10-20', dueTime: '09:00' })],
  taskLists: [],
  preferences: { theme: 'dark' },
});

test('lists: create, rename and delete; deleting a list keeps its tasks (in no list)', () => {
  let state = appReducer(base(), { type: 'addTaskList', list: { id: 'L', name: '  Errands ', createdAt: 5 } });
  assert.deepEqual(state.taskLists, [{ id: 'L', name: 'Errands', createdAt: 5 }]);
  assert.equal(appReducer(state, { type: 'addTaskList', list: { id: 'X', name: '   ', createdAt: 6 } }), state);
  state = appReducer(state, { type: 'updateTask', id: 'b', fields: { listId: 'L' } });
  assert.equal(state.tasks[1].listId, 'L');
  // Moving keeps every other property.
  assert.deepEqual({ ...state.tasks[1], listId: undefined }, { ...base().tasks[1], listId: undefined });
  state = appReducer(state, { type: 'renameTaskList', id: 'L', name: 'Shops' });
  assert.equal(state.taskLists[0].name, 'Shops');
  state = appReducer(state, { type: 'deleteTaskList', id: 'L' });
  assert.deepEqual(state.taskLists, []);
  assert.equal(state.tasks.length, 2);
  assert.equal('listId' in state.tasks[1], false);
  assert.equal(state.tasks[1].priority, 'high');
});

test('a task can only be put in a list that exists; editing other fields keeps its list', () => {
  let state = appReducer(base(), { type: 'addTaskList', list: { id: 'L', name: 'Work', createdAt: 1 } });
  state = appReducer(state, { type: 'addTask', task: task('c', { listId: 'nope' }) });
  assert.equal('listId' in state.tasks[2], false);
  state = appReducer(state, { type: 'addTask', task: task('d', { listId: 'L' }) });
  assert.equal(state.tasks[3].listId, 'L');
  state = appReducer(state, { type: 'updateTask', id: 'd', fields: { name: 'Renamed', priority: 'low' } });
  assert.equal(state.tasks[3].listId, 'L');
  state = appReducer(state, { type: 'updateTask', id: 'd', fields: { listId: null } });
  assert.equal('listId' in state.tasks[3], false);
});

test("postponing changes only the due day; Today's tasks follow it", () => {
  let state = base();
  const before = state.tasks[1];
  assert.deepEqual(todaysTasks(state.tasks, '2026-10-20').map((t) => t.id), ['b']);
  state = appReducer(state, { type: 'updateTask', id: 'b', fields: { dueDate: '2026-10-21' } });
  assert.deepEqual({ ...state.tasks[1], dueDate: before.dueDate }, before);
  assert.equal(state.tasks[1].dueTime, '09:00');
  assert.deepEqual(todaysTasks(state.tasks, '2026-10-20'), []);
  assert.deepEqual(todaysTasks(state.tasks, '2026-10-21').map((t) => t.id), ['b']);
  // Only today's date counts: earlier, later and undated tasks stay in their lists.
  const tasks = [task('late', { dueDate: '2026-10-18' }), task('undated'), task('doneToday', { dueDate: '2026-10-20', completedAt: 9 })];
  assert.deepEqual(todaysTasks(tasks, '2026-10-20').map((t) => t.id), ['doneToday']);
});

test("Today gathers today's tasks from every list; General Tasks are the rest of the unlisted ones", () => {
  const T = '2026-10-20';
  // The example: 2 today in College, 1 in Errands, 3 in Personal, 1 tomorrow in College, 1 undated in Personal.
  const tasks = [
    task('c1', { listId: 'C', dueDate: T }),
    task('c2', { listId: 'C', dueDate: T, priority: 'high', dueTime: '09:00' }),
    task('e1', { listId: 'E', dueDate: T }),
    task('p1', { listId: 'P', dueDate: T }),
    task('p2', { listId: 'P', dueDate: T }),
    task('p3', { listId: 'P', dueDate: T }),
    task('c3', { listId: 'C', dueDate: '2026-10-21' }),
    task('p4', { listId: 'P' }),
    task('g1'),
    task('g2', { dueDate: T }),
    task('g3', { dueDate: '2026-10-19' }),
  ];
  const today = todaysTasks(tasks, T);
  assert.deepEqual(today.filter((t) => t.listId).map((t) => t.id), ['c1', 'c2', 'e1', 'p1', 'p2', 'p3']);
  assert.deepEqual(today.map((t) => t.id), ['c1', 'c2', 'e1', 'p1', 'p2', 'p3', 'g2']);
  // The very same records (not copies), still in their lists.
  assert.equal(today[1], tasks[1]);
  assert.equal(today[1].listId, 'C');
  assert.deepEqual(generalTasks(tasks, T).map((t) => t.id), ['g1', 'g3']);
  // The next day, Today follows the calendar.
  assert.deepEqual(todaysTasks(tasks, '2026-10-21').map((t) => t.id), ['c3']);
  assert.deepEqual(generalTasks(tasks, '2026-10-21').map((t) => t.id), ['g1', 'g2', 'g3']);
});

test('lists persist and stay compatible: older data has none, unknown lists are dropped', () => {
  const state = { ...base(), taskLists: [{ id: 'L', name: 'Errands', createdAt: 2 }], tasks: [task('a', { listId: 'L' }), task('b', { listId: 'gone' })] };
  const reloaded = parseState(serializeState(state));
  assert.equal(reloaded.tasks[0].listId, 'L');
  assert.equal('listId' in reloaded.tasks[1], false);
  assert.deepEqual(reloaded.taskLists, state.taskLists);
  const old = parseState(JSON.stringify({ version: 1, habits: [], completions: {}, tasks: [task('x')] }));
  assert.deepEqual(old.taskLists, []);
  assert.deepEqual(tasksInList(old.tasks, null).map((t) => t.id), ['x']);
  assert.deepEqual(sanitizeTaskLists([{ id: 'a', name: 'A' }, { id: 'a', name: 'dup' }, { id: 'b', name: ' ' }, null]), [{ id: 'a', name: 'A', createdAt: 0 }]);
});

test('restoring a backup from before lists keeps this device’s lists; a newer one brings its own', () => {
  const current = { ...base(), taskLists: [{ id: 'L', name: 'Mine', createdAt: 1 }], tasks: [task('a', { listId: 'L' })] };
  const old = parseBackup(JSON.stringify({ version: 1, habits: [], completions: {}, tasks: [task('z')] }));
  const restored = applyBackup(current, old);
  assert.deepEqual(restored.taskLists, current.taskLists);
  assert.deepEqual(restored.tasks.map((t) => t.id), ['z']);
  const newer = parseBackup(serializeState({ ...current, taskLists: [{ id: 'M', name: 'Theirs', createdAt: 3 }], tasks: [task('q', { listId: 'M' })] }));
  const restored2 = applyBackup(current, newer);
  assert.deepEqual(restored2.taskLists.map((l) => l.id), ['M']);
  assert.equal(restored2.tasks[0].listId, 'M');
});

test('list names: required, trimmed, unique (ignoring case)', () => {
  assert.equal(validateListName('  '), 'Give your list a name.');
  assert.equal(validateListName('Work', new Set(['work'])), 'You already have a list with this name.');
  assert.equal(validateListName('x'.repeat(41)), 'Keep it under 40 characters.');
  assert.equal(validateListName(' Home '), null);
});

test('Add new order and page order: defaults keep the current behaviour; both persist independently', () => {
  assert.equal(getAddBarOrder({}), 'habits-first');
  assert.equal(getPageOrder({}), 'tasks-first');
  assert.deepEqual(sanitizePreferences({ addBarOrder: 'tasks-first', pageOrder: 'habits-first', junk: 1 }), { addBarOrder: 'tasks-first', pageOrder: 'habits-first' });
  assert.deepEqual(sanitizePreferences({ addBarOrder: 'sideways', pageOrder: 7 }), {});
  let state = appReducer(base(), { type: 'setPageOrder', order: 'habits-first' });
  state = appReducer(state, { type: 'setAddBarOrder', order: 'tasks-first' });
  assert.equal(appReducer(state, { type: 'setPageOrder', order: 'nope' }), state);
  const reloaded = parseState(serializeState(state));
  assert.equal(reloaded.preferences.pageOrder, 'habits-first');
  assert.equal(reloaded.preferences.addBarOrder, 'tasks-first');
  assert.equal(reloaded.preferences.theme, 'dark');
  assert.deepEqual(reloaded.tasks, state.tasks);
});

test('tab order follows the page order; ids (and so links and the opening page) never change', () => {
  assert.deepEqual(tabOrder({}), ['tasks', 'today', 'calendar', 'insights', 'settings']);
  assert.deepEqual(tabOrder({ pageOrder: 'habits-first' }), ['today', 'tasks', 'calendar', 'insights', 'settings']);
  assert.deepEqual(tabOrder({ pageLayout: 'combined', pageOrder: 'habits-first' }), ['today', 'calendar', 'insights', 'settings']);
  const prefs = { pageOrder: 'habits-first', openingPage: 'tasks' };
  assert.equal(launchTab(prefs, '', tabOrder(prefs)), 'tasks');
  assert.equal(launchTab(prefs, 'calendar', tabOrder(prefs)), 'calendar');
});

test('setting one habit-day sets exactly that record', () => {
  let state = base();
  state = appReducer(state, { type: 'setCompletion', habitId: 'h', dateKey: '2025-01-03', done: true });
  assert.deepEqual(state.completions.h, { '2026-10-19': true, '2025-01-03': true });
  assert.equal(appReducer(state, { type: 'setCompletion', habitId: 'h', dateKey: '2025-01-03', done: true }), state);
  state = appReducer(state, { type: 'setCompletion', habitId: 'h', dateKey: '2026-10-19', done: false });
  assert.deepEqual(state.completions.h, { '2025-01-03': true });
  assert.equal(appReducer(state, { type: 'setCompletion', habitId: 'missing', dateKey: '2026-10-19', done: true }), state);
});

test('calendar shade for a back-filled day uses all scheduled habits: 1 of 2, not 1 of 1', () => {
  const habits = [
    { id: 'new', createdAt: '2026-10-15', schedule: null },
    { id: 'old', createdAt: '2026-01-01', schedule: null },
    { id: 'mon', createdAt: '2026-01-01', schedule: [1] },
  ];
  const completions = { new: { '2026-10-02': true }, old: {}, mon: { '2026-10-03': true } }; // Oct 2 2026 is a Friday
  assert.deepEqual(getCalendarDay(habits, completions, '2026-10-02'), { done: 1, total: 2, rate: 0.5 });
  // Unchecked, the same day is 0 of 2 (the lightest shade), whatever the creation dates.
  assert.deepEqual(getCalendarDay(habits, { new: {}, old: {}, mon: {} }, '2026-10-02'), { done: 0, total: 2, rate: 0 });
  // An extra check-in on a day a habit isn't scheduled shows too (Saturday).
  assert.deepEqual(getCalendarDay(habits, completions, '2026-10-03'), { done: 1, total: 3, rate: 1 / 3 });
  // Rates and the daily series still count expected days only (no inflation).
  assert.deepEqual(getHabitProgress(habits[0], completions, ['2026-10-02', '2026-10-15']), { done: 0, total: 1, rate: 0 });
  assert.equal(getDailySeries(habits, completions, [{ key: '2026-10-02' }])[0].total, 1);
});

test('regression: back-filling a past day climbs the shade scale one habit at a time', () => {
  // The reported case: 7 habits added today (a new install); a day weeks earlier.
  const today = '2026-10-20';
  const habits = Array.from({ length: 7 }, (_, n) => ({ id: `h${n}`, name: `Habit ${n}`, createdAt: today, schedule: null }));
  let state = { habits, completions: Object.fromEntries(habits.map((h) => [h.id, {}])), tasks: [], taskLists: [], preferences: {} };
  const past = '2026-09-30';
  const rates = [getCalendarDay(state.habits, state.completions, past).rate];
  for (const habit of habits) {
    state = appReducer(state, { type: 'toggle', habitId: habit.id, dateKey: past });
    rates.push(getCalendarDay(state.habits, state.completions, past).rate);
  }
  assert.deepEqual(rates.map((r) => Math.round(r * 7)), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(rates[1] < 0.2, 'one check-in is a light shade, not the darkest');
  // Each day is independent; today and other days are untouched.
  assert.deepEqual(getCalendarDay(state.habits, state.completions, today), { done: 0, total: 7, rate: 0 });
  assert.equal(getCalendarDay(state.habits, state.completions, '2026-09-29').done, 0);
  assert.equal(getCalendarDay(state.habits, state.completions, '2026-10-01').done, 0);
  // Month and year boundaries map to the exact local day.
  for (const key of ['2026-08-31', '2026-09-01', '2025-12-31', '2026-01-01', '2024-02-29']) {
    const next = appReducer(state, { type: 'toggle', habitId: 'h0', dateKey: key });
    assert.equal(getCalendarDay(next.habits, next.completions, key).done, 1, key);
    assert.deepEqual(Object.keys(next.completions.h0).filter((k) => k !== past), [key]);
  }
  // Saved and reloaded, the shades are the same.
  const reloaded = parseState(serializeState(state));
  assert.equal(getCalendarDay(reloaded.habits, reloaded.completions, past).rate, 1);
});

test('row swipes: thresholds scale with width, small or disallowed moves never act', () => {
  assert.equal(rowCommitDistance(100), 72);
  assert.equal(rowCommitDistance(360), 108);
  assert.equal(rowCommitDistance(1200), 140);
  assert.equal(resolveRowSwipe(107, 360), null);
  assert.equal(resolveRowSwipe(108, 360), 'right');
  assert.equal(resolveRowSwipe(-120, 360), 'left');
  assert.equal(resolveRowSwipe(-200, 360, { left: false }), null);
  assert.equal(resolveRowSwipe(200, 360, { right: false }), null);
  // A side without an action barely moves; past the commit point it resists.
  assert.equal(rowOffset(-200, 360, { left: false }), -24);
  assert.equal(rowOffset(50, 360), 50);
  assert.ok(rowOffset(208, 360) < 208 && rowOffset(208, 360) > 108);
  assert.equal(movedPastSlop(5, 5), false);
  assert.equal(movedPastSlop(6, 7), true);
});
