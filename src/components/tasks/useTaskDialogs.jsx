import { useCallback, useState } from 'react';
import { TaskFormSheet } from './TaskFormSheet.jsx';

/**
 * The task form (new or edit) and its delete confirmation. `confirm` is the shared
 * confirm dialog from useHabitDialogs, so only one confirmation system exists.
 */
export function useTaskDialogs({ store, todayKey, confirm }) {
  const [form, setForm] = useState(null); // { taskId: string | null }

  const openTaskForm = useCallback((taskId = null) => setForm({ taskId }), []);
  const close = useCallback(() => setForm(null), []);
  const task = form?.taskId ? store.state.tasks.find((item) => item.id === form.taskId) : null;

  const taskDialog = form && (!form.taskId || task) && (
    <TaskFormSheet
      key={form.taskId ?? 'new'}
      task={task}
      todayKey={todayKey}
      onSubmit={(id, fields) => (task ? store.updateTask(id, fields) : store.addTask(id, fields))}
      onDelete={() =>
        confirm({
          title: `Delete “${task.name}”?`,
          message: 'This task will be removed. This can’t be undone.',
          confirmLabel: 'Delete task',
          onConfirm: () => {
            store.deleteTask(task.id);
            close();
          },
        })
      }
      onClose={close}
    />
  );

  return { openTaskForm, taskDialog };
}
