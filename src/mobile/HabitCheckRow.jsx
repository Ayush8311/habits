import { memo } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Flame, GripVertical } from 'lucide-react';
import { HabitIcon } from '../components/calendar/HabitIcon.jsx';
import { habitColorStyle } from '../lib/habitOptions.js';
import { cx } from '../lib/classNames.js';
import { tapFeedback } from '../lib/haptics.js';
import './HabitCheckRow.css';

function describeStreak(current, best, done) {
  if (current > 0) return { text: `${current}-day streak`, hot: current >= 3 };
  if (best > 0) return { text: `Best ${best} ${best === 1 ? 'day' : 'days'}`, hot: false };
  return { text: done ? 'Done' : 'Not started yet', hot: false };
}

/**
 * One habit as a full-width tappable row. In `toggle` mode a tap completes or
 * un-completes it; in `edit` mode a tap opens the editor and, when `reorder` is
 * given, a drag handle (plus screen-reader Move up/down) reorders it.
 *
 * Memoised: callbacks receive the habit id and streaks arrive as numbers, so
 * checking one habit re-renders that row only, not the whole list.
 */
export const HabitCheckRow = memo(function HabitCheckRow({
  habit,
  done,
  streakCurrent = 0,
  streakBest = 0,
  metaText,
  mode = 'toggle',
  disabled = false,
  unscheduled = false,
  dateLabel,
  onToggle,
  onEdit,
  reorder,
}) {
  const meta = metaText ? { text: metaText, hot: false } : describeStreak(streakCurrent, streakBest, done);
  const editing = mode === 'edit';

  const label = editing
    ? `Edit ${habit.name}`
    : `${habit.name}${dateLabel ? `, ${dateLabel}` : ''}. ${meta.text}.${disabled ? ' Upcoming.' : ''}`;

  return (
    <li className={cx('check-row-item', editing && reorder && 'has-handle')} data-reorder-id={habit.id}>
      <button
        type="button"
        className={cx('check-row', done && 'is-done', disabled && 'is-disabled', unscheduled && 'is-unscheduled')}
        style={habitColorStyle(habit.color)}
        aria-pressed={editing || disabled ? undefined : done}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          if (editing) {
            onEdit(habit.id);
            return;
          }
          tapFeedback();
          onToggle(habit.id);
        }}
      >
        <HabitIcon icon={habit.icon} emoji={habit.emoji} color={habit.color} size="lg" />
        <span className="check-row-text">
          <span className="check-row-name">{habit.name}</span>
          <span className={cx('check-row-meta', meta.hot && 'is-hot')} aria-hidden="true">
            {/* Keyed by text: a changed label fades in instead of snapping. */}
            <span key={meta.text} className="check-row-meta-text">
              {!metaText && streakCurrent > 0 && <Flame size={12} strokeWidth={2.2} />}
              {meta.text}
            </span>
          </span>
        </span>
        {editing ? (
          !reorder && <ChevronRight className="check-row-chevron" size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <span
            className={cx('check check-row-box', done && 'is-done', disabled && 'is-future')}
            aria-hidden="true"
          >
            <svg className="check-mark" viewBox="0 0 16 16">
              <path d="M4 8.4 6.8 11.2 12 5" pathLength="1" />
            </svg>
          </span>
        )}
      </button>
      {editing && reorder && (
        <>
          <span className="reorder-handle" role="button" tabIndex={0} {...reorder.handleProps(habit.id, habit.name)}>
            <GripVertical size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          <button type="button" className="sr-only" onClick={() => reorder.move(habit.id, -1)}>
            <ChevronUp aria-hidden="true" />
            Move {habit.name} up
          </button>
          <button type="button" className="sr-only" onClick={() => reorder.move(habit.id, 1)}>
            <ChevronDown aria-hidden="true" />
            Move {habit.name} down
          </button>
        </>
      )}
    </li>
  );
});
