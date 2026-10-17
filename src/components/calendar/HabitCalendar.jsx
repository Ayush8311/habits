import { useMemo } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { formatMonthYear, formatWeekRange, getMonthDays, getMonthOf, getWeekDays } from '../../lib/dates.js';
import { eligibleKeys, getHabitProgress, getHabitStreaks } from '../../lib/stats.js';
import { EmptyState } from '../EmptyState.jsx';
import { Button, IconButton } from '../ui/Button.jsx';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { CalendarGrid } from './CalendarGrid.jsx';
import { Legend } from './Legend.jsx';
import { WeekList } from './WeekList.jsx';
import './HabitCalendar.css';

const VIEW_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function HabitCalendar({
  habits,
  completions,
  todayKey,
  cursorKey,
  view,
  isCompact,
  direction,
  onViewChange,
  onShiftWeek,
  onToggle,
  onEditHabit,
  onAddHabit,
}) {
  const { year, monthIndex } = getMonthOf(cursorKey);
  const monthDays = useMemo(() => getMonthDays(year, monthIndex), [year, monthIndex]);
  const weekDays = useMemo(() => getWeekDays(cursorKey), [cursorKey]);
  const days = view === 'week' ? weekDays : monthDays;

  // Row statistics always describe the selected month, whichever view is showing.
  const monthKeys = useMemo(() => eligibleKeys(monthDays.map((day) => day.key), todayKey), [monthDays, todayKey]);
  const habitStats = useMemo(
    () =>
      Object.fromEntries(
        habits.map((habit) => [
          habit.id,
          {
            progress: getHabitProgress(habit, completions, monthKeys),
            streak: getHabitStreaks(habit.id, completions, todayKey),
          },
        ]),
      ),
    [habits, completions, monthKeys, todayKey],
  );

  const weekLabel = formatWeekRange(weekDays[0].key);
  const caption = view === 'week' ? `Week of ${weekLabel}` : formatMonthYear(cursorKey);
  const shared = { habits, completions, days, todayKey, habitStats, onToggle, onEditHabit };

  return (
    <section className="card calendar" aria-labelledby="calendar-title">
      <div className="calendar-toolbar">
        <div>
          <h2 id="calendar-title" className="section-title">
            Habits
          </h2>
          <p className="section-subtitle">
            {habits.length === 0 ? 'Nothing tracked yet' : `${habits.length} tracked · ${caption}`}
          </p>
        </div>
        <div className="calendar-toolbar-actions">
          {view === 'week' && (
            <div className="week-nav" role="group" aria-label="Change week">
              <IconButton icon={ChevronLeft} label="Previous week" size="sm" onClick={() => onShiftWeek(-1)} />
              <span className="week-nav-label tabular" aria-live="polite">
                {weekLabel}
              </span>
              <IconButton icon={ChevronRight} label="Next week" size="sm" onClick={() => onShiftWeek(1)} />
            </div>
          )}
          <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={onViewChange} label="Calendar view" />
        </div>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Start with one habit"
          message="Pick something small you want to do most days. You can add more whenever you like."
          action={
            <Button variant="primary" icon={Plus} onClick={onAddHabit}>
              Add a habit
            </Button>
          }
        />
      ) : (
        <div key={`${view}-${days[0].key}`} className={`calendar-body slide-${direction}`}>
          {view === 'week' && isCompact ? (
            <WeekList {...shared} />
          ) : (
            <CalendarGrid {...shared} caption={caption} wide={view === 'week'} />
          )}
        </div>
      )}

      {habits.length > 0 && (
        <div className="calendar-footer">
          <Legend />
          <Button variant="ghost" size="sm" icon={Plus} onClick={onAddHabit}>
            Add habit
          </Button>
        </div>
      )}
    </section>
  );
}
