import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ListTodo, Plus, Sparkles, SunMedium } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ProgressRing } from '../../components/ProgressRing.jsx';
import { TaskList } from '../../components/tasks/TaskList.jsx';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useReorder } from '../../hooks/useReorder.js';
import { formatFullDateWithYear, parseDateKey } from '../../lib/dates.js';
import { buildTodayInsight } from '../../lib/insights.js';
import { getCombinedOrder } from '../../lib/preferences.js';
import { countCompletedOn, getApplicableHabits, getHabitStreaks, getWeekComparison } from '../../lib/stats.js';
import { HabitCheckRow } from '../HabitCheckRow.jsx';
import { ScreenHeader } from '../ScreenHeader.jsx';
import './TodayScreen.css';

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/**
 * Combined-page header: date (opens the calendar) · fixed-size progress · Edit.
 * The ring is a fixed 44px in its own grid column, so nothing moves as it fills.
 */
function CompactHeader({ todayKey, done, total, editing, canEdit, onToggleEdit, onOpenCalendar }) {
  const date = parseDateKey(todayKey);
  const rate = total > 0 ? done / total : null;
  return (
    <header className="home-header">
      <button
        type="button"
        className="home-date"
        onClick={onOpenCalendar}
        aria-label={`${formatFullDateWithYear(todayKey)}. Open calendar`}
      >
        <CalendarDays size={20} strokeWidth={1.9} aria-hidden="true" />
        <span className="home-date-text">
          <span className="home-date-weekday">{weekdayFormat.format(date)}</span>
          <span className="home-date-day">{dateFormat.format(date)}</span>
        </span>
      </button>
      <ProgressRing
        className="home-progress"
        value={rate}
        size={44}
        stroke={4.5}
        label={total > 0 ? `${done} of ${total} habits done today` : 'No habits scheduled today'}
      />
      <div className="home-edit">
        {canEdit && (
          <Button variant="tertiary" onClick={onToggleEdit}>
            {editing ? 'Done' : 'Edit'}
          </Button>
        )}
      </div>
    </header>
  );
}

/** The habit list (both layouts). Rows are memoised; callbacks are stable. */
function HabitsSection({ store, todayKey, habits, completions, dueToday, isEditing, onAddHabit, onEditHabit }) {
  const { toggleCompletion, setCompletion, reorderHabits } = store; // stable functions
  const toggle = useCallback((habitId) => toggleCompletion(habitId, todayKey), [toggleCompletion, todayKey]);
  const setDone = useCallback((habitId, done) => setCompletion(habitId, todayKey, done), [setCompletion, todayKey]);
  const hintId = useId();
  const habitIds = useMemo(() => habits.map((habit) => habit.id), [habits]);
  const reorder = useReorder({ ids: habitIds, onReorder: reorderHabits });
  const streaks = useMemo(
    () => Object.fromEntries(habits.map((habit) => [habit.id, getHabitStreaks(habit, completions, todayKey)])),
    [habits, completions, todayKey],
  );

  return (
    <section className="m-section home-habits" id="home-habits" aria-labelledby="today-habits-title">
      <p id={hintId} className="sr-only">
        Tap to mark done or not done for today. Long press to edit. Swipe right to mark done, or left to undo.
      </p>
      <h2 id="today-habits-title" className="m-section-title">
        {isEditing ? 'Habits · tap to edit, drag to reorder' : 'Habits'}
      </h2>
      {habits.length === 0 ? (
        <div className="m-card">
          <EmptyState
            icon={SunMedium}
            title="Nothing to track yet"
            message="Add one small habit you’d like to do most days."
            action={
              <Button variant="primary" icon={Plus} onClick={() => onAddHabit()}>
                Add a habit
              </Button>
            }
          />
        </div>
      ) : (
        <ul ref={reorder.listRef} className="m-card check-list">
          {habits.map((habit) => {
            const isDone = completions[habit.id]?.[todayKey] === true;
            const scheduled = dueToday.has(habit.id);
            return (
              <HabitCheckRow
                key={habit.id}
                habit={habit}
                done={isDone}
                unscheduled={!scheduled}
                metaText={
                  scheduled || isEditing ? undefined : isDone ? 'Done · not scheduled today' : 'Not scheduled today'
                }
                streakCurrent={streaks[habit.id].current}
                streakBest={streaks[habit.id].best}
                mode={isEditing ? 'edit' : 'toggle'}
                onToggle={toggle}
                onSetDone={setDone}
                onEdit={onEditHabit}
                hintId={hintId}
                reorder={isEditing ? reorder : undefined}
              />
            );
          })}
        </ul>
      )}
      {isEditing && (
        <button type="button" className="today-add-row" onClick={() => onAddHabit()}>
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
          Add habit
        </button>
      )}
    </section>
  );
}

/**
 * The Habit page ('today'; called Duel on the Combined page). In the Separate
 * layout: the original header and summary card, then habits.
 * In the Combined layout: a compact header, habits, then tasks on the same page.
 */
export function TodayScreen({
  store,
  todayKey,
  layout = 'separate',
  onAddHabit,
  onEditHabit,
  onAddTask,
  onEditTask,
  onPostponeTask,
  onOpenCalendar,
  scrollToTasks = false,
}) {
  const { habits, completions, tasks, preferences } = store.state;
  const combined = layout === 'combined';
  const tasksFirst = combined && getCombinedOrder(preferences) === 'tasks-first';
  const [editing, setEditing] = useState(false);
  const isEditing = editing && (habits.length > 0 || (combined && tasks.length > 0));
  const tasksRef = useRef(null);

  // Progress counts the habits expected today (scheduled, and already created).
  const dueToday = useMemo(
    () => new Set(getApplicableHabits(habits, completions, todayKey).map((habit) => habit.id)),
    [habits, completions, todayKey],
  );
  const done = countCompletedOn(habits, completions, todayKey);
  const total = dueToday.size;
  const insight = useMemo(
    () =>
      combined
        ? null
        : buildTodayInsight({ habits, completions, todayKey, week: getWeekComparison(habits, completions, todayKey) }),
    [combined, habits, completions, todayKey],
  );

  // A #/tasks link in the Combined layout lands here, on the Tasks section.
  useEffect(() => {
    if (combined && scrollToTasks) tasksRef.current?.scrollIntoView({ block: 'start' });
  }, [combined, scrollToTasks]);

  const toggleEdit = () => setEditing((value) => !value);

  const habitsSection = (
    <HabitsSection
      store={store}
      todayKey={todayKey}
      habits={habits}
      completions={completions}
      dueToday={dueToday}
      isEditing={isEditing && habits.length > 0}
      onAddHabit={onAddHabit}
      onEditHabit={onEditHabit}
    />
  );
  // Combined page only; its order comes from Settings → Combined page order.
  const tasksSection = combined && (
    <div ref={tasksRef} className="home-tasks" id="home-tasks">
      <TaskList
        tasks={tasks}
        todayKey={todayKey}
        onToggle={store.setTaskCompleted}
        onEdit={onEditTask}
        onPostpone={onPostponeTask}
        onReorder={store.reorderTasks}
        editing={isEditing}
        title="Tasks"
        emptyState={
          <section className="m-section" aria-labelledby="home-tasks-empty">
            <h2 id="home-tasks-empty" className="m-section-title">
              Tasks
            </h2>
            <div className="m-card home-tasks-empty">
              <ListTodo size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>No tasks yet. Swipe the bar right, or</span>
              <Button variant="tertiary" size="sm" onClick={() => onAddTask()}>
                add a task
              </Button>
            </div>
          </section>
        }
      />
    </div>
  );

  return (
    <div className={combined ? 'today is-combined' : 'today'}>
      {combined ? (
        <>
        {/* The page's name for assistive technology; the compact header shows the date. */}
        <h1 className="sr-only">Duel</h1>
        <CompactHeader
          todayKey={todayKey}
          done={done}
          total={total}
          editing={isEditing}
          canEdit={habits.length > 0 || tasks.length > 0}
          onToggleEdit={toggleEdit}
          onOpenCalendar={onOpenCalendar}
        />
        </>
      ) : (
        <>
          <ScreenHeader
            eyebrow={formatFullDateWithYear(todayKey)}
            wideEyebrow
            title="Habit"
            actions={
              habits.length > 0 && (
                <Button variant="tertiary" onClick={toggleEdit}>
                  {isEditing ? 'Done' : 'Edit'}
                </Button>
              )
            }
          />

          <section className="m-card today-summary" aria-label="Today’s progress">
            <ProgressRing value={total ? done / total : null} size={96} stroke={9} />
            <div className="today-summary-text">
              <p className="today-greeting">Make today count.</p>
              <p className="today-count">
                {total === 0 && habits.length > 0 ? (
                  'Rest day'
                ) : (
                  <>
                    <AnimatedNumber value={done} />
                    <span className="today-count-total"> of {total} done</span>
                  </>
                )}
              </p>
              <p className="today-insight" aria-live="polite">
                <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
                {insight}
              </p>
            </div>
          </section>
        </>
      )}

      {tasksFirst ? (
        <>
          {tasksSection}
          {habitsSection}
        </>
      ) : (
        <>
          {habitsSection}
          {tasksSection}
        </>
      )}
    </div>
  );
}
