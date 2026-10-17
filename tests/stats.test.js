import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInsights } from '../src/lib/insights.js';
import {
  countPerfectDays,
  getDailySeries,
  getBestStreak,
  getCurrentStreak,
  getHabitProgress,
  getOverallProgress,
  getWeekComparison,
} from '../src/lib/stats.js';

const record = (...keys) => Object.fromEntries(keys.map((key) => [key, true]));

test('current streak counts back from today, or yesterday if today is open', () => {
  const r = record('2026-10-14', '2026-10-15', '2026-10-16');
  assert.equal(getCurrentStreak(r, '2026-10-16'), 3);
  assert.equal(getCurrentStreak(r, '2026-10-17'), 3);
  assert.equal(getCurrentStreak(r, '2026-10-18'), 0);
  assert.equal(getCurrentStreak({}, '2026-10-18'), 0);
});

test('best streak finds the longest run, including across months', () => {
  const r = record('2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06');
  assert.equal(getBestStreak(r), 4);
  assert.equal(getBestStreak({}), 0);
  assert.equal(getBestStreak(record('2024-02-28', '2024-02-29', '2024-03-01')), 3);
});

test('progress only counts real records and handles empty input', () => {
  const habits = [{ id: 'a' }, { id: 'b' }];
  const completions = { a: record('2026-10-01', '2026-10-02'), b: record('2026-10-02') };
  const keys = ['2026-10-01', '2026-10-02', '2026-10-03'];
  assert.deepEqual(getHabitProgress(habits[0], completions, keys), { done: 2, total: 3, rate: 2 / 3 });
  // 'b' has no creation date, so it counts from its first check-in (Oct 2).
  assert.deepEqual(getOverallProgress(habits, completions, keys), { done: 3, total: 5, rate: 0.6 });
  assert.deepEqual(getOverallProgress([], completions, keys), { done: 0, total: 0, rate: null });
});

test('week comparison only reports a delta when last week has data', () => {
  const habits = [{ id: 'a' }];
  const today = '2026-10-14'; // Wednesday
  const noHistory = getWeekComparison(habits, { a: record('2026-10-12') }, today);
  assert.equal(noHistory.delta, null);
  assert.equal(noHistory.thisKeys.length, 3);

  const withHistory = getWeekComparison(
    habits,
    { a: record('2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13', '2026-10-14') },
    today,
  );
  assert.equal(withHistory.hasPrevious, true);
  assert.ok(Math.abs(withHistory.delta - (1 - 2 / 7)) < 1e-9);
});

test('insights describe today truthfully and handle no habits', () => {
  const habits = [
    { id: 'a', name: 'Read' },
    { id: 'b', name: 'Run' },
  ];
  const today = '2026-10-14';
  const completions = { a: record(today), b: {} };
  const week = getWeekComparison(habits, completions, today);
  const result = buildInsights({ habits, completions, todayKey: today, week, monthKeys: [today] });
  assert.equal(result.items[0].text, 'You completed 1 of 2 habits today.');

  const empty = buildInsights({ habits: [], completions: {}, todayKey: today, week, monthKeys: [] });
  assert.equal(empty.items.length, 0);
});

test('a habit only counts from when it was created, or its earliest back-filled day', () => {
  const keys = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
  const fresh = { id: 'new', createdAt: '2026-10-03' };
  const old = { id: 'old', createdAt: '2026-09-01' };
  const completions = { new: record('2026-10-03'), old: record('2026-10-01', '2026-10-03') };

  assert.deepEqual(getHabitProgress(fresh, completions, keys), { done: 1, total: 2, rate: 0.5 });
  assert.deepEqual(getOverallProgress([fresh, old], completions, keys), { done: 3, total: 6, rate: 0.5 });

  const backfilled = { new: record('2026-10-02', '2026-10-03') };
  assert.equal(getHabitProgress(fresh, backfilled, keys).total, 3);

  const series = getDailySeries([fresh, old], completions, keys.map((key) => ({ key })));
  assert.deepEqual(series.map((day) => day.total), [1, 1, 2, 2]);
  assert.equal(countPerfectDays([fresh, old], completions, keys), 2);

  const legacy = { id: 'legacy', createdAt: null };
  assert.equal(getHabitProgress(legacy, {}, keys).total, 4);
});
