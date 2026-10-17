import { useState } from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { HabitIcon } from '../components/calendar/HabitIcon.jsx';
import { cx } from '../lib/classNames.js';
import { tapFeedback } from '../lib/haptics.js';
import './HabitCheckRow.css';

function describeStreak({ current, best }, done) {
  if (current > 0) return { text: `${current}-day streak`, hot: current >= 3 };
  if (best > 0) return { text: `Best ${best} ${best === 1 ? 'day' : 'days'}`, hot: false };
  return { text: done ? 'Done' : 'Not started yet', hot: false };
}

/**
 * One habit as a full-width tappable row. In `toggle` mode a tap completes or
 * un-completes it; in `edit` mode a tap opens the editor.
 */
export function HabitCheckRow({
  habit,
  done,
  streak,
  metaText,
  mode = 'toggle',
  disabled = false,
  dateLabel,
  onToggle,
  onEdit,
}) {
  const [animating, setAnimating] = useState(false);
  const meta = metaText ? { text: metaText, hot: false } : describeStreak(streak, done);
  const editing = mode === 'edit';

  const label = editing
    ? `Edit ${habit.name}`
    : `${habit.name}${dateLabel ? `, ${dateLabel}` : ''}. ${meta.text}.${disabled ? ' Upcoming.' : ''}`;

  return (
    <li className="check-row-item">
      <button
        type="button"
        className={cx('check-row', done && 'is-done', disabled && 'is-disabled')}
        aria-pressed={editing || disabled ? undefined : done}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          if (editing) {
            onEdit();
            return;
          }
          tapFeedback();
          setAnimating(true);
          onToggle();
        }}
      >
        <HabitIcon icon={habit.icon} color={habit.color} size="lg" />
        <span className="check-row-text">
          <span className="check-row-name">{habit.name}</span>
          <span className={cx('check-row-meta', meta.hot && 'is-hot')} aria-hidden="true">
            {!metaText && streak.current > 0 && <Flame size={12} strokeWidth={2.2} />}
            {meta.text}
          </span>
        </span>
        {editing ? (
          <ChevronRight className="check-row-chevron" size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <span
            className={cx('check check-row-box', done && 'is-done', disabled && 'is-future', animating && 'is-animating')}
            onAnimationEnd={() => setAnimating(false)}
            aria-hidden="true"
          >
            <svg className="check-mark" viewBox="0 0 16 16">
              <path d="M4 8.4 6.8 11.2 12 5" pathLength="1" />
            </svg>
          </span>
        )}
      </button>
    </li>
  );
}
