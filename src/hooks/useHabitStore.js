import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { appReducer } from '../data/appReducer.js';
import { habitRepository } from '../data/repository.js';
import { createDefaultState, loadInitialState } from '../data/defaultHabits.js';
import { getTodayKey } from '../lib/dates.js';
import {
  DEFAULT_COLOR,
  DEFAULT_ICON,
  MAX_NAME_LENGTH,
  isEmoji,
  isHabitIcon,
  isPresetColor,
  normalizeHex,
} from '../lib/habitOptions.js';
import { createId } from '../lib/ids.js';
import { normalizeSchedule } from '../lib/schedule.js';
import { normaliseTaskFields } from '../lib/tasks.js';

function normaliseFields({ name, icon, emoji, color, schedule }) {
  return {
    name: name.trim().slice(0, MAX_NAME_LENGTH),
    icon: isHabitIcon(icon) ? icon : DEFAULT_ICON,
    emoji: isEmoji(emoji) ? emoji : null,
    color: isPresetColor(color) ? color : (normalizeHex(color) ?? DEFAULT_COLOR),
    schedule: normalizeSchedule(schedule),
  };
}

/**
 * App state plus every mutation the UI may perform. Persistence goes through
 * `repository` (see src/data/repository.js), so swapping storage backends
 * never touches components.
 */
export function useHabitStore(repository = habitRepository) {
  const [state, dispatch] = useReducer(appReducer, repository, (repo) => loadInitialState(repo, getTodayKey()));
  const [saveFailed, setSaveFailed] = useState(false);

  // Saving after each change. The flag only updates when it actually changes, so a
  // normal save doesn't cause a second render of the whole app.
  const saveFailedRef = useRef(false);
  useEffect(() => {
    const failed = !repository.save(state);
    if (failed !== saveFailedRef.current) {
      saveFailedRef.current = failed;
      setSaveFailed(failed);
    }
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
      // Reset and delete-all replace habits and check-ins; tasks and the theme stay.
      resetToDefaults() {
        const { habits, completions } = createDefaultState(getTodayKey());
        dispatch({ type: 'replaceHabits', habits, completions });
      },
      deleteEverything() {
        dispatch({ type: 'replaceHabits', habits: [], completions: {} });
      },
      /** `backup` comes from readBackup/parseBackup, so it is already validated. */
      restoreBackup(backup) {
        dispatch({ type: 'restore', backup });
      },

      // Tasks never touch habits or check-ins. `id` is created when a form opens,
      // so submitting twice dispatches the same task and the second is ignored.
      addTask(id, fields) {
        dispatch({ type: 'addTask', task: { id, ...normaliseTaskFields(fields), completedAt: null, createdAt: Date.now() } });
      },
      updateTask(id, fields) {
        dispatch({ type: 'updateTask', id, fields });
      },
      setTaskCompleted(id, completed) {
        dispatch({ type: 'setTaskCompleted', id, completed, at: Date.now() });
      },
      deleteTask(id) {
        dispatch({ type: 'deleteTask', id });
      },
      /** `ids` in their new order; habits not listed keep their places. */
      reorderHabits(ids) {
        dispatch({ type: 'reorderHabits', ids });
      },
      /** `ids` in their new order; tasks not listed (e.g. completed ones) keep their places. */
      reorderTasks(ids) {
        dispatch({ type: 'reorderTasks', ids });
      },

      setTheme(theme) {
        dispatch({ type: 'setTheme', theme });
      },
      setPageLayout(layout) {
        dispatch({ type: 'setPageLayout', layout });
      },
      setCombinedOrder(order) {
        dispatch({ type: 'setCombinedOrder', order });
      },
      setOpeningPage(page) {
        dispatch({ type: 'setOpeningPage', page });
      },
    }),
    [],
  );

  return { state, saveFailed, ...actions };
}
