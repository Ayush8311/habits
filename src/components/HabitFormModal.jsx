import { Suspense, lazy, useId, useState } from 'react';
import { Smile, Trash2 } from 'lucide-react';
import { cx } from '../lib/classNames.js';
import {
  DEFAULT_COLOR,
  DEFAULT_ICON,
  HABIT_COLORS,
  HABIT_ICONS,
  MAX_NAME_LENGTH,
  getHabitColor,
  habitColorStyle,
  isCustomColor,
  normalizeHex,
} from '../lib/habitOptions.js';
import { toPercent } from '../lib/stats.js';
import { HabitIcon } from './calendar/HabitIcon.jsx';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import './HabitFormModal.css';

// The emoji data is large, so it loads only when the picker is first opened.
const EmojiPickerSheet = lazy(() => import('./EmojiPickerSheet.jsx'));

function validateName(name, existingNames) {
  const trimmed = name.trim();
  if (!trimmed) return 'Give your habit a name.';
  if (trimmed.length > MAX_NAME_LENGTH) return `Keep it under ${MAX_NAME_LENGTH} characters.`;
  if (existingNames.has(trimmed.toLowerCase())) return 'You already have a habit with this name.';
  return null;
}

function HabitStats({ stats, monthName }) {
  const percent = toPercent(stats.progress.rate);
  const items = [
    { label: 'Current streak', value: stats.streak.current, unit: stats.streak.current === 1 ? 'day' : 'days' },
    { label: 'Best streak', value: stats.streak.best, unit: stats.streak.best === 1 ? 'day' : 'days' },
    { label: monthName, value: percent === null ? '—' : percent, unit: percent === null ? '' : '%' },
  ];
  return (
    <dl className="habit-stats">
      {items.map((item) => (
        <div key={item.label} className="habit-stats-item">
          <dt>{item.label}</dt>
          <dd>
            <span className="tabular">{item.value}</span>
            {item.unit && <span className="habit-stats-unit">{item.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Mirrors a Today-screen row so changes can be judged before saving. */
function HabitPreview({ name, icon, emoji, color }) {
  const trimmed = name.trim();
  return (
    <div className="habit-preview" style={habitColorStyle(color)} aria-hidden="true">
      <HabitIcon icon={icon} emoji={emoji} color={color} size="lg" />
      <span className="habit-preview-text">
        <span className={cx('habit-preview-name', !trimmed && 'is-placeholder')}>{trimmed || 'Habit name'}</span>
        <span className="habit-preview-meta">Preview</span>
      </span>
      <span className="check check-row-box habit-preview-check is-done">
        <svg className="check-mark" viewBox="0 0 16 16">
          <path d="M4 8.4 6.8 11.2 12 5" pathLength="1" />
        </svg>
      </span>
    </div>
  );
}

/**
 * The multicolour circle *is* the native colour input (transparent, layered on
 * top), so one tap opens the system picker directly on iOS, Android and desktop.
 * Cancelling the picker fires no change, so the previous colour stays.
 */
function CustomColorField({ color, onChange }) {
  const isCustom = isCustomColor(color);
  const current = getHabitColor(color);

  return (
    <span
      className={cx('custom-color', isCustom && 'is-selected')}
      style={isCustom ? { '--swatch': current } : undefined}
      title="Custom color"
    >
      <span className="custom-color-wheel" aria-hidden="true" />
      <input
        type="color"
        className="custom-color-input"
        value={current}
        aria-label={isCustom ? `Choose custom color, currently ${current}` : 'Choose custom color'}
        onChange={(event) => {
          const hex = normalizeHex(event.target.value);
          if (hex) onChange(hex);
        }}
      />
    </span>
  );
}

export function HabitFormModal({ habit, stats, monthName, existingNames, onSubmit, onDelete, onClose }) {
  const isEditing = Boolean(habit);
  const formId = useId();
  const nameId = useId();
  const errorId = useId();
  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? DEFAULT_ICON);
  const [emoji, setEmoji] = useState(habit?.emoji ?? null);
  const [color, setColor] = useState(habit?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState(null);
  const [pickingEmoji, setPickingEmoji] = useState(false);

  return (
    <Modal
      title={isEditing ? 'Edit habit' : 'New habit'}
      description={isEditing ? null : 'Something small you want to do most days.'}
      onClose={onClose}
      footer={(close) => (
        <>
          {isEditing && (
            <>
              <Button variant="danger-ghost" icon={Trash2} onClick={onDelete}>
                Delete
              </Button>
              <span className="modal-footer-spacer" />
            </>
          )}
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId}>
            {isEditing ? 'Save' : 'Add habit'}
          </Button>
        </>
      )}
    >
      {(close) => (
        <form
          id={formId}
          className="habit-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const problem = validateName(name, existingNames);
            if (problem) {
              setError(problem);
              event.currentTarget.querySelector(`#${CSS.escape(nameId)}`).focus();
              return;
            }
            onSubmit({ name, icon, emoji, color });
            close();
          }}
        >
          <HabitPreview name={name} icon={icon} emoji={emoji} color={color} />

          {isEditing && stats && <HabitStats stats={stats} monthName={monthName} />}

          <div className="field">
            <label htmlFor={nameId} className="field-label">
              Name
            </label>
            <div className={cx('name-input', error && 'has-error')}>
              <input
                id={nameId}
                type="text"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                placeholder="e.g. Drink water"
                autoComplete="off"
                data-autofocus
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(null);
                }}
              />
              <span className="name-count tabular" aria-hidden="true">
                {name.trim().length}/{MAX_NAME_LENGTH}
              </span>
            </div>
            {error && (
              <p id={errorId} className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <fieldset className="field">
            <legend className="field-label">Icon</legend>
            <div className="icon-options" style={habitColorStyle(color)}>
              {HABIT_ICONS.map(({ id, label, Icon }) => (
                <label key={id} className="option" title={label}>
                  <input
                    type="radio"
                    name={`${formId}-icon`}
                    value={id}
                    checked={!emoji && icon === id}
                    onChange={() => {
                      setIcon(id);
                      setEmoji(null);
                    }}
                    className="sr-only"
                  />
                  <span className="option-face icon-option">
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span className="sr-only">{label}</span>
                  </span>
                </label>
              ))}
              <button
                type="button"
                className={cx('emoji-choose', emoji && 'is-selected')}
                aria-haspopup="dialog"
                aria-label={emoji ? `Emoji ${emoji} selected. Choose a different emoji` : 'Choose emoji'}
                onClick={() => setPickingEmoji(true)}
              >
                {emoji ? (
                  <span className="emoji-choose-glyph" aria-hidden="true">
                    {emoji}
                  </span>
                ) : (
                  <Smile size={18} strokeWidth={1.9} aria-hidden="true" />
                )}
                <span className="emoji-choose-label">{emoji ? 'Change emoji' : 'Choose emoji'}</span>
              </button>
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="field-label">Color</legend>
            <div className="color-options">
              {HABIT_COLORS.map((option) => (
                <label key={option.id} className="option" title={option.label}>
                  <input
                    type="radio"
                    name={`${formId}-color`}
                    value={option.id}
                    checked={color === option.id}
                    onChange={() => setColor(option.id)}
                    className="sr-only"
                  />
                  <span className="option-face color-option" style={{ '--swatch': option.value }}>
                    <span className="sr-only">{option.label}</span>
                  </span>
                </label>
              ))}
              <CustomColorField color={color} onChange={setColor} />
            </div>
          </fieldset>

          {pickingEmoji && (
            <Suspense fallback={null}>
              <EmojiPickerSheet
                initialEmoji={emoji}
                onSelect={(value) => setEmoji(value)}
                onClose={() => setPickingEmoji(false)}
              />
            </Suspense>
          )}
        </form>
      )}
    </Modal>
  );
}
