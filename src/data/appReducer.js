// Every change to the app's data, as a pure function of (state, action). Each
// case changes only its own part of the state and keeps everything else, so a
// task edit can never touch habits or check-ins, and a habit change never
// touches tasks or preferences.

import { applyBackup } from '../lib/backup.js';
import { reorderSubset } from '../lib/order.js';
import { COMBINED_ORDERS, OPENING_PAGES, PAGE_LAYOUTS, THEMES } from '../lib/preferences.js';
import { normaliseTaskFields } from '../lib/tasks.js';

export function appReducer(state, action) {
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
      if (state.habits.some((habit) => habit.id === action.habit.id)) return state;
      return {
        ...state,
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
      return { ...state, habits: state.habits.filter((habit) => habit.id !== action.id), completions };
    }
    // Manual order (Edit mode). Habits and tasks are ordered independently.
    case 'reorderHabits':
      return { ...state, habits: reorderSubset(state.habits, action.ids) };
    case 'reorderTasks':
      return { ...state, tasks: reorderSubset(state.tasks, action.ids) };
    case 'clear':
      return { ...state, completions: Object.fromEntries(state.habits.map((habit) => [habit.id, {}])) };
    // Habits and check-ins only (reset, delete all): tasks and preferences stay.
    case 'replaceHabits':
      return { ...state, habits: action.habits, completions: action.completions };
    case 'replace':
      return action.state;
    case 'restore':
      return applyBackup(state, action.backup);

    // ── Tasks ──
    case 'addTask':
      // The id is fixed when the form opens, so a repeated submit can't add a second copy.
      if (state.tasks.some((task) => task.id === action.task.id)) return state;
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'updateTask':
      return {
        ...state,
        // Fields not passed keep their values; a priority is only changed when one is passed.
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, ...normaliseTaskFields({ ...task, ...action.fields }) } : task,
        ),
      };
    case 'setTaskCompleted':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, completedAt: action.completed ? action.at : null } : task,
        ),
      };
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };

    // ── Preferences ──
    case 'setTheme':
      if (!THEMES.includes(action.theme)) return state;
      return { ...state, preferences: { ...state.preferences, theme: action.theme } };
    case 'setPageLayout':
      if (!PAGE_LAYOUTS.includes(action.layout)) return state;
      return { ...state, preferences: { ...state.preferences, pageLayout: action.layout } };
    case 'setCombinedOrder':
      if (!COMBINED_ORDERS.includes(action.order)) return state;
      return { ...state, preferences: { ...state.preferences, combinedOrder: action.order } };
    case 'setOpeningPage':
      if (!OPENING_PAGES.includes(action.page)) return state;
      return { ...state, preferences: { ...state.preferences, openingPage: action.page } };

    default:
      return state;
  }
}
