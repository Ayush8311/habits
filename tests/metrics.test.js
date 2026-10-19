import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDateRange, getMonthDays } from '../src/lib/dates.js';
import { buildInsights, buildTodayInsight } from '../src/lib/insights.js';
import { describeFrequency, describeSchedule, isScheduledOn, normalizeSchedule } from '../src/lib/schedule.js';
import {
  countApplicableOn,
  countCompletedOn,
  countPerfectDays,
  eligibleKeys,
  getBestDay,
  getBestStreak,
  getBestWeek,
  getCurrentStreak,
  getDailySeries,
  getHabitProgress,
  getHabitStreaks,
  getOverallProgress,
  getWeekComparison,
  getWeeklyRates,
  isApplicable,
} from '../src/lib/stats.js';

const record = (...keys) => Object.fromEntries(keys.map((key) => [key, true]));
const MON_WED_FRI = [1, 3, 5];
// 2026-10-12 is a Monday.

test('schedules: normalised, described and matched by weekday', () => {
  assert.equal(normalizeSchedule(undefined), null);
  assert.equal(normalizeSchedule([]), null);
  assert.equal(normalizeSchedule([0, 1, 2, 3, 4, 5, 6]), null);
  assert.deepEqual(normalizeSchedule([5, 1, 3, 3, 9, -1, 'x', 1.5]), [1, 3, 5]);
  assert.equal(describeSchedule(null), 'Every day');
  assert.equal(describeSchedule([1, 2, 3, 4, 5]), 'Weekdays');
  assert.equal(describeSchedule([0, 6]), 'Weekends');
  assert.equal(describeSchedule([0, 1, 3]), 'Mon, Wed, Sun');
  assert.equal(describeFrequency(null), '7 days per week');
  assert.equal(describeFrequency([1, 2, 3, 4, 5]), '5 days per week');
  assert.equal(describeFrequency([2]), '1 day per week');
  assert.equal(isScheduledOn(MON_WED_FRI, '2026-10-12'), true);
  assert.equal(isScheduledOn(MON_WED_FRI, '2026-10-13'), false);
  assert.equal(isScheduledOn(null, '2026-10-13'), true);
});

test('a habit is expected only on scheduled days from its creation date', () => {
  const habit = { id: 'a', createdAt: '2026-10-14', schedule: MON_WED_FRI };
  assert.equal(isApplicable(habit, {}, '2026-10-12'), false); // Monday, before creation
  assert.equal(isApplicable(habit, {}, '2026-10-14'), true); // Wednesday
  assert.equal(isApplicable(habit, {}, '2026-10-15'), false); // Thursday
  const week = getDateRange('2026-10-12', '2026-10-18');
  // Wed and Fri are expected; a Thursday check-in is kept but isn't an instance.
  const completions = { a: record('2026-10-14', '2026-10-15') };
  assert.deepEqual(getHabitProgress(habit, completions, week), { done: 1, total: 2, rate: 0.5 });
});

test('Perfect Days: every expected habit done, nothing else', () => {
  const read = { id: 'read', createdAt: '2026-10-01', schedule: null };
  const gym = { id: 'gym', createdAt: '2026-10-01', schedule: MON_WED_FRI };
  const habits = [read, gym];
  const today = '2026-10-16'; // Friday
  const completions = {
    read: record('2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'),
    gym: record('2026-10-12', '2026-10-15'), // Thursday is unscheduled for gym
  };
  const keys = getDateRange('2026-10-12', today);
  // Mon: both done → perfect. Tue: only Read expected, done → perfect.
  // Wed: Gym missed → not. Thu: only Read expected, done → perfect. Fri: nothing done.
  assert.equal(countPerfectDays(habits, completions, keys, today), 3);
  // One habit checked while another expected one isn't is never perfect.
  assert.equal(countPerfectDays(habits, { read: record('2026-10-14') }, ['2026-10-14'], today), 0);
});

test('Perfect Days: no expected habits, future dates, creation dates and duplicates', () => {
  const weekdays = { id: 'w', createdAt: '2026-10-01', schedule: [1, 2, 3, 4, 5] };
  const completions = { w: record('2026-10-17', '2026-10-18', '2026-10-19', '2026-10-21') };
  // Weekend check-ins on a weekday-only habit: nothing was expected, so not perfect.
  assert.equal(countPerfectDays([weekdays], completions, ['2026-10-17', '2026-10-18']), 0);
  // A completed future day doesn't count, and a repeated key counts once.
  assert.equal(countPerfectDays([weekdays], completions, ['2026-10-19', '2026-10-19', '2026-10-21'], '2026-10-20'), 1);
  // Before a habit existed it isn't expected, even with a back-filled check-in.
  const late = { id: 'late', createdAt: '2026-10-20', schedule: null };
  const other = { id: 'other', createdAt: '2026-10-01', schedule: null };
  const backfill = { late: record('2026-10-19'), other: {} };
  assert.equal(countPerfectDays([late, other], backfill, ['2026-10-19'], '2026-10-20'), 0);
  // The reported bug: one back-filled habit on a day the others didn't exist yet.
  const solo = { late: record('2026-10-19') };
  assert.equal(countPerfectDays([late], solo, ['2026-10-19'], '2026-10-20'), 0);
  assert.equal(countApplicableOn([late], solo, '2026-10-19'), 0);
  // Duplicate check-ins can't exist in a record, and are counted once either way.
  const dup = { other: { '2026-10-19': true } };
  assert.equal(countCompletedOn([other], dup, '2026-10-19'), 1);
});

test('Perfect Days across month and year boundaries and leap days', () => {
  const habit = { id: 'a', createdAt: '2023-12-01', schedule: null };
  const completions = { a: record('2023-12-31', '2024-01-01', '2024-02-28', '2024-02-29', '2024-03-01') };
  assert.equal(countPerfectDays([habit], completions, getDateRange('2023-12-30', '2024-01-02')), 2);
  const february = getMonthDays(2024, 1).map((day) => day.key);
  assert.equal(february.length, 29);
  assert.equal(countPerfectDays([habit], completions, february), 2);
  const march = eligibleKeys(getMonthDays(2024, 2).map((day) => day.key), '2024-03-01');
  assert.equal(countPerfectDays([habit], completions, march), 1);
});

test('streaks follow scheduled days and skip unscheduled ones', () => {
  // Mon/Wed/Fri habit checked on Mon 12, Wed 14, Fri 16 and Mon 19.
  const r = record('2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19');
  assert.equal(getCurrentStreak(r, '2026-10-19', MON_WED_FRI), 4);
  // Tuesday isn't scheduled: still 4. Wednesday unchecked today: not broken yet.
  assert.equal(getCurrentStreak(r, '2026-10-20', MON_WED_FRI), 4);
  assert.equal(getCurrentStreak(r, '2026-10-21', MON_WED_FRI), 4);
  // Thursday: Wednesday was missed, so the streak is over.
  assert.equal(getCurrentStreak(r, '2026-10-22', MON_WED_FRI), 0);
  assert.equal(getBestStreak(r, MON_WED_FRI), 4);
  // The same check-ins on an every-day habit are only runs of one.
  assert.equal(getBestStreak(r, null), 1);
  // A check-in on an unscheduled day neither breaks nor extends a run.
  const extra = record('2026-10-12', '2026-10-13', '2026-10-14');
  assert.equal(getBestStreak(extra, MON_WED_FRI), 2);
  assert.equal(getCurrentStreak(extra, '2026-10-14', MON_WED_FRI), 2);
});

test('every-day streaks keep the original definition', () => {
  const r = record('2026-10-14', '2026-10-15', '2026-10-16');
  assert.equal(getCurrentStreak(r, '2026-10-16'), 3);
  assert.equal(getCurrentStreak(r, '2026-10-17'), 3);
  assert.equal(getCurrentStreak(r, '2026-10-18'), 0);
  const habit = { id: 'a', schedule: null };
  assert.deepEqual(getHabitStreaks(habit, { a: r }, '2026-10-17'), { current: 3, best: 3 });
  assert.equal(getBestStreak(record('2026-12-30', '2026-12-31', '2027-01-01')), 3);
});

test('Best Week: completion rate of expected instances, Monday to Sunday', () => {
  const a = { id: 'a', createdAt: '2026-09-01', schedule: null };
  const b = { id: 'b', createdAt: '2026-09-01', schedule: null };
  const today = '2026-10-21'; // Wednesday
  const completions = {
    // Week of Oct 5: a every day, b never → 7/14 = 50%.
    a: record(...getDateRange('2026-10-05', '2026-10-11'), '2026-10-12'),
    // Week of Oct 12: a once, b every day → 8/14 ≈ 57%.
    b: record(...getDateRange('2026-10-12', '2026-10-18')),
  };
  const best = getBestWeek([a, b], completions, today, 8);
  assert.equal(best.start, '2026-10-12');
  assert.equal(best.done, 8);
  assert.equal(best.total, 14);
  // The current week only counts up to today (Mon–Wed = 6 instances).
  const weeks = getWeeklyRates([a, b], completions, today, 8);
  assert.equal(weeks.at(-1).start, '2026-10-19');
  assert.equal(weeks.at(-1).total, 6);
  // A day with one of two habits checked is half a day, not a full one.
  const single = getBestWeek([a, b], { a: record('2026-10-19') }, today, 8);
  assert.equal(single.done, 1);
  assert.equal(single.total, 6);
  // No completions anywhere → no Best Week.
  assert.equal(getBestWeek([a, b], {}, today, 8), null);
});

test('Best Week respects schedules, creation dates and year boundaries', () => {
  const weekly = { id: 'w', createdAt: '2026-12-28', schedule: [1] }; // Mondays only
  const today = '2027-01-06';
  const completions = { w: record('2026-12-28', '2027-01-04') };
  const weeks = getWeeklyRates([weekly], completions, today, 3);
  assert.deepEqual(weeks.map((week) => [week.start, week.done, week.total]), [
    ['2026-12-21', 0, 0], // before the habit existed: nothing expected
    ['2026-12-28', 1, 1], // spans the new year
    ['2027-01-04', 1, 1],
  ]);
  assert.equal(getBestWeek([weekly], completions, today, 3).start, '2026-12-28');
});

test('Best Day and the daily series count only expected habits', () => {
  const a = { id: 'a', createdAt: '2026-10-10', schedule: null };
  const b = { id: 'b', createdAt: '2026-10-15', schedule: null };
  const completions = { a: record('2026-10-12'), b: record('2026-10-12', '2026-10-16') };
  // Oct 12: b didn't exist yet, so only a's check-in counts.
  const series = getDailySeries([a, b], completions, [{ key: '2026-10-12' }, { key: '2026-10-16' }]);
  assert.deepEqual(series.map((day) => [day.done, day.total]), [[1, 1], [1, 2]]);
  const best = getBestDay([a, b], completions, '2026-10-19', 30);
  assert.deepEqual(best, { key: '2026-10-12', done: 1, total: 1 });
  assert.deepEqual(getBestDay([a, b], {}, '2026-10-19', 30), { key: null, done: 0, total: 0 });
});

test('summary and Today text use expected habits and agree with the figures', () => {
  const daily = { id: 'd', name: 'Read', createdAt: '2026-10-01', schedule: null };
  const weekend = { id: 'e', name: 'Hike', createdAt: '2026-10-01', schedule: [0, 6] };
  const today = '2026-10-19'; // Monday: only Read is expected
  const completions = { d: record(today), e: record('2026-10-18') };
  const week = getWeekComparison([daily, weekend], completions, today);
  const insights = buildInsights({ habits: [daily, weekend], completions, todayKey: today, week, monthKeys: [today] });
  assert.equal(insights.items[0].text, 'You completed your habit today.');
  assert.equal(buildTodayInsight({ habits: [daily, weekend], completions, todayKey: today, week }), 'Done for today. Nicely kept.');
  // A day with nothing scheduled says so instead of claiming progress.
  const onlyWeekend = buildTodayInsight({ habits: [weekend], completions, todayKey: today, week });
  assert.equal(onlyWeekend, 'Nothing scheduled today. Enjoy the rest day.');
  const rest = buildInsights({ habits: [weekend], completions, todayKey: today, week, monthKeys: [today] });
  assert.equal(rest.items[0].text, 'No habits are scheduled today.');
  // Overall progress and the series agree on the same days.
  const keys = getDateRange('2026-10-12', today);
  const overall = getOverallProgress([daily, weekend], completions, keys);
  const series = getDailySeries([daily, weekend], completions, keys.map((key) => ({ key })));
  assert.equal(series.reduce((sum, day) => sum + day.done, 0), overall.done);
  assert.equal(series.reduce((sum, day) => sum + day.total, 0), overall.total);
});

test('changing a schedule changes the figures immediately and leaves check-ins alone', () => {
  const completions = { a: record('2026-10-13', '2026-10-15') }; // Tue, Thu
  const keys = getDateRange('2026-10-12', '2026-10-18');
  const every = { id: 'a', createdAt: '2026-10-01', schedule: null };
  const tueThu = { ...every, schedule: [2, 4] };
  assert.deepEqual(getHabitProgress(every, completions, keys), { done: 2, total: 7, rate: 2 / 7 });
  assert.deepEqual(getHabitProgress(tueThu, completions, keys), { done: 2, total: 2, rate: 1 });
  assert.equal(countPerfectDays([tueThu], completions, keys), 2);
  assert.deepEqual(completions, { a: record('2026-10-13', '2026-10-15') });
});

test('empty histories and zero-habit days produce no fabricated numbers', () => {
  assert.equal(countPerfectDays([], {}, ['2026-10-19']), 0);
  assert.deepEqual(getOverallProgress([], {}, ['2026-10-19']), { done: 0, total: 0, rate: null });
  assert.equal(getBestWeek([], {}, '2026-10-19'), null);
  const habit = { id: 'a', createdAt: '2026-10-19', schedule: null };
  assert.deepEqual(getHabitStreaks(habit, {}, '2026-10-19'), { current: 0, best: 0 });
});
