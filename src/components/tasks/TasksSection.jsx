import { ListTodo, Plus } from 'lucide-react';
import { EmptyState } from '../EmptyState.jsx';
import { Button } from '../ui/Button.jsx';
import { TaskList } from './TaskList.jsx';
import './TasksSection.css';

/** Tasks on the desktop layout: the same list and form as the phone's Tasks tab. */
export function TasksSection({ store, todayKey, onAddTask, onEditTask, onPostponeTask }) {
  return (
    <section className="tasks-section" aria-labelledby="tasks-section-title">
      <div className="tasks-section-head">
        <h2 id="tasks-section-title" className="section-title">
          Tasks
        </h2>
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => onAddTask()}>
          New task
        </Button>
      </div>
      <TaskList
        tasks={store.state.tasks}
        todayKey={todayKey}
        onToggle={store.setTaskCompleted}
        onEdit={onEditTask}
        onPostpone={onPostponeTask}
        listNames={new Map((store.state.taskLists ?? []).map((list) => [list.id, list.name]))}
        emptyState={
          <div className="card">
            <EmptyState icon={ListTodo} title="No tasks yet" message="One-off things to get done, kept apart from your habits." />
          </div>
        }
      />
    </section>
  );
}
