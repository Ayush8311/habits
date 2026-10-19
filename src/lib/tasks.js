// One-off tasks, stored next to habits but never part of any habit statistic.
//
// A task is { id, name, notes, dueDate, dueTime, priority, completedAt, createdAt }:
//   dueDate      local "YYYY-MM-DD" or null. A calendar day, never a timestamp, so it
//                can't shift when the time zone changes.
//   dueTime      local "HH:MM" (24-hour) or null; only kept when there is a dueDate.
//   priority     'low' | 'medium' | 'high' | null. null means none was chosen and is
//                never shown as, or replaced by, a default.
//   completedAt  epoch milliseconds when completed, or null while pending.
//   createdAt    epoch milliseconds, for a stable order.

import { addDays, formatMonthDay, isDateKey, parseDateKey } from './dates.js';

export const MAX_TASK_NAME_LENGTH = 100;
export const MAX_TASK_NOTES_LENGTH = 1000;

export const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];
const PRIORITY_IDS = new Set(PRIORITIES.map((priority) => priority.id));
export const isPriority = (value) => PRIORITY_IDS.has(value);
export const priorityLabel = (value) => PRIORITIES.find((priority) => priority.id === value)?.label ?? null;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (value) => typeof value === 'string' && TIME_PATTERN.test(value);

const isTimestamp = (value) => Number.isFinite(value) && value > 0;

function sanitizeTask(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.name !== 'string') return null;
  const name = raw.name.trim().slice(0, MAX_TASK_NAME_LENGTH);
  if (!name) return null;
  const dueDate = isDateKey(raw.dueDate) ? raw.dueDate : null;
  return {
    id: raw.id,
    name,
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, MAX_TASK_NOTES_LENGTH) : '',
    dueDate,
    dueTime: dueDate && isTime(raw.dueTime) ? raw.dueTime : null,
    priority: isPriority(raw.priority) ? raw.priority : null,
    completedAt: isTimestamp(raw.completedAt) ? raw.completedAt : null,
    createdAt: isTimestamp(raw.createdAt) ? raw.createdAt : 0,
  };
}

/** Valid tasks only, duplicates by id dropped. Missing or invalid input → []. */
export function sanitizeTasks(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const tasks = [];
  for (const raw of input) {
    const task = sanitizeTask(raw);
    if (task && !seen.has(task.id)) {
      seen.add(task.id);
      tasks.push(task);
    }
  }
  return tasks;
}

export function validateTaskName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return 'Give your task a name.';
  if (trimmed.length > MAX_TASK_NAME_LENGTH) return `Keep it under ${MAX_TASK_NAME_LENGTH} characters.`;
  return null;
}

/** The editable fields, cleaned: a time without a date is dropped, unknown priority → none. */
export function normaliseTaskFields({ name, notes, dueDate, dueTime, priority }) {
  const date = isDateKey(dueDate) ? dueDate : null;
  return {
    name: String(name ?? '').trim().slice(0, MAX_TASK_NAME_LENGTH),
    notes: String(notes ?? '').trim().slice(0, MAX_TASK_NOTES_LENGTH),
    dueDate: date,
    dueTime: date && isTime(dueTime) ? dueTime : null,
    priority: isPriority(priority) ? priority : null,
  };
}

// ── Ordering ────────────────────────────────────────────────────────────────

/**
 * Pending and completed tasks, each in the user's own order (the order of the
 * stored array, set by adding tasks and by reordering in Edit mode). Nothing is
 * sorted automatically by date, priority, name or completion.
 */
export function splitTasks(tasks) {
  return {
    pending: tasks.filter((task) => task.completedAt === null),
    completed: tasks.filter((task) => task.completedAt !== null),
  };
}

// ── Time ────────────────────────────────────────────────────────────────────

/** "15:05" → { hour: 3, minute: 5, period: 'PM' } */
export function to12Hour(time) {
  const [hours, minute] = time.split(':').map(Number);
  return { hour: hours % 12 === 0 ? 12 : hours % 12, minute, period: hours < 12 ? 'AM' : 'PM' };
}

/** { hour: 12, minute: 0, period: 'AM' } → "00:00" */
export function from12Hour({ hour, minute, period }) {
  const hours = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatTime(time) {
  const { hour, minute, period } = to12Hour(time);
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}

// ── Due dates ───────────────────────────────────────────────────────────────

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fullFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** "Today", "Tomorrow", "Yesterday", "Wed, Oct 21", "Jan 4, 2027". */
export function formatDueDate(dateKey, todayKey) {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === addDays(todayKey, 1)) return 'Tomorrow';
  if (dateKey === addDays(todayKey, -1)) return 'Yesterday';
  if (dateKey.slice(0, 4) !== todayKey.slice(0, 4)) return fullFormat.format(parseDateKey(dateKey));
  const inWeek = dateKey > todayKey && dateKey <= addDays(todayKey, 6);
  return inWeek ? weekdayFormat.format(parseDateKey(dateKey)) : formatMonthDay(dateKey);
}

/** "Today · 3:30 PM", or null for an undated task. */
export function formatDue(task, todayKey) {
  if (!task.dueDate) return null;
  const date = formatDueDate(task.dueDate, todayKey);
  return task.dueTime ? `${date} · ${formatTime(task.dueTime)}` : date;
}

/** Past its due day, or past its due time today. `now` is a Date (local time). */
export function isOverdue(task, todayKey, now = new Date()) {
  if (task.completedAt !== null || !task.dueDate) return false;
  if (task.dueDate !== todayKey) return task.dueDate < todayKey;
  if (!task.dueTime) return false;
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return task.dueTime < current;
}
