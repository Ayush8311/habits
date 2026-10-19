// Turns stored records into short, factual observations for the summary card.

import { formatWeekday, getRecentDays } from './dates.js';
import {
  countCompletedOn,
  getApplicableHabits,
  getHabitStreaks,
  getHabitProgress,
  getOverallProgress,
  getStreakLeaders,
  toPercent,
} from './stats.js';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function describeToday(habits, completions, todayKey) {
  const total = getApplicableHabits(habits, completions, todayKey).length;
  const done = countCompletedOn(habits, completions, todayKey);
  if (total === 0) return 'No habits are scheduled today.';
  if (done === total) {
    return total === 1 ? 'You completed your habit today.' : `You completed all ${total} habits today.`;
  }
  if (done === 0) return `Nothing checked off yet today — ${plural(total, 'habit')} to go.`;
  return `You completed ${done} of ${total} habits today.`;
}

function describeStrongestDay(habits, completions, week, todayKey) {
  if (week.thisKeys.length < 2) return null;
  const counts = week.thisKeys.map((key) => ({ key, done: countCompletedOn(habits, completions, key) }));
  const top = counts.reduce((best, day) => (day.done > best.done ? day : best));
  if (top.done === 0 || counts.every((day) => day.done === top.done)) return null;
  if (top.key === todayKey) return 'Today is your strongest day this week so far.';
  return `Your strongest day this week was ${formatWeekday(top.key, 'long')}.`;
}

function describeTrend(week) {
  if (week.delta === null) return null;
  const points = Math.round(week.delta * 100);
  if (points >= 3) return { text: `This week is up ${points} points on last week.`, direction: 'up' };
  if (points <= -3) return { text: `This week is ${-points} points behind last week.`, direction: 'down' };
  return { text: 'You’re holding steady with last week.', direction: 'flat' };
}

function describeFocus(habits, completions, monthKeys) {
  if (habits.length < 2 || monthKeys.length < 3) return null;
  const ranked = habits
    .map((habit) => ({ habit, rate: getHabitProgress(habit, completions, monthKeys).rate }))
    .sort((a, b) => a.rate - b.rate);
  const lowest = ranked[0];
  if (lowest.rate >= 0.6 || lowest.rate === ranked[ranked.length - 1].rate) return null;
  return `${lowest.habit.name} has the most room to grow this month, at ${toPercent(lowest.rate)}%.`;
}

function describeHeadline(rate) {
  if (rate === null || rate === 0) return 'A fresh page.';
  if (rate >= 0.8) return 'You’re remarkably consistent.';
  if (rate >= 0.6) return 'You’re building consistency.';
  if (rate >= 0.35) return 'Momentum is forming.';
  return 'Small steps still count.';
}

/**
 * @param {object} input
 * @param {Array} input.habits
 * @param {object} input.completions
 * @param {string} input.todayKey
 * @param {object} input.week      Result of getWeekComparison
 * @param {string[]} input.monthKeys  Eligible keys of the current month
 */
export function buildInsights({ habits, completions, todayKey, week, monthKeys }) {
  if (habits.length === 0) {
    return { headline: 'Add a habit to begin.', detail: 'Insights appear once you start checking in.', items: [] };
  }

  const recentKeys = getRecentDays(todayKey, 14).map((day) => day.key);
  const recent = getOverallProgress(habits, completions, recentKeys);
  const items = [{ id: 'today', kind: 'today', text: describeToday(habits, completions, todayKey) }];

  const strongest = describeStrongestDay(habits, completions, week, todayKey);
  if (strongest) items.push({ id: 'strongest', kind: 'strongest', text: strongest });

  const trend = describeTrend(week);
  if (trend) items.push({ id: 'trend', kind: `trend-${trend.direction}`, text: trend.text });

  const { current } = getStreakLeaders(habits, completions, todayKey);
  if (current.value >= 3) {
    items.push({ id: 'streak', kind: 'streak', text: `${current.habit.name} is on a ${current.value}-day streak.` });
  }

  const focus = describeFocus(habits, completions, monthKeys);
  if (focus) items.push({ id: 'focus', kind: 'focus', text: focus });

  return {
    headline: describeHeadline(recent.rate),
    detail:
      recent.done === 0
        ? 'No check-ins in the last 14 days yet.'
        : `${toPercent(recent.rate)}% of possible check-ins over the last 14 days.`,
    items,
  };
}

/**
 * One short, factual line for the Today screen, chosen by what matters most
 * right now: a finished day, a streak worth protecting, or how the week is going.
 */
export function buildTodayInsight({ habits, completions, todayKey, week }) {
  if (habits.length === 0) return 'Add a habit to start tracking your day.';

  const due = getApplicableHabits(habits, completions, todayKey);
  if (due.length === 0) return 'Nothing scheduled today. Enjoy the rest day.';
  const done = countCompletedOn(habits, completions, todayKey);
  if (done === due.length) {
    return due.length === 1 ? 'Done for today. Nicely kept.' : `All ${due.length} habits done. A complete day.`;
  }

  const atRisk = due
    .filter((habit) => !completions[habit.id]?.[todayKey])
    .map((habit) => ({ habit, streak: getHabitStreaks(habit, completions, todayKey).current }))
    .sort((a, b) => b.streak - a.streak)[0];
  if (atRisk && atRisk.streak >= 3) {
    return `${atRisk.habit.name} is on a ${atRisk.streak}-day streak. Keep it going today.`;
  }

  const trend = describeTrend(week);
  if (trend && trend.direction !== 'flat') return trend.text;

  const remaining = due.length - done;
  return done === 0
    ? `${plural(due.length, 'habit')} lined up for today.`
    : `${done} done, ${remaining} to go.`;
}
