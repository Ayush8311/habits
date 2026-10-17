import { cx } from '../../lib/classNames.js';
import { formatFullDate, formatWeekday } from '../../lib/dates.js';
import { habitColorStyle } from '../../lib/habitOptions.js';
import { CompletionButton } from './CompletionButton.jsx';
import { HabitLabel } from './HabitLabel.jsx';
import './WeekList.css';

/** Compact week layout for phones: each habit on its own row above seven large checks. */
export function WeekList({ habits, completions, days, todayKey, habitStats, onToggle, onEditHabit }) {
  return (
    <div className="week-list">
      <div className="week-days week-list-head" aria-hidden="true">
        {days.map((day) => (
          <span
            key={day.key}
            className={cx('week-day', day.isWeekend && 'is-weekend', day.key === todayKey && 'is-today')}
          >
            <span className="week-day-name">{formatWeekday(day.key, 'narrow')}</span>
            <span className="week-day-number">{day.day}</span>
          </span>
        ))}
      </div>
      <ul className="week-items">
        {habits.map((habit) => {
          const record = completions[habit.id];
          const stats = habitStats[habit.id];
          return (
            <li key={habit.id} className="week-item">
              <HabitLabel
                habit={habit}
                progress={stats.progress}
                streak={stats.streak}
                onEdit={() => onEditHabit(habit.id)}
              />
              <div className="week-days" role="group" aria-label={`${habit.name}, this week`}>
                {days.map((day) => (
                  <CompletionButton
                    key={day.key}
                    size="fluid"
                    done={record?.[day.key] === true}
                    future={day.key > todayKey}
                    today={day.key === todayKey}
                    colorStyle={habitColorStyle(habit.color)}
                    label={`${habit.name}, ${formatFullDate(day.key)}`}
                    onToggle={() => onToggle(habit.id, day.key)}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
