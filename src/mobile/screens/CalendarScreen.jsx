import { useMemo } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { WeekList } from '../../components/calendar/WeekList.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import {
  addDays,
  formatFullDate,
  formatMonthYear,
  formatWeekRange,
  getMonthDays,
  getMonthOf,
  getWeekDays,
  getWeekStart,
  isSameMonth,
  shiftMonth,
} from '../../lib/dates.js';
import {
  countApplicableOn,
  countCompletedOn,
  eligibleKeys,
  getHabitProgress,
  getHabitStreaks,
  getTrackingStart,
  isApplicable,
} from '../../lib/stats.js';
import { HabitCheckRow } from '../HabitCheckRow.jsx';
import { MonthHeatmap } from '../MonthHeatmap.jsx';
import { ScreenHeader } from '../ScreenHeader.jsx';
import './CalendarScreen.css';

const VIEW_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

function DayDetail({ store, dateKey, todayKey }) {
  const { habits, completions } = store.state;
  const future = dateKey > todayKey;
  const done = countCompletedOn(habits, completions, dateKey);
  const tracked = countApplicableOn(habits, completions, dateKey);

  return (
    <section className="m-section" aria-labelledby="day-detail-title" aria-live="polite">
      <div className="day-detail-heading">
        <h2 id="day-detail-title" className="day-detail-title">
          {dateKey === todayKey ? 'Today' : formatFullDate(dateKey)}
        </h2>
        <p className="day-detail-count">{future ? 'Upcoming' : `${done} of ${tracked} done`}</p>
      </div>
      <ul className="m-card check-list">
        {habits.map((habit) => {
          const isDone = completions[habit.id]?.[dateKey] === true;
          const streak = getHabitStreaks(habit, completions, todayKey);
          const expected = isApplicable(habit, completions, dateKey);
          const start = getTrackingStart(habit, completions);
          const why = start && dateKey < start ? 'Before this habit started' : 'Not scheduled';
          return (
            <HabitCheckRow
              key={habit.id}
              habit={habit}
              done={isDone}
              disabled={future}
              unscheduled={!expected && !future}
              dateLabel={formatFullDate(dateKey)}
              streakCurrent={streak.current}
              streakBest={streak.best}
              metaText={future ? 'Upcoming' : expected ? (isDone ? 'Completed' : 'Not completed') : isDone ? `Completed · ${why.toLowerCase()}` : why}
              onToggle={(id) => store.toggleCompletion(id, dateKey)}
            />
          );
        })}
      </ul>
      {!future && dateKey !== todayKey && <p className="m-footnote">Tap a habit to correct this day’s record.</p>}
    </section>
  );
}

export function CalendarScreen({
  store,
  todayKey,
  cursorKey,
  onCursorChange,
  view,
  onViewChange,
  onEditHabit,
  onAddHabit,
}) {
  const { habits, completions } = store.state;
  const isWeek = view === 'week';

  const weekDays = useMemo(() => getWeekDays(cursorKey), [cursorKey]);
  const { year, monthIndex } = getMonthOf(cursorKey);
  const monthKeys = useMemo(
    () => eligibleKeys(getMonthDays(year, monthIndex).map((day) => day.key), todayKey),
    [year, monthIndex, todayKey],
  );
  const habitStats = useMemo(
    () =>
      Object.fromEntries(
        habits.map((habit) => [
          habit.id,
          {
            progress: getHabitProgress(habit, completions, monthKeys),
            streak: getHabitStreaks(habit, completions, todayKey),
          },
        ]),
      ),
    [habits, completions, monthKeys, todayKey],
  );

  const showingToday = isWeek ? getWeekStart(cursorKey) === getWeekStart(todayKey) : cursorKey === todayKey;

  const step = (delta) => {
    if (isWeek) {
      onCursorChange(addDays(cursorKey, delta * 7));
      return;
    }
    const target = shiftMonth(cursorKey, delta);
    onCursorChange(isSameMonth(target, todayKey) ? todayKey : target);
  };

  return (
    <div className="calendar-screen">
      <ScreenHeader
        eyebrow="Calendar"
        title={formatMonthYear(cursorKey)}
        actions={
          !showingToday && (
            <Button variant="tertiary" onClick={() => onCursorChange(todayKey)}>
              Today
            </Button>
          )
        }
      />

      <div className="calendar-controls">
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={onViewChange} label="Calendar view" />
        <div className="calendar-stepper" role="group" aria-label={isWeek ? 'Change week' : 'Change month'}>
          <IconButton
            icon={ChevronLeft}
            label={isWeek ? 'Previous week' : 'Previous month'}
            variant="surface"
            size="lg"
            onClick={() => step(-1)}
          />
          {isWeek && <span className="calendar-stepper-label tabular">{formatWeekRange(weekDays[0].key)}</span>}
          <IconButton
            icon={ChevronRight}
            label={isWeek ? 'Next week' : 'Next month'}
            variant="surface"
            size="lg"
            onClick={() => step(1)}
          />
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="m-card">
          <EmptyState
            icon={CalendarPlus}
            title="No habits yet"
            message="Add a habit and your history will build up here."
            action={
              <Button variant="primary" icon={Plus} onClick={onAddHabit}>
                Add a habit
              </Button>
            }
          />
        </div>
      ) : isWeek ? (
        <div key={weekDays[0].key} className="m-card calendar-week slide-none">
          <WeekList
            habits={habits}
            completions={completions}
            days={weekDays}
            todayKey={todayKey}
            habitStats={habitStats}
            onToggle={store.toggleCompletion}
            onEditHabit={onEditHabit}
          />
        </div>
      ) : (
        <>
          <div key={`${year}-${monthIndex}`} className="m-card calendar-month slide-none">
            <MonthHeatmap
              habits={habits}
              completions={completions}
              cursorKey={cursorKey}
              todayKey={todayKey}
              onSelect={onCursorChange}
            />
          </div>
          <DayDetail store={store} dateKey={cursorKey} todayKey={todayKey} />
        </>
      )}
    </div>
  );
}
