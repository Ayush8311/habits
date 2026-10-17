import { getHabitIcon, habitColorStyle } from '../../lib/habitOptions.js';
import './HabitIcon.css';

/** A habit's chip: its custom emoji if it has one, otherwise its preset icon. */
export function HabitIcon({ icon, emoji, color, size = 'md' }) {
  const Icon = getHabitIcon(icon);
  return (
    <span className={`habit-icon habit-icon-${size}`} style={habitColorStyle(color)} aria-hidden="true">
      {emoji ? (
        <span className="habit-icon-emoji">{emoji}</span>
      ) : (
        <Icon size={size === 'lg' ? 20 : 16} strokeWidth={1.9} />
      )}
    </span>
  );
}
