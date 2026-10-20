import { useRef } from 'react';
import { cx } from '../lib/classNames.js';
import { addDays, formatFullDate, formatMonthYear, getMonthDays, getMonthOf, isSameMonth } from '../lib/dates.js';
import { getCalendarDay } from '../lib/stats.js';
import './MonthHeatmap.css';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/**
 * A Monday-first month where each day is a rounded square shaded by the share
 * of habits completed. Arrow keys move the selection within the month.
 */
export function MonthHeatmap({ habits, completions, cursorKey, todayKey, onSelect }) {
  const gridRef = useRef(null);
  const { year, monthIndex } = getMonthOf(cursorKey);
  // Every recorded check-in shows, on any past day (see getCalendarDay).
  const days = getMonthDays(year, monthIndex).map((day) => ({ ...day, ...getCalendarDay(habits, completions, day.key) }));
  const leadingBlanks = (days[0].weekday + 6) % 7;

  const onKeyDown = (event) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    const target = addDays(cursorKey, step);
    if (!isSameMonth(target, cursorKey)) return;
    event.preventDefault();
    onSelect(target);
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-key="${target}"]`)?.focus());
  };

  return (
    <div className="heatmap">
      <div className="heatmap-row heatmap-weekdays" aria-hidden="true">
        {WEEKDAYS.map((letter, index) => (
          <span key={index} className={index >= 5 ? 'is-weekend' : undefined}>
            {letter}
          </span>
        ))}
      </div>
      <div
        ref={gridRef}
        className="heatmap-row heatmap-grid"
        role="group"
        aria-label={`${formatMonthYear(cursorKey)}. Choose a day; arrow keys move between days.`}
        onKeyDown={onKeyDown}
      >
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const future = day.key > todayKey;
          const level = future || day.rate === null ? 0 : day.rate;
          const selected = day.key === cursorKey;
          return (
            <button
              key={day.key}
              type="button"
              data-key={day.key}
              className={cx(
                'heat-day',
                future && 'is-future',
                day.key === todayKey && 'is-today',
                selected && 'is-selected',
                level >= 0.6 && 'is-strong',
              )}
              style={{ '--level': `${Math.round(level * 100)}%` }}
              tabIndex={selected ? 0 : -1}
              aria-pressed={selected}
              aria-current={day.key === todayKey ? 'date' : undefined}
              aria-label={`${formatFullDate(day.key)}, ${
                future ? 'upcoming' : `${day.done} of ${day.total} habits done`
              }`}
              onClick={() => onSelect(day.key)}
            >
              {day.day}
            </button>
          );
        })}
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        <span>Less</span>
        {[0, 25, 50, 75, 100].map((level) => (
          <span key={level} className="heatmap-legend-swatch" style={{ '--level': `${level}%` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
