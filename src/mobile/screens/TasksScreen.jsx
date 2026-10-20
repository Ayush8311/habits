import { useMemo, useState } from 'react';
import { ChevronLeft, Inbox, List, ListPlus, ListTodo, Pencil, Plus, SunMedium } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState.jsx';
import { TaskList } from '../../components/tasks/TaskList.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { cx } from '../../lib/classNames.js';
import { generalTasks, tasksInList, todaysTasks } from '../../lib/tasks.js';
import { ScreenHeader } from '../ScreenHeader.jsx';
import './TasksScreen.css';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Tasks that aren't in any of the user's lists (all tasks saved before lists existed).
export const INBOX = 'inbox';

function summarise(tasks) {
  const done = tasks.filter((task) => task.completedAt !== null).length;
  const pending = tasks.length - done;
  if (tasks.length === 0) return { text: 'No tasks', done, total: 0 };
  if (pending === 0) return { text: 'All done', done, total: tasks.length };
  return { text: `${pending} to do${done > 0 ? ` · ${done} done` : ''}`, done, total: tasks.length };
}

function ListCard({ id, icon: Icon, name, tasks, onOpen }) {
  const summary = summarise(tasks);
  return (
    <li>
      <button
        type="button"
        className="list-card m-card"
        data-list-card={id}
        onClick={(event) => onOpen(id, event.currentTarget)}
        aria-label={`${name}. ${summary.text}. Open list`}
      >
        <span className="list-card-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={2} />
        </span>
        <span className="list-card-name">{name}</span>
        <span className="list-card-summary tabular" aria-hidden="true">
          {summary.text}
        </span>
        <span className="list-card-bar" aria-hidden="true">
          <span style={{ '--done': summary.total ? summary.done / summary.total : 0 }} />
        </span>
      </button>
    </li>
  );
}

/**
 * The Tasks page: the Inbox section (Today, then General Tasks), then the user's
 * other lists as cards. Today gathers the tasks due today from every list; General
 * Tasks are the ones in no list. Both are views of the same stored tasks, so a
 * change made anywhere shows everywhere, and no task is moved or copied.
 */
function TasksHome({ store, todayKey, listNames, onEditTask, onPostponeTask, onOpenList, onNewList }) {
  const { tasks } = store.state;
  const lists = store.state.taskLists ?? [];
  const [editing, setEditing] = useState(false);
  const today = useMemo(() => todaysTasks(tasks, todayKey), [tasks, todayKey]);
  const general = useMemo(() => generalTasks(tasks, todayKey), [tasks, todayKey]);
  const isEditing = editing && (today.length > 0 || general.length > 0);
  const pending = today.filter((task) => task.completedAt === null).length;
  const rows = {
    todayKey,
    onToggle: store.setTaskCompleted,
    onEdit: onEditTask,
    onPostpone: onPostponeTask,
    onReorder: store.reorderTasks,
    editing: isEditing,
    headingLevel: 3,
  };

  return (
    <>
      <ScreenHeader
        eyebrow={today.length === 0 ? 'Nothing due today' : pending === 0 ? 'All done for today' : `${plural(pending, 'task')} for today`}
        title="Tasks"
        actions={
          (today.length > 0 || general.length > 0) && (
            <Button variant="tertiary" onClick={() => setEditing((value) => !value)}>
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          )
        }
      />

      <section className="m-section tasks-inbox" aria-labelledby="tasks-inbox-title">
        <h2 id="tasks-inbox-title" className="tasks-inbox-title">
          <span className="tasks-inbox-icon" aria-hidden="true">
            <Inbox size={18} strokeWidth={2} />
          </span>
          Inbox
        </h2>

        <div className="tasks-today">
          <TaskList
            {...rows}
            tasks={today}
            listNames={listNames}
            title="Today"
            completedTitle="Done today"
            emptyState={
              <section className="m-section" aria-labelledby="tasks-today-empty">
                <h3 id="tasks-today-empty" className="m-section-title">
                  Today
                </h3>
                <div className="m-card tasks-today-empty">
                  <SunMedium size={18} strokeWidth={1.9} aria-hidden="true" />
                  <span>Nothing due today. Tasks from any list with today’s date show up here.</span>
                </div>
              </section>
            }
          />
        </div>

        <div className="tasks-general">
          <TaskList
            {...rows}
            tasks={general}
            title="General Tasks"
            emptyState={
              <section className="m-section" aria-labelledby="tasks-general-empty">
                <h3 id="tasks-general-empty" className="m-section-title">
                  General Tasks
                </h3>
                <div className="m-card tasks-today-empty">
                  <Inbox size={18} strokeWidth={1.9} aria-hidden="true" />
                  <span>No general tasks. Tasks you add without a list go here.</span>
                </div>
              </section>
            }
          />
        </div>
      </section>

      <section className="m-section tasks-lists" aria-labelledby="tasks-lists-title">
        <div className="tasks-lists-head">
          <h2 id="tasks-lists-title" className="m-section-title">
            Other task lists
          </h2>
          {lists.length > 0 && (
            <Button variant="tertiary" size="sm" icon={ListPlus} onClick={() => onNewList()}>
              New list
            </Button>
          )}
        </div>
        {lists.length === 0 ? (
          <div className="m-card tasks-lists-empty">
            <EmptyState
              icon={ListTodo}
              title="No lists yet"
              message="Make a list for each part of life, like Errands, Work or Groceries."
              action={
                <Button variant="primary" icon={ListPlus} onClick={() => onNewList()}>
                  Create your first list
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="list-grid">
            {lists.map((list) => (
              <ListCard key={list.id} id={list.id} icon={List} name={list.name} tasks={tasksInList(tasks, list.id)} onOpen={onOpenList} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** One list's tasks, opened from its card. Back (and Android Back) returns to Tasks. */
function ListView({ store, todayKey, listId, name, onAddTask, onEditTask, onPostponeTask, onOpenList, onEditList }) {
  const tasks = useMemo(() => tasksInList(store.state.tasks, listId === INBOX ? null : listId), [store.state.tasks, listId]);
  const [editing, setEditing] = useState(false);
  const isEditing = editing && tasks.length > 0;
  const pending = tasks.filter((task) => task.completedAt === null).length;
  const custom = listId !== INBOX;

  return (
    <>
      <button
        type="button"
        className="tasks-back"
        data-android-back
        onClick={() => onOpenList(null, document.getElementById('m-screen'))}
      >
        <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
        Tasks
      </button>
      <ScreenHeader
        eyebrow={tasks.length === 0 ? (custom ? 'List' : 'Tasks in no list') : pending === 0 ? 'All done' : `${plural(pending, 'task')} to do`}
        title={name}
        actions={
          <>
            {tasks.length > 0 && (
              <Button variant="tertiary" onClick={() => setEditing((value) => !value)}>
                {isEditing ? 'Done' : 'Edit'}
              </Button>
            )}
            {custom && <IconButton icon={Pencil} label={`Rename or delete ${name}`} variant="surface" onClick={() => onEditList(listId)} />}
          </>
        }
      />
      <TaskList
        tasks={tasks}
        todayKey={todayKey}
        onToggle={store.setTaskCompleted}
        onEdit={onEditTask}
        onPostpone={onPostponeTask}
        onReorder={store.reorderTasks}
        editing={isEditing}
        emptyState={
          <div className="m-card">
            <EmptyState
              icon={ListTodo}
              title="No tasks in this list"
              message="Tasks you add here stay in this list."
              action={
                <Button variant="primary" icon={Plus} onClick={() => onAddTask(custom ? listId : undefined)}>
                  Add a task
                </Button>
              }
            />
          </div>
        }
      />
    </>
  );
}

/**
 * The Tasks page (Separate pages layout): Today's tasks, then the task lists. A
 * list card opens that list (`openList`, kept by MobileApp so it survives switching
 * pages). One-off tasks never affect habits or their statistics.
 */
export function TasksScreen({
  store,
  todayKey,
  openList,
  onOpenList,
  onAddTask,
  onEditTask,
  onPostponeTask,
  onNewList,
  onEditList,
}) {
  const lists = store.state.taskLists ?? [];
  const listNames = useMemo(() => new Map(lists.map((list) => [list.id, list.name])), [lists]);
  const current = openList === INBOX ? { id: INBOX, name: 'Inbox' } : lists.find((list) => list.id === openList);

  return (
    <div className={cx('tasks-screen', current && 'is-list')}>
      {current ? (
        <ListView
          key={current.id}
          store={store}
          todayKey={todayKey}
          listId={current.id}
          name={current.name}
          onAddTask={onAddTask}
          onEditTask={onEditTask}
          onPostponeTask={onPostponeTask}
          onOpenList={onOpenList}
          onEditList={onEditList}
        />
      ) : (
        <TasksHome
          store={store}
          todayKey={todayKey}
          listNames={listNames}
          onEditTask={onEditTask}
          onPostponeTask={onPostponeTask}
          onOpenList={onOpenList}
          onNewList={onNewList}
        />
      )}
    </div>
  );
}
