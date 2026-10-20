import { useCallback, useState } from 'react';
import { tasksInList } from '../../lib/tasks.js';
import { PostponeSheet } from './PostponeSheet.jsx';
import { TaskFormSheet } from './TaskFormSheet.jsx';
import { TaskListSheet } from './TaskListSheet.jsx';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * The task form (new or edit), the postpone sheet, the list name sheet and their
 * delete confirmations. `confirm` is the shared confirm dialog from useHabitDialogs,
 * so only one confirmation system exists.
 *
 *   openTaskForm(taskId?, { listId? })   new task (optionally in a list), or edit one
 *   openPostpone(taskId)                 Tomorrow / Pick a date
 *   openListForm(listId?, { onCreated? }) new list, or rename one
 */
export function useTaskDialogs({ store, todayKey, confirm, onListDeleted }) {
  const [form, setForm] = useState(null); // { taskId: string | null, listId?: string }
  const [postponeId, setPostponeId] = useState(null);
  const [listForm, setListForm] = useState(null); // { listId: string | null, onCreated? }
  const taskLists = store.state.taskLists ?? [];

  const openTaskForm = useCallback((taskId = null, options = {}) => {
    setForm({ taskId: typeof taskId === 'string' ? taskId : null, listId: options.listId });
  }, []);
  const openPostpone = useCallback((taskId) => setPostponeId(taskId), []);
  const openListForm = useCallback((listId = null, options = {}) => {
    setListForm({ listId: typeof listId === 'string' ? listId : null, onCreated: options.onCreated });
  }, []);
  const close = useCallback(() => setForm(null), []);
  const closePostpone = useCallback(() => setPostponeId(null), []);
  const closeListForm = useCallback(() => setListForm(null), []);

  const task = form?.taskId ? store.state.tasks.find((item) => item.id === form.taskId) : null;
  const postponing = postponeId ? store.state.tasks.find((item) => item.id === postponeId) : null;
  const editingList = listForm?.listId ? taskLists.find((list) => list.id === listForm.listId) : null;

  const taskDialog = (
    <>
      {form && (!form.taskId || task) && (
        <TaskFormSheet
          key={form.taskId ?? 'new'}
          task={task}
          todayKey={todayKey}
          lists={taskLists}
          defaultListId={form.listId}
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
      )}
      {postponing && (
        <PostponeSheet task={postponing} todayKey={todayKey} onPostpone={store.postponeTask} onClose={closePostpone} />
      )}
      {listForm && (!listForm.listId || editingList) && (
        <TaskListSheet
          key={listForm.listId ?? 'new'}
          list={editingList}
          existingNames={
            new Set(taskLists.filter((list) => list.id !== listForm.listId).map((list) => list.name.toLowerCase()))
          }
          onSubmit={(name) => {
            if (editingList) {
              store.renameTaskList(editingList.id, name);
              return;
            }
            const id = store.addTaskList(name);
            listForm.onCreated?.(id);
          }}
          onDelete={() => {
            const count = tasksInList(store.state.tasks, editingList.id).length;
            confirm({
              title: `Delete “${editingList.name}”?`,
              message:
                count > 0
                  ? `The list goes, but its ${plural(count, 'task')} stay: they move to Inbox.`
                  : 'This empty list will be removed.',
              confirmLabel: 'Delete list',
              onConfirm: () => {
                store.deleteTaskList(editingList.id);
                closeListForm();
                onListDeleted?.(editingList.id);
              },
            });
          }}
          onClose={closeListForm}
        />
      )}
    </>
  );

  return { openTaskForm, openPostpone, openListForm, taskDialog };
}
