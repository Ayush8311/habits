import { useCallback, useState } from 'react';
import { formatMonthName } from '../lib/dates.js';
import { getHabitProgress, getHabitStreaks } from '../lib/stats.js';
import { HabitFormModal } from './HabitFormModal.jsx';
import { ConfirmDialog } from './ui/ConfirmDialog.jsx';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * Shared add/edit/delete/confirm dialogs. Returns openers plus the element to
 * render, so desktop and mobile layouts behave identically.
 *
 * `monthKeys` are the eligible days of the month whose figures the editor shows.
 */
export function useHabitDialogs({ store, todayKey, monthKeys, monthKey }) {
  const { habits, completions } = store.state;
  const [dialog, setDialog] = useState(null);

  // Stable references, so memoised rows that receive them don't re-render needlessly.
  const close = useCallback(() => setDialog(null), []);
  const confirm = useCallback((options) => setDialog({ kind: 'confirm', ...options }), []);
  const openHabitForm = useCallback((habitId = null) => setDialog({ kind: 'habit', habitId }), []);

  const editingHabit =
    dialog?.kind === 'habit' && dialog.habitId ? habits.find((habit) => habit.id === dialog.habitId) : null;

  const requestDelete = (habit) => {
    const count = Object.keys(completions[habit.id] ?? {}).length;
    confirm({
      title: `Delete “${habit.name}”?`,
      message: `This removes the habit and ${plural(count, 'check-in')}. This can’t be undone.`,
      confirmLabel: 'Delete habit',
      onConfirm: () => store.deleteHabit(habit.id),
    });
  };

  const dialogs = (
    <>
      {dialog?.kind === 'habit' && (
        <HabitFormModal
          key={dialog.habitId ?? 'new'}
          habit={editingHabit}
          monthName={formatMonthName(monthKey)}
          stats={
            editingHabit && {
              progress: getHabitProgress(editingHabit, completions, monthKeys),
              streak: getHabitStreaks(editingHabit, completions, todayKey),
            }
          }
          existingNames={
            new Set(habits.filter((habit) => habit.id !== dialog.habitId).map((habit) => habit.name.trim().toLowerCase()))
          }
          onSubmit={(fields) => (editingHabit ? store.updateHabit(editingHabit.id, fields) : store.addHabit(fields))}
          onDelete={() => editingHabit && requestDelete(editingHabit)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'confirm' && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          tone={dialog.tone}
          hideCancel={dialog.hideCancel}
          onConfirm={dialog.onConfirm}
          onClose={close}
        />
      )}
    </>
  );

  return { openHabitForm, confirm, dialogs };
}
