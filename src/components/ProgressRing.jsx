import { AnimatedNumber } from './ui/AnimatedNumber.jsx';
import './ProgressRing.css';

/**
 * Circular progress in the style of Apple's activity rings. `value` is 0–1 or null.
 * The ring has fixed dimensions; only the arc and the number change, so it never
 * moves or resizes as progress changes.
 */
export function ProgressRing({ value, size = 88, stroke = 8, className, label }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = value === null ? 0 : Math.round(value * 100);
  const offset = circumference * (1 - (value ?? 0));

  return (
    <div
      className={className ? `ring ${className}` : 'ring'}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? (value === null ? 'No completion data yet' : `${percent}% complete`)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          // At 0% the round cap would show a dot, so the arc fades out instead.
          style={{ opacity: value ? 1 : 0 }}
        />
      </svg>
      <span className="ring-value" aria-hidden="true">
        {value === null ? (
          '—'
        ) : (
          <>
            <AnimatedNumber value={percent} />
            <span className="ring-unit">%</span>
          </>
        )}
      </span>
    </div>
  );
}
