import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appReducer } from '../src/data/appReducer.js';
import { parseState, serializeState } from '../src/lib/storage.js';
import {
  formatDue,
  formatDueDate,
  formatTime,
  from12Hour,
  isOverdue,
  normaliseTaskFields,
  sanitizeTasks,
  splitTasks,
  to12Hour,
  validateTaskName,
} from '../src/lib/tasks.js';

const habitState = () => ({
  habits: [{ id: 'h', name: 'Read', icon: 'book', emoji: null, color: 'ocean', createdAt: '2026-10-01', schedule: null }],
  completions: { h: { '2026-10-18': true, '2026-10-19': true } },
  tasks: [],
  preferences: { theme: 'dark' },
});

const newTask = (id, fields, createdAt = 1) => ({ id, ...normaliseTaskFields(fields), completedAt: null, createdAt });

test('task names are required and trimmed; whitespace-only names are rejected', () => {
  assert.equal(validateTaskName(''), 'Give your task a name.');
  assert.equal(validateTaskName('   \n '), 'Give your task a name.');
  assert.equal(validateTaskName('x'.repeat(101)), 'Keep it under 100 characters.');
  assert.equal(validateTaskName('  Call the bank '), null);
  assert.equal(normaliseTaskFields({ name: '  Call the bank ' }).name, 'Call the bank');
});

test('optional fields stay empty: no implicit priority, no time without a date', () => {
  const bare = normaliseTaskFields({ name: 'Buy milk' });
  assert.deepEqual(bare, { name: 'Buy milk', notes: '', dueDate: null, dueTime: null, priority: null });
  assert.equal(normaliseTaskFields({ name: 'x', dueTime: '09:30' }).dueTime, null);
  assert.equal(normaliseTaskFields({ name: 'x', dueDate: '2026-02-30', dueTime: '09:30' }).dueDate, null);
  assert.equal(normaliseTaskFields({ name: 'x', priority: 'urgent' }).priority, null);
  assert.deepEqual(normaliseTaskFields({ name: 'x', dueDate: '2028-02-29', dueTime: '23:59', priority: 'high' }), {
    name: 'x',
    notes: '',
    dueDate: '2028-02-29',
    dueTime: '23:59',
    priority: 'high',
  });
});

test('create, edit, complete, uncomplete and delete a task without touching habits', () => {
  let state = habitState();
  const before = JSON.stringify({ habits: state.habits, completions: state.completions, preferences: state.preferences });
  const task = newTask('t1', { name: 'Renew passport', notes: 'Photos first', dueDate: '2026-10-25' });

  state = appReducer(state, { type: 'addTask', task });
  assert.equal(state.tasks.length, 1);
  // A repeated submit of the same form (same id) never adds a duplicate.
  state = appReducer(state, { type: 'addTask', task });
  assert.equal(state.tasks.length, 1);

  state = appReducer(state, { type: 'updateTask', id: 't1', fields: { name: 'Renew passport ', dueTime: '14:00' } });
  assert.equal(state.tasks[0].name, 'Renew passport');
  assert.equal(state.tasks[0].notes, 'Photos first'); // kept
  assert.equal(state.tasks[0].dueTime, '14:00');
  assert.equal(state.tasks[0].priority, null); // still none

  state = appReducer(state, { type: 'setTaskCompleted', id: 't1', completed: true, at: 500 });
  assert.equal(state.tasks[0].completedAt, 500);
  state = appReducer(state, { type: 'setTaskCompleted', id: 't1', completed: false, at: 600 });
  assert.equal(state.tasks[0].completedAt, null);

  state = appReducer(state, { type: 'deleteTask', id: 't1' });
  assert.deepEqual(state.tasks, []);
  assert.equal(JSON.stringify({ habits: state.habits, completions: state.completions, preferences: state.preferences }), before);
});

test('priority can be chosen, changed and removed explicitly, and is otherwise left alone', () => {
  let state = { ...habitState(), tasks: [newTask('t', { name: 'Pay rent', priority: 'medium' })] };
  state = appReducer(state, { type: 'updateTask', id: 't', fields: { notes: 'by Friday' } });
  assert.equal(state.tasks[0].priority, 'medium');
  state = appReducer(state, { type: 'updateTask', id: 't', fields: { priority: 'high' } });
  assert.equal(state.tasks[0].priority, 'high');
  state = appReducer(state, { type: 'updateTask', id: 't', fields: { priority: null } });
  assert.equal(state.tasks[0].priority, null);
});

test('habit changes, resets and deleting all habits never remove tasks or the theme', () => {
  const task = newTask('t', { name: 'Call mum' });
  let state = { ...habitState(), tasks: [task] };
  state = appReducer(state, { type: 'add', habit: { id: 'h2', name: 'Run', icon: 'walk', emoji: null, color: 'sage', createdAt: '2026-10-19', schedule: [1, 3] } });
  state = appReducer(state, { type: 'toggle', habitId: 'h2', dateKey: '2026-10-19' });
  state = appReducer(state, { type: 'delete', id: 'h' });
  state = appReducer(state, { type: 'clear' });
  state = appReducer(state, { type: 'replaceHabits', habits: [], completions: {} });
  assert.deepEqual(state.tasks, [task]);
  assert.deepEqual(state.preferences, { theme: 'dark' });
});

test('tasks survive a save and reload, with priority and times exactly as stored', () => {
  const state = {
    ...habitState(),
    tasks: [
      newTask('a', { name: 'No extras' }),
      newTask('b', { name: 'All extras', notes: 'n', dueDate: '2026-12-31', dueTime: '00:05', priority: 'low' }),
    ],
  };
  const reloaded = parseState(serializeState(state));
  assert.deepEqual(reloaded.tasks, state.tasks);
  assert.equal(reloaded.tasks[0].priority, null);
});

test('stored tasks are validated: bad entries dropped, duplicates removed, fields repaired', () => {
  const tasks = sanitizeTasks([
    { id: 'a', name: 'Fine', priority: 'high', dueDate: '2026-10-20', dueTime: '7:00', completedAt: 'yes' },
    { id: 'a', name: 'Duplicate id' },
    { id: 'b', name: '   ' },
    { id: 'c' },
    null,
    { id: 'd', name: 'Time without date', dueTime: '08:00' },
  ]);
  assert.deepEqual(tasks.map((task) => task.id), ['a', 'd']);
  assert.equal(tasks[0].dueTime, null); // '7:00' isn't HH:MM
  assert.equal(tasks[0].completedAt, null);
  assert.equal(tasks[1].dueTime, null);
  assert.deepEqual(sanitizeTasks(undefined), []);
});

test("tasks keep the user's order: never sorted by date, priority or completion", () => {
  const tasks = [
    { ...newTask('undated', { name: 'u' }, 1) },
    { ...newTask('late', { name: 'l', dueDate: '2026-10-21', priority: 'high' }, 2) },
    { ...newTask('doneOld', { name: 'o' }, 5), completedAt: 10 },
    { ...newTask('morning', { name: 'm', dueDate: '2026-10-20', dueTime: '08:00' }, 3) },
    { ...newTask('doneNew', { name: 'n' }, 6), completedAt: 20 },
  ];
  const { pending, completed } = splitTasks(tasks);
  assert.deepEqual(pending.map((task) => task.id), ['undated', 'late', 'morning']);
  assert.deepEqual(completed.map((task) => task.id), ['doneOld', 'doneNew']);
});

test('12-hour time conversion round-trips every minute of the day', () => {
  assert.deepEqual(to12Hour('00:00'), { hour: 12, minute: 0, period: 'AM' });
  assert.deepEqual(to12Hour('12:30'), { hour: 12, minute: 30, period: 'PM' });
  assert.deepEqual(to12Hour('23:59'), { hour: 11, minute: 59, period: 'PM' });
  for (let minutes = 0; minutes < 24 * 60; minutes += 1) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    assert.equal(from12Hour(to12Hour(time)), time);
  }
  assert.equal(formatTime('15:05'), '3:05 PM');
});

test('due dates read naturally and overdue is judged in local time', () => {
  const today = '2026-10-19'; // Monday
  assert.equal(formatDueDate('2026-10-19', today), 'Today');
  assert.equal(formatDueDate('2026-10-20', today), 'Tomorrow');
  assert.equal(formatDueDate('2026-10-18', today), 'Yesterday');
  assert.equal(formatDueDate('2026-10-23', today), 'Fri, Oct 23');
  assert.equal(formatDueDate('2026-11-30', today), 'Nov 30');
  assert.equal(formatDueDate('2027-01-02', today), 'Jan 2, 2027');
  assert.equal(formatDue({ dueDate: today, dueTime: '09:00' }, today), 'Today · 9:00 AM');
  assert.equal(formatDue({ dueDate: null, dueTime: null }, today), null);

  const at = new Date(2026, 9, 19, 10, 0);
  const task = (dueDate, dueTime = null) => ({ dueDate, dueTime, completedAt: null });
  assert.equal(isOverdue(task('2026-10-18'), today, at), true);
  assert.equal(isOverdue(task(today), today, at), false); // due today, no time
  assert.equal(isOverdue(task(today, '09:59'), today, at), true);
  assert.equal(isOverdue(task(today, '10:01'), today, at), false);
  assert.equal(isOverdue({ ...task('2026-10-18'), completedAt: 1 }, today, at), false);
  assert.equal(isOverdue(task(null), today, at), false);
});
