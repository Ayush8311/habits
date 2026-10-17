// Pure calculations over habit records. Nothing here touches React or storage.
// `completions` has the shape { [habitId]: { 'YYYY-MM-DD': true } }.

import { addDays, getDateRange, getWeekStart } from './dates.js';

const ratio = (done, total) => (total > 0 ? done / total : null);

export const isCompleted = (completions, habitId, key) => completions[habitId]?.[key] === true;

/** Keys that can carry a check-in: today and earlier. */
export const eligibleKeys = (keys, todayKey) => keys.filter((key) => key <= todayKey);

export function countCompletedOn(habits, completions, key) {
  return habits.reduce((count, habit) => count + (isCompleted(completions, habit.id, key) ? 1 : 0), 0);
}

/**
 * The first day a habit counts towards rates: the day it was created, or an
 * earlier day the user back-filled. A habit added mid-month therefore isn't
 * scored as having missed the days before it existed. Null means "always".
 */
export function getTrackingStart(habit, completions) {
  let start = habit.createdAt ?? null;
  for (const key of Object.keys(completions[habit.id] ?? {})) {
    if (start === null || key < start) start = key;
  }
  return start;
}

const isTrackedOn = (start, key) => start === null || key >= start;

/** How many habits were being tracked on a given day. */
export function countTrackedOn(habits, completions, key) {
  return habits.reduce((count, habit) => count + (isTrackedOn(getTrackingStart(habit, completions), key) ? 1 : 0), 0);
}

export function getHabitProgress(habit, completions, keys) {
  const start = getTrackingStart(habit, completions);
  const tracked = keys.filter((key) => isTrackedOn(start, key));
  const done = tracked.filter((key) => isCompleted(completions, habit.id, key)).length;
  return { done, total: tracked.length, rate: ratio(done, tracked.length) };
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

/** One entry per day with how many of the habits tracked that day were completed. */
export function getDailySeries(habits, completions, days) {
  return days.map((day) => {
    const done = countCompletedOn(habits, completions, day.key);
    const total = countTrackedOn(habits, completions, day.key);
    return { ...day, done, total, rate: ratio(done, total) };
  });
}

/**
 * Consecutive completed days ending today. An unchecked today does not break
 * the streak yet — it still counts back from yesterday.
 */
export function getCurrentStreak(record = {}, todayKey) {
  let cursor = record[todayKey] ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (record[cursor]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getBestStreak(record = {}) {
  const keys = Object.keys(record).filter((key) => record[key]).sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const key of keys) {
    run = previous && addDays(previous, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}

export function getHabitStreaks(habitId, completions, todayKey) {
  const record = completions[habitId];
  return { current: getCurrentStreak(record, todayKey), best: getBestStreak(record) };
}

/** The habit with the longest current streak and the one with the best ever. */
export function getStreakLeaders(habits, completions, todayKey) {
  const leaders = { current: { habit: null, value: 0 }, best: { habit: null, value: 0 } };
  for (const habit of habits) {
    const { current, best } = getHabitStreaks(habit.id, completions, todayKey);
    if (current > leaders.current.value) leaders.current = { habit, value: current };
    if (best > leaders.best.value) leaders.best = { habit, value: best };
  }
  return leaders;
}

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

/** Days on which every habit was completed. */
export function countPerfectDays(habits, completions, keys) {
  return keys.filter((key) => {
    const tracked = countTrackedOn(habits, completions, key);
    return tracked > 0 && countCompletedOn(habits, completions, key) === tracked;
  }).length;
}

/** Completion rate for each of the `count` weeks ending with the current one, oldest first. */
export function getWeeklyRates(habits, completions, todayKey, count) {
  const currentStart = getWeekStart(todayKey);
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(currentStart, (index - count + 1) * 7);
    const end = index === count - 1 ? todayKey : addDays(start, 6);
    return { start, ...getOverallProgress(habits, completions, getDateRange(start, end)) };
  });
}
