import { memo, useId, useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  List,
  NotebookText,
  Undo2,
} from 'lucide-react';
import { useReorder } from '../../hooks/useReorder.js';
import { useSwipeRow } from '../../hooks/useSwipeRow.js';
import { cx } from '../../lib/classNames.js';
import { tapFeedback } from '../../lib/haptics.js';
import { formatDue, isOverdue, priorityLabel, splitTasks } from '../../lib/tasks.js';
import '../calendar/CompletionButton.css';
import '../../mobile/HabitCheckRow.css';
import '../ui/SwipeRow.css';
import './TaskList.css';

// Tasks that just moved between To do and Completed (or were just created): their
// row is a new element in the other section, so it arrives with a short fade and,
// when done, draws its tick (CSS transitions don't run on a new element).
const ARRIVAL_MS = 1200;
const toggledAt = new Map();
const justArrived = (task) => {
  const at = toggledAt.get(task.id) ?? task.createdAt;
  return Date.now() - at < ARRIVAL_MS;
};

const TaskRow = memo(function TaskRow({ task, todayKey, minute, listName, hintId, onToggle, onEdit, onPostpone, reorder }) {
  const done = task.completedAt !== null;
  const editing = Boolean(reorder);
  const due = formatDue(task, todayKey);
  const overdue = isOverdue(task, todayKey, new Date(minute * 60000));
  const priority = priorityLabel(task.priority);
  const details = [
    done ? 'Completed' : 'Not completed',
    due && `Due ${due}${overdue ? ', overdue' : ''}`,
    priority && `${priority} priority`,
    listName && `In ${listName}`,
    task.notes && 'Has notes',
  ]
    .filter(Boolean)
    .join('. ');

  // Tap completes; swipe right completes (or, once done, marks it not done); swipe
  // left postpones; long press edits. In Edit mode (reordering) a tap edits instead
  // and the gestures are off, so a drag can never complete a task.
  const [arriving] = useState(() => justArrived(task));
  const toggle = () => {
    toggledAt.set(task.id, Date.now());
    onToggle(task.id, !done);
  };
  const { rowRef, surfaceRef, rowProps } = useSwipeRow({
    enabled: !editing,
    onLongPress: () => onEdit(task.id),
    onSwipeRight: toggle,
    onSwipeLeft: !done && onPostpone ? () => onPostpone(task.id) : undefined,
  });

  return (
    <li
      ref={rowRef}
      className={cx(
        'task-row swipe-row',
        done && 'is-done',
        task.priority && `is-priority-${task.priority}`,
        editing && 'has-handle',
        arriving && 'is-arriving',
      )}
      data-reorder-id={task.id}
      {...rowProps}
    >
      <span className="swipe-actions" aria-hidden="true">
        <span className="swipe-action is-right">
          {done ? <Undo2 size={18} strokeWidth={2.2} /> : <Check size={18} strokeWidth={2.4} />}
          {done ? 'Not done' : 'Done'}
        </span>
        <span className="swipe-action is-left">
          Postpone
          <CalendarClock size={18} strokeWidth={2.1} />
        </span>
      </span>
      <div ref={surfaceRef} className="task-row-surface swipe-surface">
        <button
          type="button"
          className="task-row-main"
          aria-pressed={editing ? undefined : done}
          aria-label={editing ? `Edit ${task.name}. ${details}` : `${task.name}. ${details}`}
          aria-describedby={editing ? undefined : hintId}
          onClick={() => {
            if (editing) {
              onEdit(task.id);
              return;
            }
            tapFeedback();
            toggle();
          }}
        >
          <span className={cx('check task-row-check', done && 'is-done')} aria-hidden="true">
            <svg className="check-mark" viewBox="0 0 16 16">
              <path d="M4 8.4 6.8 11.2 12 5" pathLength="1" />
            </svg>
          </span>
          <span className="task-row-text">
            <span className="task-row-name">{task.name}</span>
            {(due || listName || task.notes) && (
              <span className="task-row-meta" aria-hidden="true">
                {due && (
                  <span className={cx('task-row-due', overdue && 'is-overdue')}>
                    <CalendarDays size={12} strokeWidth={2.1} />
                    {due}
                  </span>
                )}
                {listName && (
                  <span className="task-row-list">
                    <List size={12} strokeWidth={2.1} />
                    {listName}
                  </span>
                )}
                {task.notes && <NotebookText size={13} strokeWidth={2} className="task-row-notes" />}
              </span>
            )}
          </span>
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
      </div>
    </li>
  );
});

/** One list (pending or completed); each reorders only within itself. */
function TaskRows({ tasks, todayKey, minute, listNames, hintId, onToggle, onEdit, onPostpone, onReorder, editing }) {
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
          listName={task.listId ? listNames?.get(task.listId) : undefined}
          hintId={hintId}
          onToggle={onToggle}
          onEdit={onEdit}
          onPostpone={onPostpone}
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
 * `onPostpone(id)` enables swiping left; `listNames` (id → name) shows each task's list.
 */
export function TaskList({
  tasks,
  todayKey,
  onToggle,
  onEdit,
  onPostpone,
  onReorder,
  listNames,
  editing = false,
  title = 'To do',
  completedTitle = 'Completed',
  headingLevel = 2,
  emptyState,
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const { pending, completed } = useMemo(() => splitTasks(tasks), [tasks]);
  const [showCompleted, setShowCompleted] = useState(true);
  const completedId = useId();
  const pendingTitleId = useId();
  const doneTitleId = useId();
  const hintId = useId();
  // Minute resolution keeps rows memoisable; overdue-by-time refreshes on the next render.
  const minute = Math.floor(Date.now() / 60000);

  if (tasks.length === 0) return emptyState;

  const rows = { todayKey, minute, listNames, hintId, onToggle, onEdit, onPostpone, onReorder, editing };
  return (
    <>
      <p id={hintId} className="sr-only">
        {onPostpone
          ? 'Tap to mark done or not done. Long press to edit. Swipe right to complete, or left to postpone.'
          : 'Tap to mark done or not done. Long press to edit. Swipe right to complete.'}
      </p>
      <section className="m-section task-section" aria-labelledby={pendingTitleId}>
        <Heading id={pendingTitleId} className="m-section-title">
          {editing ? `${title} · drag to reorder` : title} <span className="task-section-count tabular">{pending.length}</span>
        </Heading>
        {pending.length === 0 ? (
          <p className="m-card task-all-done">All caught up. Nothing left to do.</p>
        ) : (
          <TaskRows tasks={pending} {...rows} />
        )}
      </section>

      {completed.length > 0 && (
        <section className="m-section task-section" aria-labelledby={doneTitleId}>
          <Heading id={doneTitleId} className="m-section-title">
            <button
              type="button"
              className="task-section-toggle"
              aria-expanded={showCompleted}
              aria-controls={completedId}
              onClick={() => setShowCompleted((value) => !value)}
            >
              {completedTitle} <span className="task-section-count tabular">{completed.length}</span>
              <ChevronDown size={15} strokeWidth={2} aria-hidden="true" className="task-section-chevron" />
            </button>
          </Heading>
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
