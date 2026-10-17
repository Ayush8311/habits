import { cx } from '../../lib/classNames.js';
import './SegmentedControl.css';

/** A two-or-more option switch with the keyboard behaviour of a radio group. */
export function SegmentedControl({ options, value, onChange, label }) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (activeIndex + step + options.length) % options.length;
    onChange(options[next].value);
    event.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      className="segmented"
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{ '--count': options.length, '--index': activeIndex }}
    >
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={cx('segmented-option', checked && 'is-active')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
