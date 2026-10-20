// Pure calculations over habit records. Nothing here touches React or storage.
// `completions` has the shape { [habitId]: { 'YYYY-MM-DD': true } }.
//
// Every figure is built on one definition, `isApplicable`: a habit instance is
// expected on a day when the day is on or after the habit's start and is one of
// its scheduled weekdays. Rates, Perfect Days, Best Week, Best Day, the calendar
// and the summary all count "done" as applicable instances with a check-in, and
// "total" as applicable instances, so no screen can disagree with another.
//
// Fallbacks for data that predates these rules:
//   - A habit saved without a schedule is scheduled every day (as it always was).
//   - A habit's current schedule applies to its whole history; earlier schedules
//     aren't recorded, so they can't be reconstructed.
//   - A habit saved without a creation date starts at its first check-in.
// Check-ins outside applicable days (before a habit was created, or on a day it
// isn't scheduled) stay stored and visible, but don't count towards any rate.

import { addDays, getDateRange, getWeekStart } from './dates.js';
import { isScheduledOn } from './schedule.js';

const ratio = (done, total) => (total > 0 ? done / total : null);

export const isCompleted = (completions, habitId, key) => completions[habitId]?.[key] === true;

/** Keys that can carry a check-in: today and earlier. */
export const eligibleKeys = (keys, todayKey) => keys.filter((key) => key <= todayKey);

/** The first day a habit is expected: its creation date, else (legacy data) its first check-in. Null means "always". */
export function getTrackingStart(habit, completions) {
  if (habit.createdAt) return habit.createdAt;
  let start = null;
  for (const key of Object.keys(completions[habit.id] ?? {})) {
    if (start === null || key < start) start = key;
  }
  return start;
}

const startsBy = (start, key) => start === null || key >= start;

/** Whether `habit` is expected on `key`. */
export const isApplicable = (habit, completions, key) =>
  isScheduledOn(habit.schedule, key) && startsBy(getTrackingStart(habit, completions), key);

/** Habits expected on a day. */
export const getApplicableHabits = (habits, completions, key) =>
  habits.filter((habit) => isApplicable(habit, completions, key));

/** How many habits were expected on a day. */
export const countApplicableOn = (habits, completions, key) => getApplicableHabits(habits, completions, key).length;

/** How many of the habits expected on a day were completed. */
export const countCompletedOn = (habits, completions, key) =>
  getApplicableHabits(habits, completions, key).filter((habit) => isCompleted(completions, habit.id, key)).length;

export function getHabitProgress(habit, completions, keys) {
  const start = getTrackingStart(habit, completions);
  const applicable = keys.filter((key) => startsBy(start, key) && isScheduledOn(habit.schedule, key));
  const done = applicable.filter((key) => isCompleted(completions, habit.id, key)).length;
  return { done, total: applicable.length, rate: ratio(done, applicable.length) };
}

export function getOverallProgress(habits, completions, keys) {
  let done = 0;
  let total = 0;
  for (const habit of habits) {
    const progress = getHabitProgress(habit, completions, keys);
    done += progress.done;
    total += progress.total;
  }
  return { done, total, rate: ratio(done, total) };
}

/**
 * The calendar's figures for one day, which set its shade (done ÷ total, from the
 * lightest to the darkest green): every habit scheduled on that weekday counts,
 * whether or not it had been added by then, plus any habit checked off on a day
 * it isn't scheduled. So correcting a past day moves through the same scale as
 * today: with 7 habits, one check-in is 1 of 7, never 1 of 1.
 *
 * (A habit's creation date only limits statistics: rates, Perfect Days and Best
 * Day/Week count expected days only, so back-filling can't inflate them. Using it
 * here made a back-filled day count only the habits checked on it, so its first
 * check-in showed as 100%, the darkest shade.)
 */
export function getCalendarDay(habits, completions, key) {
  let done = 0;
  let total = 0;
  for (const habit of habits) {
    const checked = isCompleted(completions, habit.id, key);
    if (!checked && !isScheduledOn(habit.schedule, key)) continue;
    total += 1;
    if (checked) done += 1;
  }
  return { done, total, rate: ratio(done, total) };
}

/** One entry per day: how many of the habits expected that day were completed. */
export function getDailySeries(habits, completions, days) {
  return days.map((day) => {
    const applicable = getApplicableHabits(habits, completions, day.key);
    const done = applicable.filter((habit) => isCompleted(completions, habit.id, day.key)).length;
    return { ...day, done, total: applicable.length, rate: ratio(done, applicable.length) };
  });
}

// ── Streaks ─────────────────────────────────────────────────────────────────
// A streak is the run of consecutive scheduled days with a check-in. Days a
// habit isn't scheduled are skipped: they neither break nor extend it. The
// current streak counts back from today; an unchecked today doesn't break it
// yet (it still counts back from the previous scheduled day). For a habit
// scheduled every day this is exactly the original definition. Streaks follow
// check-ins, so back-filled days before a habit was added still count.

const firstCheckIn = (record) => {
  let first = null;
  for (const key of Object.keys(record)) if (record[key] && (first === null || key < first)) first = key;
  return first;
};

export function getCurrentStreak(record = {}, todayKey, schedule = null) {
  const first = firstCheckIn(record);
  if (first === null) return 0;
  let streak = 0;
  for (let key = todayKey; key >= first; key = addDays(key, -1)) {
    if (!isScheduledOn(schedule, key)) continue;
    if (record[key]) streak += 1;
    else if (key !== todayKey) break;
  }
  return streak;
}

export function getBestStreak(record = {}, schedule = null) {
  const keys = Object.keys(record).filter((key) => record[key]).sort();
  if (keys.length === 0) return 0;
  let best = 0;
  let run = 0;
  for (const key of getDateRange(keys[0], keys[keys.length - 1])) {
    if (!isScheduledOn(schedule, key)) continue;
    run = record[key] ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function getHabitStreaks(habit, completions, todayKey) {
  const record = completions[habit.id];
  return { current: getCurrentStreak(record, todayKey, habit.schedule), best: getBestStreak(record, habit.schedule) };
}

/** The habit with the longest current streak and the one with the best ever. */
export function getStreakLeaders(habits, completions, todayKey) {
  const leaders = { current: { habit: null, value: 0 }, best: { habit: null, value: 0 } };
  for (const habit of habits) {
    const { current, best } = getHabitStreaks(habit, completions, todayKey);
    if (current > leaders.current.value) leaders.current = { habit, value: current };
    if (best > leaders.best.value) leaders.best = { habit, value: best };
  }
  return leaders;
}

// ── Weeks and days ──────────────────────────────────────────────────────────

/**
 * This week (Monday to today) against the whole previous week. The delta is
 * only reported when the previous week actually has check-ins to compare with.
 */
export function getWeekComparison(habits, completions, todayKey) {
  const thisStart = getWeekStart(todayKey);
  const thisKeys = getDateRange(thisStart, todayKey);
  const previousKeys = getDateRange(addDays(thisStart, -7), addDays(thisStart, -1));
  const thisWeek = getOverallProgress(habits, completions, thisKeys);
  const previousWeek = getOverallProgress(habits, completions, previousKeys);
  const hasPrevious = previousWeek.done > 0;
  const delta = hasPrevious && thisWeek.rate !== null ? thisWeek.rate - previousWeek.rate : null;
  return { thisKeys, thisWeek, previousWeek, hasPrevious, delta };
}

export const toPercent = (rate) => (rate === null ? null : Math.round(rate * 100));

/**
 * Perfect Days: days on which at least one habit was expected and every expected
 * habit was completed. Days after `todayKey` (when given) and repeated keys are
 * ignored, so a day can never be counted twice.
 */
export function countPerfectDays(habits, completions, keys, todayKey = null) {
  let count = 0;
  for (const key of new Set(keys)) {
    if (todayKey && key > todayKey) continue;
    const applicable = getApplicableHabits(habits, completions, key);
    if (applicable.length > 0 && applicable.every((habit) => isCompleted(completions, habit.id, key))) count += 1;
  }
  return count;
}

/** Completion rate for each of the `count` Monday–Sunday weeks ending with the current one, oldest first. */
export function getWeeklyRates(habits, completions, todayKey, count) {
  const currentStart = getWeekStart(todayKey);
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(currentStart, (index - count + 1) * 7);
    const end = index === count - 1 ? todayKey : addDays(start, 6);
    return { start, ...getOverallProgress(habits, completions, getDateRange(start, end)) };
  });
}

/**
 * Best Week: of the last `count` Monday–Sunday weeks (the current one up to today),
 * the one with the highest completion rate — completed expected instances divided
 * by expected instances. Weeks with nothing expected or nothing completed are
 * skipped; on a tie the earlier week is kept. Null when no week qualifies.
 */
export function getBestWeek(habits, completions, todayKey, count = 8) {
  return getWeeklyRates(habits, completions, todayKey, count)
    .filter((week) => week.total > 0 && week.done > 0)
    .reduce((best, week) => (!best || week.rate > best.rate ? week : best), null);
}

/** Of the last `count` days, the one with the most expected habits completed (earliest on a tie). */
export function getBestDay(habits, completions, todayKey, count = 30) {
  let best = { key: null, done: 0, total: 0 };
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const key = addDays(todayKey, -offset);
    const applicable = getApplicableHabits(habits, completions, key);
    const done = applicable.filter((habit) => isCompleted(completions, habit.id, key)).length;
    if (done > best.done) best = { key, done, total: applicable.length };
  }
  return best;
}
