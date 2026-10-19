import { useId, useState } from 'react';
import { Check, Pipette } from 'lucide-react';
import { cx } from '../lib/classNames.js';
import { COLOR_SWATCHES, getHabitColor, getHabitPalette, isCustomColor } from '../lib/habitOptions.js';
import { ColorPickerSheet } from './ColorPickerSheet.jsx';
import './ColorPicker.css';

const isSame = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/**
 * Colour choice for a habit: coordinated swatches for quick picks, plus Custom,
 * which opens the in-app picker (hue slider and saturation/brightness board).
 * `value` is a preset id ('sage') or '#rrggbb', exactly as stored; it only
 * changes when the user picks a swatch or applies a custom colour.
 */
export function ColorPicker({ value, onChange, legend = 'Color' }) {
  const name = useId();
  const [picking, setPicking] = useState(false);
  const swatch = COLOR_SWATCHES.find((option) => isSame(option.value, value));
  const isCustom = !swatch && isCustomColor(value);
  const current = getHabitColor(value);

  return (
    <fieldset className="field color-picker">
      <legend className="field-label">{legend}</legend>
      <div className="color-swatches">
        {COLOR_SWATCHES.map((option) => {
          const checked = isSame(option.value, value);
          const base = getHabitColor(option.value);
          return (
            <label key={option.value} className="color-swatch-option" title={option.label}>
              <input
                type="radio"
                name={name}
                value={option.label}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="color-swatch" style={{ '--swatch': base, '--swatch-on': getHabitPalette(base).on }}>
                {checked && <Check size={15} strokeWidth={3} aria-hidden="true" />}
                <span className="sr-only">{option.label}</span>
              </span>
            </label>
          );
        })}
        <button
          type="button"
          className={cx('color-swatch-option color-custom-swatch', isCustom && 'is-selected')}
          aria-haspopup="dialog"
          aria-pressed={isCustom}
          aria-label={isCustom ? 'Custom color, selected. Choose another custom color' : 'Choose a custom color'}
          title="Custom color"
          onClick={() => setPicking(true)}
        >
          <span
            className="color-swatch color-swatch-custom"
            style={isCustom ? { '--swatch': current, '--swatch-on': getHabitPalette(current).on } : undefined}
          >
            {isCustom ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : <Pipette size={15} strokeWidth={2.2} aria-hidden="true" />}
          </span>
        </button>
      </div>
      {picking && (
        <ColorPickerSheet
          initialColor={current}
          onApply={(hex) => {
            if (!isSame(hex, current)) onChange(hex);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </fieldset>
  );
}
