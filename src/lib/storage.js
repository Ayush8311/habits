// Validation and (de)serialisation of saved habit data. Everything read back is
// checked, so a corrupt, older or hand-edited entry can never crash the app or
// leave orphaned records. The browser-specific reading and writing lives in
// src/data/repository.js.

import { isDateKey } from './dates.js';
import { DEFAULT_COLOR, DEFAULT_ICON, MAX_NAME_LENGTH, isEmoji, isHabitIcon, normalizeHex, isPresetColor } from './habitOptions.js';
import { normalizeSchedule } from './schedule.js';
import { sanitizeTasks } from './tasks.js';
import { sanitizePreferences } from './preferences.js';

export const STORAGE_KEY = 'habit.state.v1';
// Still version 1: tasks, preferences and habit schedules are optional additions.
// Data without them (older saves and backups) reads exactly as before.
export const SCHEMA_VERSION = 1;

function sanitizeHabit(raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const name = raw.name.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return null;
  return {
    id: raw.id,
    name,
    // `icon` is always kept as a fallback; `emoji`, when present, is shown instead.
    icon: isHabitIcon(raw.icon) ? raw.icon : DEFAULT_ICON,
    emoji: isEmoji(raw.emoji) ? raw.emoji : null,
    color: isPresetColor(raw.color) ? raw.color : (normalizeHex(raw.color) ?? DEFAULT_COLOR),
    createdAt: isDateKey(raw.createdAt) ? raw.createdAt : null,
    // null means every day: habits saved before schedules existed keep that meaning.
    schedule: normalizeSchedule(raw.schedule),
  };
}

export function sanitizeState(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.habits)) return null;

  const seen = new Set();
  const habits = [];
  for (const raw of input.habits) {
    const habit = sanitizeHabit(raw);
    if (habit && !seen.has(habit.id)) {
      seen.add(habit.id);
      habits.push(habit);
    }
  }

  const source = input.completions && typeof input.completions === 'object' ? input.completions : {};
  const completions = {};
  for (const habit of habits) {
    const record = {};
    for (const [key, value] of Object.entries(source[habit.id] ?? {})) {
      if (value === true && isDateKey(key)) record[key] = true;
    }
    completions[habit.id] = record;
  }

  return { habits, completions, tasks: sanitizeTasks(input.tasks), preferences: sanitizePreferences(input.preferences) };
}

/**
 * Upgrades any saved shape to the current schema. Version 1 is the first
 * schema, so today this only validates; future versions add steps here
 * instead of discarding what people already recorded.
 */
export function migrateState(input) {
  if (!input || typeof input !== 'object') return null;
  const version = Number.isInteger(input.version) ? input.version : 1;
  if (version > SCHEMA_VERSION) return null; // Written by a newer app; never downgrade-overwrite blindly.
  return sanitizeState(input);
}

export const parseState = (text) => {
  try {
    return migrateState(JSON.parse(text));
  } catch {
    return null;
  }
};

export const serializeState = (state) => JSON.stringify({ version: SCHEMA_VERSION, ...state });
