import { AnimatedNumber } from '../ui/AnimatedNumber.jsx';
import './StatTile.css';

export function StatTile({ icon: Icon, label, value, unit, caption, trend }) {
  return (
    <article className="card stat-tile">
      <p className="stat-tile-label">
        <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
        {label}
      </p>
      <p className="stat-tile-value">
        {value === null ? <span className="stat-tile-empty">—</span> : <AnimatedNumber value={value} />}
        {value !== null && unit && <span className="stat-tile-unit">{unit}</span>}
      </p>
      <p className="stat-tile-caption">
        {trend && <span className={`stat-trend stat-trend-${trend.direction}`}>{trend.label}</span>}
        {caption}
      </p>
    </article>
  );
}
