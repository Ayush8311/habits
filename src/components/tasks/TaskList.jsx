import { memo, useId, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, GripVertical, NotebookText } from 'lucide-react';
import { useReorder } from '../../hooks/useReorder.js';
import { cx } from '../../lib/classNames.js';
import { tapFeedback } from '../../lib/haptics.js';
import { formatDue, isOverdue, priorityLabel, splitTasks } from '../../lib/tasks.js';
import '../calendar/CompletionButton.css';
import '../../mobile/HabitCheckRow.css';
import './TaskList.css';

const TaskRow = memo(function TaskRow({ task, todayKey, minute, onToggle, onEdit, reorder }) {
  const done = task.completedAt !== null;
  const due = formatDue(task, todayKey);
  const overdue = isOverdue(task, todayKey, new Date(minute * 60000));
  const priority = priorityLabel(task.priority);
  const details = [due && `Due ${due}${overdue ? ', overdue' : ''}`, priority && `${priority} priority`, task.notes && 'Has notes']
    .filter(Boolean)
    .join('. ');

  return (
    <li className={cx('task-row', done && 'is-done', reorder && 'has-handle')} data-reorder-id={task.id}>
      <button
        type="button"
        className={cx('check task-row-check', done && 'is-done')}
        aria-pressed={done}
        aria-label={`${task.name}: ${done ? 'completed' : 'not completed'}`}
        // While reordering, the check is inert so a drag can never complete a task.
        disabled={Boolean(reorder)}
        onClick={() => {
          tapFeedback();
          onToggle(task.id, !done);
        }}
      >
        <svg className="check-mark" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 8.4 6.8 11.2 12 5" pathLength="1" />
        </svg>
      </button>
      <button type="button" className="task-row-main" onClick={() => onEdit(task.id)} aria-label={`Edit ${task.name}. ${details}`}>
        <span className="task-row-name">{task.name}</span>
        {(due || priority || task.notes) && (
          <span className="task-row-meta" aria-hidden="true">
            {due && (
              <span className={cx('task-row-due', overdue && 'is-overdue')}>
                <CalendarDays size={12} strokeWidth={2.1} />
                {due}
              </span>
            )}
            {priority && <span className={cx('task-priority-badge', `is-${task.priority}`)}>{priority}</span>}
            {task.notes && <NotebookText size={13} strokeWidth={2} className="task-row-notes" />}
          </span>
        )}
      </button>
      {reorder && (
        <>
          <span className="reorder-handle" role="button" tabIndex={0} {...reorder.handleProps(task.id, task.name)}>
            <GripVertical size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          <button type="button" className="sr-only" onClick={() => reorder.move(task.id, -1)}>
            <ChevronUp aria-hidden="true" />
            Move {task.name} up
          </button>
          <button type="button" className="sr-only" onClick={() => reorder.move(task.id, 1)}>
            <ChevronDown aria-hidden="true" />
            Move {task.name} down
          </button>
        </>
      )}
    </li>
  );
});

/** One list (pending or completed); each reorders only within itself. */
function TaskRows({ tasks, todayKey, minute, onToggle, onEdit, onReorder, editing }) {
  const ids = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const reorder = useReorder({ ids, onReorder });
  return (
    <ul ref={reorder.listRef} className="m-card task-list">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          todayKey={todayKey}
          minute={minute}
          onToggle={onToggle}
          onEdit={onEdit}
          reorder={editing && onReorder ? reorder : undefined}
        />
      ))}
    </ul>
  );
}

/**
 * Pending tasks, then completed ones in a collapsible section, each in the user's
 * own order. Rows are memoised, so ticking one task doesn't re-render the others.
 * With `editing`, rows show drag handles (`onReorder(ids)` saves a new order).
 */
export function TaskList({ tasks, todayKey, onToggle, onEdit, onReorder, editing = false, title = 'To do', emptyState }) {
  const { pending, completed } = useMemo(() => splitTasks(tasks), [tasks]);
  const [showCompleted, setShowCompleted] = useState(true);
  const completedId = useId();
  // Minute resolution keeps rows memoisable; overdue-by-time refreshes on the next render.
  const minute = Math.floor(Date.now() / 60000);

  if (tasks.length === 0) return emptyState;

  const rows = { todayKey, minute, onToggle, onEdit, onReorder, editing };
  return (
    <>
      <section className="m-section task-section" aria-labelledby="tasks-pending-title">
        <h2 id="tasks-pending-title" className="m-section-title">
          {editing ? `${title} · drag to reorder` : title} <span className="task-section-count tabular">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="m-card task-all-done">All caught up. Nothing left to do.</p>
        ) : (
          <TaskRows tasks={pending} {...rows} />
        )}
      </section>

      {completed.length > 0 && (
        <section className="m-section task-section" aria-labelledby="tasks-done-title">
          <h2 id="tasks-done-title" className="m-section-title">
            <button
              type="button"
              className="task-section-toggle"
              aria-expanded={showCompleted}
              aria-controls={completedId}
              onClick={() => setShowCompleted((value) => !value)}
            >
              Completed <span className="task-section-count tabular">{completed.length}</span>
              <ChevronDown size={15} strokeWidth={2} aria-hidden="true" className="task-section-chevron" />
            </button>
          </h2>
          {/* Collapses by animating the row height (grid 1fr → 0fr), not by unmounting. */}
          <div id={completedId} className={cx('task-collapse', !showCompleted && 'is-collapsed')} inert={!showCompleted}>
            <div className="task-collapse-inner">
              <TaskRows tasks={completed} {...rows} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
