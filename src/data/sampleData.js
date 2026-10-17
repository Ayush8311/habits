// Example habits with a few weeks of believable history, generated relative to
// today. They are ordinary records: users can edit, delete or clear them.

import { addDays, parseDateKey } from '../lib/dates.js';
import { createId } from '../lib/ids.js';

const SAMPLE_HABITS = [
  { name: 'Wake up early', icon: 'sunrise', color: 'amber', chance: 0.7, weekendDip: 0.3 },
  { name: 'Exercise', icon: 'dumbbell', color: 'clay', chance: 0.62, weekendDip: 0.1 },
  { name: 'Read', icon: 'book', color: 'ocean', chance: 0.8, weekendDip: 0 },
  { name: 'Plan the day', icon: 'list', color: 'sage', chance: 0.86, weekendDip: 0.35 },
  { name: 'Work on a project', icon: 'laptop', color: 'slate', chance: 0.64, weekendDip: 0.15 },
  { name: 'Journal', icon: 'notebook', color: 'plum', chance: 0.5, weekendDip: 0 },
  { name: 'Sleep on time', icon: 'moon', color: 'ocean', chance: 0.6, weekendDip: 0.2 },
];

const HISTORY_DAYS = 56;
const DONE_TODAY = new Set(['Plan the day', 'Read', 'Wake up early']);

// Small deterministic PRNG so the sample history is stable for a given seed.
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSampleState(todayKey) {
  const createdAt = addDays(todayKey, -HISTORY_DAYS);
  const habits = [];
  const completions = {};

  SAMPLE_HABITS.forEach((sample, index) => {
    const habit = { id: createId(), name: sample.name, icon: sample.icon, color: sample.color, createdAt };
    const random = mulberry32(index * 7919 + 101);
    const record = {};

    for (let offset = HISTORY_DAYS; offset >= 1; offset -= 1) {
      const key = addDays(todayKey, -offset);
      const weekday = parseDateKey(key).getDay();
      const isWeekend = weekday === 0 || weekday === 6;
      // A gentle upward trend, so recent weeks look like a habit taking hold.
      const ramp = ((HISTORY_DAYS - offset) / HISTORY_DAYS) * 0.1;
      const chance = sample.chance + ramp - (isWeekend ? sample.weekendDip : 0);
      if (random() < chance) record[key] = true;
    }
    if (DONE_TODAY.has(sample.name)) record[todayKey] = true;

    habits.push(habit);
    completions[habit.id] = record;
  });

  return { habits, completions };
}
