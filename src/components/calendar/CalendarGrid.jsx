import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../lib/classNames.js';
import { formatFullDate, formatWeekday } from '../../lib/dates.js';
import { getDailySeries } from '../../lib/stats.js';
import { HabitRow } from './HabitRow.jsx';
import './CalendarGrid.css';

function lastEligibleIndex(days, todayKey) {
  let last = -1;
  days.forEach((day, index) => {
    if (day.key <= todayKey) last = index;
  });
  return last;
}

function DayMeter({ day, isToday }) {
  return (
    <span
      className={cx('meter', isToday && 'is-today')}
      role="img"
      aria-label={`${formatFullDate(day.key)}: ${day.done} of ${day.total} habits completed`}
      title={`${day.done} of ${day.total}`}
    >
      <span className="meter-fill" style={{ transform: `scaleY(${day.rate ?? 0})` }} />
    </span>
  );
}

/**
 * Habits as rows and days as columns. Only one check button is in the tab
 * order at a time; arrow keys, Home and End move between days and habits.
 */
export function CalendarGrid({ habits, completions, days, todayKey, habitStats, caption, wide, onToggle, onEditHabit }) {
  const scrollRef = useRef(null);
  const tableRef = useRef(null);
  const [focused, setFocused] = useState(null);

  const series = useMemo(() => getDailySeries(habits, completions, days), [habits, completions, days]);
  const lastEligible = lastEligibleIndex(days, todayKey);
  const todayIndex = days.findIndex((day) => day.key === todayKey);
  const defaultCol = todayIndex >= 0 ? todayIndex : Math.max(lastEligible, 0);

  const activeCell = {
    row: Math.min(focused?.row ?? 0, habits.length - 1),
    col: focused && focused.col <= lastEligible ? focused.col : defaultCol,
  };

  const updateScrollShadow = () => {
    const element = scrollRef.current;
    if (element) element.toggleAttribute('data-scrolled', element.scrollLeft > 1);
  };

  // When the month doesn't fit, start with today's column in view.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || element.scrollWidth <= element.clientWidth) return;
    const todayHead = element.querySelector('.day-head.is-today');
    if (!todayHead) return;
    const sticky = element.querySelector('.grid-corner')?.offsetWidth ?? 0;
    const visible = element.clientWidth - sticky;
    element.scrollLeft = todayHead.offsetLeft - sticky - visible / 2 + todayHead.offsetWidth / 2;
    updateScrollShadow();
  }, []);

  const onKeyDown = (event) => {
    const cell = event.target.dataset?.cell;
    if (!cell) return;
    const [row, col] = cell.split(':').map(Number);
    const moves = {
      ArrowRight: [row, col + 1],
      ArrowLeft: [row, col - 1],
      ArrowDown: [row + 1, col],
      ArrowUp: [row - 1, col],
      Home: [row, 0],
      End: [row, lastEligible],
    };
    const target = moves[event.key];
    if (!target) return;
    event.preventDefault();
    const button = tableRef.current.querySelector(`[data-cell="${target[0]}:${target[1]}"]`);
    if (button && !button.disabled) button.focus();
  };

  return (
    <div className="grid-scroll" ref={scrollRef} onScroll={updateScrollShadow}>
      <table
        ref={tableRef}
        className={cx('grid', wide && 'grid-wide')}
        style={{ '--day-count': days.length }}
        onKeyDown={onKeyDown}
      >
        <caption className="sr-only">{caption}. Use the arrow keys to move between days and habits.</caption>
        <colgroup>
          <col className="grid-col-habit" />
          {days.map((day) => (
            <col key={day.key} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="grid-corner">
              <span className="sr-only">Habit</span>
            </th>
            {days.map((day) => (
              <th
                key={day.key}
                scope="col"
                className={cx('day-head', day.isWeekend && 'is-weekend', day.key === todayKey && 'is-today')}
              >
                <span className="sr-only">{formatFullDate(day.key)}</span>
                <span className="day-head-weekday" aria-hidden="true">
                  {formatWeekday(day.key, wide ? 'short' : 'narrow')}
                </span>
                <span className="day-head-number" aria-hidden="true">
                  {day.day}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map((habit, row) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              row={row}
              days={days}
              todayKey={todayKey}
              record={completions[habit.id]}
              stats={habitStats[habit.id]}
              activeCell={activeCell}
              buttonSize={wide ? 'lg' : 'md'}
              onToggle={onToggle}
              onEdit={() => onEditHabit(habit.id)}
              onFocusCell={(r, c) => setFocused({ row: r, col: c })}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="grid-foot-label">
              Daily
            </th>
            {series.map((day) => (
              <td
                key={day.key}
                className={cx('grid-foot-cell', day.isWeekend && 'is-weekend', day.key === todayKey && 'is-today')}
              >
                {day.key <= todayKey && <DayMeter day={day} isToday={day.key === todayKey} />}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
