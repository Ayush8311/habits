import { cx } from '../../lib/classNames.js';
import './CompletionButton.css';

/** The rounded-square check used everywhere a habit/day pair can be toggled. */
export function CompletionButton({ done, future, today, label, size = 'md', colorStyle, onToggle, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'check',
        `check-${size}`,
        done && 'is-done',
        future && 'is-future',
        today && 'is-today',
        colorStyle && 'has-habit-color',
      )}
      style={colorStyle}
      aria-label={future ? `${label} (upcoming)` : label}
      aria-pressed={future ? undefined : done}
      disabled={future}
      onClick={() => onToggle()}
      {...props}
    >
      <svg className="check-mark" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 8.4 6.8 11.2 12 5" pathLength="1" />
      </svg>
    </button>
  );
}
