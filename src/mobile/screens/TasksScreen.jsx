import { useState } from 'react';
import { ListTodo, Plus } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState.jsx';
import { TaskList } from '../../components/tasks/TaskList.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ScreenHeader } from '../ScreenHeader.jsx';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * The Tasks page (Separate pages layout). One-off tasks never affect habits or their
 * statistics. New tasks come from the Add new bar; Edit reorders the list.
 */
export function TasksScreen({ store, todayKey, onAddTask, onEditTask }) {
  const { tasks } = store.state;
  const [editing, setEditing] = useState(false);
  const isEditing = editing && tasks.length > 0;
  const pending = tasks.filter((task) => task.completedAt === null).length;

  return (
    <div className="tasks-screen">
      <ScreenHeader
        eyebrow={tasks.length === 0 ? 'One-off to-dos' : pending === 0 ? 'All done' : `${plural(pending, 'task')} to do`}
        title="Tasks"
        actions={
          tasks.length > 0 && (
            <Button variant="tertiary" onClick={() => setEditing((value) => !value)}>
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          )
        }
      />
      <TaskList
        tasks={tasks}
        todayKey={todayKey}
        onToggle={store.setTaskCompleted}
        onEdit={onEditTask}
        onReorder={store.reorderTasks}
        editing={isEditing}
        emptyState={
          <div className="m-card">
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              message="Tasks are one-off things to get done. They’re kept apart from your habits and streaks."
              action={
                <Button variant="primary" icon={Plus} onClick={() => onAddTask()}>
                  Add a task
                </Button>
              }
            />
          </div>
        }
      />
    </div>
  );
}
