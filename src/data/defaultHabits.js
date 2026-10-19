// The habits a brand-new installation starts with. They begin today with no
// check-ins, so every statistic starts at zero until real activity is recorded.
// They are ordinary records: users can edit, delete or replace them.

import { createId } from '../lib/ids.js';

const DEFAULT_HABITS = [
  { name: 'Wake up early', icon: 'sunrise', color: 'amber' },
  { name: 'Exercise', icon: 'dumbbell', color: 'clay' },
  { name: 'Read', icon: 'book', color: 'ocean' },
  { name: 'Plan the day', icon: 'list', color: 'sage' },
  { name: 'Work on a project', icon: 'laptop', color: 'slate' },
  { name: 'Journal', icon: 'notebook', color: 'plum' },
  { name: 'Sleep on time', icon: 'moon', color: 'ocean' },
];

export function createDefaultState(todayKey) {
  const habits = DEFAULT_HABITS.map(({ name, icon, color }) => ({
    id: createId(),
    name,
    icon,
    emoji: null,
    color,
    createdAt: todayKey,
    schedule: null, // every day
  }));
  return { habits, completions: Object.fromEntries(habits.map((habit) => [habit.id, {}])), tasks: [], preferences: {} };
}

/**
 * The saved state if the repository has one, otherwise the defaults. Defaults are
 * only ever used when nothing is saved, so existing data is never replaced.
 */
export function loadInitialState(repository, todayKey) {
  return repository.load() ?? createDefaultState(todayKey);
}
