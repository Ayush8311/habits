import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDefaultState, loadInitialState } from '../src/data/defaultHabits.js';
import { getMonthDays } from '../src/lib/dates.js';
import { buildInsights, buildTodayInsight } from '../src/lib/insights.js';
import {
  countPerfectDays,
  eligibleKeys,
  getHabitProgress,
  getHabitStreaks,
  getOverallProgress,
  getStreakLeaders,
  getWeekComparison,
  getWeeklyRates,
} from '../src/lib/stats.js';
import { parseState, sanitizeState, serializeState } from '../src/lib/storage.js';

const TODAY = '2026-10-17';
const monthKeys = (today) => eligibleKeys(getMonthDays(2026, 9).map((day) => day.key), today);

test('a new installation gets the 7 default habits, in order, with no check-ins', () => {
  const state = createDefaultState(TODAY);
  assert.deepEqual(
    state.habits.map(({ name, icon, emoji, color }) => [name, icon, emoji, color]),
    [
      ['Wake up early', 'sunrise', null, 'amber'],
      ['Exercise', 'dumbbell', null, 'clay'],
      ['Read', 'book', null, 'ocean'],
      ['Plan the day', 'list', null, 'sage'],
      ['Work on a project', 'laptop', null, 'slate'],
      ['Journal', 'notebook', null, 'plum'],
      ['Sleep on time', 'moon', null, 'ocean'],
    ],
  );
  assert.ok(state.habits.every((habit) => habit.createdAt === TODAY));
  assert.equal(new Set(state.habits.map((habit) => habit.id)).size, 7);
  assert.deepEqual(Object.values(state.completions), [{}, {}, {}, {}, {}, {}, {}]);
  assert.deepEqual(parseState(serializeState(state)), state);
});

test('default habits start with every statistic at zero and no streak messages', () => {
  const { habits, completions } = createDefaultState(TODAY);
  const week = getWeekComparison(habits, completions, TODAY);
  const keys = monthKeys(TODAY);

  assert.deepEqual(getOverallProgress(habits, completions, keys), { done: 0, total: 7, rate: 0 });
  for (const habit of habits) {
    assert.deepEqual(getHabitStreaks(habit.id, completions, TODAY), { current: 0, best: 0 });
    assert.deepEqual(getHabitProgress(habit, completions, keys), { done: 0, total: 1, rate: 0 });
  }
  assert.deepEqual(getStreakLeaders(habits, completions, TODAY), {
    current: { habit: null, value: 0 },
    best: { habit: null, value: 0 },
  });
  assert.equal(countPerfectDays(habits, completions, keys), 0);
  assert.equal(week.hasPrevious, false);
  assert.equal(week.delta, null);
  // Days before the habits existed aren't scored as missed: earlier weeks are empty.
  const weeks = getWeeklyRates(habits, completions, TODAY, 8);
  assert.ok(weeks.slice(0, -1).every((w) => w.total === 0 && w.rate === null));

  const insights = buildInsights({ habits, completions, todayKey: TODAY, week, monthKeys: keys });
  assert.equal(insights.headline, 'A fresh page.');
  assert.equal(insights.detail, 'No check-ins in the last 14 days yet.');
  assert.deepEqual(insights.items.map((item) => item.id), ['today']);
  assert.equal(buildTodayInsight({ habits, completions, todayKey: TODAY, week }), '7 habits lined up for today.');
  assert.ok(!JSON.stringify(insights).includes('streak'));
});

test('streaks and progress count only real check-ins', () => {
  const state = createDefaultState('2026-10-15');
  const read = state.habits.find((habit) => habit.name === 'Read');
  state.completions[read.id] = { '2026-10-15': true, '2026-10-16': true, '2026-10-17': true };
  const { habits, completions } = state;

  assert.deepEqual(getHabitStreaks(read.id, completions, TODAY), { current: 3, best: 3 });
  assert.deepEqual(getOverallProgress(habits, completions, [TODAY]), { done: 1, total: 7, rate: 1 / 7 });
  const week = getWeekComparison(habits, completions, TODAY);
  const insights = buildInsights({ habits, completions, todayKey: TODAY, week, monthKeys: monthKeys(TODAY) });
  assert.ok(insights.items.some((item) => item.text === 'Read is on a 3-day streak.'));
});

test('saved data is loaded as it is; defaults only when nothing is saved', () => {
  const saved = {
    habits: [{ id: 'mine', name: 'My habit', icon: 'book', emoji: null, color: 'ocean', createdAt: '2026-01-01' }],
    completions: { mine: { '2026-01-01': true, '2026-10-16': true } },
  };
  assert.equal(loadInitialState({ load: () => saved }, TODAY), saved);
  // An existing user who deleted every habit keeps an empty list.
  const empty = { habits: [], completions: {} };
  assert.equal(loadInitialState({ load: () => empty }, TODAY), empty);

  const fresh = loadInitialState({ load: () => null }, TODAY);
  assert.equal(fresh.habits.length, 7);
  assert.ok(Object.values(fresh.completions).every((record) => Object.keys(record).length === 0));
});

test('an imported backup keeps its full history', () => {
  const backup = serializeState({
    habits: [{ id: 'h1', name: 'Read', icon: 'book', emoji: null, color: 'ocean', createdAt: '2026-08-01' }],
    completions: { h1: { '2026-08-01': true, '2026-08-02': true, '2026-10-16': true, '2026-10-17': true } },
  });
  const state = parseState(backup);
  assert.deepEqual(Object.keys(state.completions.h1), ['2026-08-01', '2026-08-02', '2026-10-16', '2026-10-17']);
  assert.deepEqual(getHabitStreaks('h1', state.completions, TODAY), { current: 2, best: 2 });
  assert.deepEqual(sanitizeState(state), state);
});
