// Every change to the app's data, as a pure function of (state, action). Each
// case changes only its own part of the state and keeps everything else, so a
// task edit can never touch habits or check-ins, and a habit change never
// touches tasks or preferences.

import { applyBackup } from '../lib/backup.js';
import { reorderSubset } from '../lib/order.js';
import { ADD_BAR_ORDERS, COMBINED_ORDERS, OPENING_PAGES, PAGE_LAYOUTS, PAGE_ORDERS, THEMES } from '../lib/preferences.js';
import { MAX_LIST_NAME_LENGTH, normaliseTaskFields } from '../lib/tasks.js';

/** `listId` for a task: an existing list's id, or undefined (no list). */
const listFor = (state, listId) => ((state.taskLists ?? []).some((list) => list.id === listId) ? listId : undefined);

/** A task with `listId` set (or removed when it's not an existing list). */
function placeInList(task, listId) {
  const { listId: _previous, ...rest } = task;
  return listId === undefined ? rest : { ...rest, listId };
}

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
    // Sets (rather than flips) one habit's check-in on one day; nothing else changes.
    case 'setCompletion': {
      const { habitId, dateKey, done } = action;
      if (!state.habits.some((habit) => habit.id === habitId)) return state;
      const current = state.completions[habitId]?.[dateKey] === true;
      if (current === Boolean(done)) return state;
      const record = { ...state.completions[habitId] };
      if (done) record[dateKey] = true;
      else delete record[dateKey];
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
      return { ...state, tasks: [...state.tasks, placeInList(action.task, listFor(state, action.task.listId))] };
    case 'updateTask':
      return {
        ...state,
        // Fields not passed keep their values; a priority or list is only changed when one is passed.
        tasks: state.tasks.map((task) => {
          if (task.id !== action.id) return task;
          const next = { ...task, ...normaliseTaskFields({ ...task, ...action.fields }) };
          return 'listId' in action.fields ? placeInList(next, listFor(state, action.fields.listId)) : next;
        }),
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

    // ── Task lists ──
    case 'addTaskList': {
      const lists = state.taskLists ?? [];
      const name = String(action.list.name ?? '').trim().slice(0, MAX_LIST_NAME_LENGTH);
      if (!name || lists.some((list) => list.id === action.list.id)) return state;
      return { ...state, taskLists: [...lists, { id: action.list.id, name, createdAt: action.list.createdAt }] };
    }
    case 'renameTaskList': {
      const name = String(action.name ?? '').trim().slice(0, MAX_LIST_NAME_LENGTH);
      if (!name) return state;
      return { ...state, taskLists: (state.taskLists ?? []).map((list) => (list.id === action.id ? { ...list, name } : list)) };
    }
    // Deleting a list never deletes its tasks: they move out of the list.
    case 'deleteTaskList':
      return {
        ...state,
        taskLists: (state.taskLists ?? []).filter((list) => list.id !== action.id),
        tasks: state.tasks.map((task) => (task.listId === action.id ? placeInList(task, undefined) : task)),
      };

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
    case 'setAddBarOrder':
      if (!ADD_BAR_ORDERS.includes(action.order)) return state;
      return { ...state, preferences: { ...state.preferences, addBarOrder: action.order } };
    case 'setPageOrder':
      if (!PAGE_ORDERS.includes(action.order)) return state;
      return { ...state, preferences: { ...state.preferences, pageOrder: action.order } };

    default:
      return state;
  }
}
