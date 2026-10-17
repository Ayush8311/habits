import { Flame, Pencil } from 'lucide-react';
import { toPercent } from '../../lib/stats.js';
import { HabitIcon } from './HabitIcon.jsx';
import './HabitLabel.css';

/** Habit name, monthly progress and streak; opens the editor when pressed. */
export function HabitLabel({ habit, progress, streak, onEdit }) {
  const percent = toPercent(progress.rate);
  const summary =
    progress.total === 0
      ? 'No days to track yet this month'
      : `${progress.done} of ${progress.total} days this month`;

  return (
    <button
      type="button"
      className="habit-label"
      onClick={onEdit}
      aria-label={`${habit.name}. ${summary}. Current streak ${streak.current} days, best ${streak.best}. Edit habit`}
    >
      <HabitIcon icon={habit.icon} color={habit.color} />
      <span className="habit-label-text">
        <span className="habit-label-name">{habit.name}</span>
        <span className="habit-label-meta tabular" aria-hidden="true">
          {percent === null ? '—' : `${percent}%`}
          <span className="habit-label-sep" />
          {progress.done}/{progress.total}
          {streak.current > 0 && (
            <span className="habit-label-streak" title={`Best streak: ${streak.best} days`}>
              <Flame size={12} strokeWidth={2} />
              {streak.current}
            </span>
          )}
        </span>
      </span>
      <Pencil className="habit-label-edit" size={14} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
