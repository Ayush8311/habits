import { useEffect, useMemo, useReducer, useState } from 'react';
import { habitRepository } from '../data/repository.js';
import { createSampleState } from '../data/sampleData.js';
import { getTodayKey } from '../lib/dates.js';
import { DEFAULT_COLOR, DEFAULT_ICON, MAX_NAME_LENGTH } from '../lib/habitOptions.js';
import { createId } from '../lib/ids.js';

const EMPTY_STATE = { habits: [], completions: {} };

function reducer(state, action) {
  switch (action.type) {
    case 'toggle': {
      const { habitId, dateKey } = action;
      if (!state.habits.some((habit) => habit.id === habitId)) return state;
      const record = { ...state.completions[habitId] };
      if (record[dateKey]) delete record[dateKey];
      else record[dateKey] = true;
      return { ...state, completions: { ...state.completions, [habitId]: record } };
    }
    case 'add':
      return {
        habits: [...state.habits, action.habit],
        completions: { ...state.completions, [action.habit.id]: {} },
      };
    case 'update':
      return {
        ...state,
        habits: state.habits.map((habit) => (habit.id === action.id ? { ...habit, ...action.fields } : habit)),
      };
    case 'delete': {
      const { [action.id]: _removed, ...completions } = state.completions;
      return { habits: state.habits.filter((habit) => habit.id !== action.id), completions };
    }
    case 'clear':
      return { ...state, completions: Object.fromEntries(state.habits.map((habit) => [habit.id, {}])) };
    case 'replace':
      return action.state;
    default:
      return state;
  }
}

function normaliseFields({ name, icon, color }) {
  return {
    name: name.trim().slice(0, MAX_NAME_LENGTH),
    icon: icon ?? DEFAULT_ICON,
    color: color ?? DEFAULT_COLOR,
  };
}

/**
 * App state plus every mutation the UI may perform. Persistence goes through
 * `repository` (see src/data/repository.js), so swapping storage backends
 * never touches components.
 */
export function useHabitStore(repository = habitRepository) {
  const [state, dispatch] = useReducer(reducer, repository, (repo) => repo.load() ?? createSampleState(getTodayKey()));
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setSaveFailed(!repository.save(state));
  }, [state, repository]);

  useEffect(() => repository.subscribe((next) => dispatch({ type: 'replace', state: next })), [repository]);

  const actions = useMemo(
    () => ({
      toggleCompletion(habitId, dateKey) {
        if (dateKey > getTodayKey()) return; // Future days cannot be checked off.
        dispatch({ type: 'toggle', habitId, dateKey });
      },
      addHabit(fields) {
        dispatch({ type: 'add', habit: { id: createId(), createdAt: getTodayKey(), ...normaliseFields(fields) } });
      },
      updateHabit(id, fields) {
        dispatch({ type: 'update', id, fields: normaliseFields(fields) });
      },
      deleteHabit(id) {
        dispatch({ type: 'delete', id });
      },
      clearCompletions() {
        dispatch({ type: 'clear' });
      },
      resetToSample() {
        dispatch({ type: 'replace', state: createSampleState(getTodayKey()) });
      },
      deleteEverything() {
        dispatch({ type: 'replace', state: EMPTY_STATE });
      },
      /** `next` must already be validated (see parseState). */
      replaceState(next) {
        dispatch({ type: 'replace', state: next });
      },
    }),
    [],
  );

  return { state, saveFailed, ...actions };
}
