import { getHabitColor, getHabitIcon } from '../../lib/habitOptions.js';
import './HabitIcon.css';

export function HabitIcon({ icon, color, size = 'md' }) {
  const Icon = getHabitIcon(icon);
  return (
    <span className={`habit-icon habit-icon-${size}`} style={{ '--habit-color': getHabitColor(color) }} aria-hidden="true">
      <Icon size={size === 'lg' ? 20 : 16} strokeWidth={1.9} />
    </span>
  );
}
