import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Laptop,
  Leaf,
  ListChecks,
  Moon,
  Music,
  NotebookPen,
  Sunrise,
} from 'lucide-react';

export const HABIT_ICONS = [
  { id: 'sunrise', label: 'Sunrise', Icon: Sunrise },
  { id: 'dumbbell', label: 'Workout', Icon: Dumbbell },
  { id: 'book', label: 'Book', Icon: BookOpen },
  { id: 'list', label: 'Checklist', Icon: ListChecks },
  { id: 'laptop', label: 'Laptop', Icon: Laptop },
  { id: 'notebook', label: 'Notebook', Icon: NotebookPen },
  { id: 'moon', label: 'Moon', Icon: Moon },
  { id: 'water', label: 'Water', Icon: Droplets },
  { id: 'walk', label: 'Walk', Icon: Footprints },
  { id: 'apple', label: 'Nutrition', Icon: Apple },
  { id: 'leaf', label: 'Leaf', Icon: Leaf },
  { id: 'brain', label: 'Mind', Icon: Brain },
  { id: 'music', label: 'Music', Icon: Music },
  { id: 'heart', label: 'Heart', Icon: Heart },
  { id: 'coffee', label: 'Coffee', Icon: Coffee },
  { id: 'bike', label: 'Cycling', Icon: Bike },
];

// Muted tones used for each habit's icon chip. Completion is always green.
export const HABIT_COLORS = [
  { id: 'sage', label: 'Sage', value: '#5B9A70' },
  { id: 'ocean', label: 'Ocean', value: '#4F7EA8' },
  { id: 'clay', label: 'Clay', value: '#BC7656' },
  { id: 'amber', label: 'Amber', value: '#B58C3C' },
  { id: 'plum', label: 'Plum', value: '#8A6DA6' },
  { id: 'rose', label: 'Rose', value: '#B46A7B' },
  { id: 'slate', label: 'Slate', value: '#6B7480' },
];

export const DEFAULT_ICON = 'leaf';
export const DEFAULT_COLOR = 'sage';
export const MAX_NAME_LENGTH = 40;

const iconsById = new Map(HABIT_ICONS.map((option) => [option.id, option]));
const colorsById = new Map(HABIT_COLORS.map((option) => [option.id, option]));

export const isHabitIcon = (id) => iconsById.has(id);
export const getHabitIcon = (id) => (iconsById.get(id) ?? iconsById.get(DEFAULT_ICON)).Icon;

// ── Colours ────────────────────────────────────────────────────────────────
// A habit's `color` is either a preset id ('sage') or a custom '#rrggbb' value.

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

/** '#ABC', 'abc', '368653' → '#368653'; anything else → null. */
export function normalizeHex(input) {
  let value = String(input ?? '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(value)) value = [...value].map((char) => char + char).join('');
  return /^[0-9a-f]{6}$/.test(value) ? `#${value}` : null;
}

export const isPresetColor = (id) => colorsById.has(id);
export const isCustomColor = (value) => typeof value === 'string' && HEX_PATTERN.test(value);
export const isHabitColor = (value) => isPresetColor(value) || isCustomColor(value);

export const getHabitColor = (value) =>
  colorsById.get(value)?.value ?? (isCustomColor(value) ? value : colorsById.get(DEFAULT_COLOR).value);

const toRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const toHex = (rgb) => `#${rgb.map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex, target, amount) => {
  const from = toRgb(hex);
  const to = toRgb(target);
  return toHex(from.map((part, index) => part + (to[index] - part) * amount));
};

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((part) => {
    const channel = part / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const INK = '#1d1d1f';
const paletteCache = new Map();

/**
 * Colours derived from a habit's colour so any custom choice stays readable:
 *   base  – the colour itself (fills, borders)
 *   soft  – a pale tint for icon backgrounds
 *   ink   – the colour darkened just enough to read on white (icons)
 *   on    – white or near-black, whichever reads better on `base` (check marks)
 */
export function getHabitPalette(value) {
  const base = getHabitColor(value);
  if (paletteCache.has(base)) return paletteCache.get(base);

  const soft = mix(base, '#ffffff', 0.86);
  let ink = base;
  for (let amount = 0.1; contrastRatio(ink, soft) < 3 && amount <= 0.8; amount += 0.1) {
    ink = mix(base, INK, amount);
  }
  const on = contrastRatio('#ffffff', base) >= 2.4 ? '#ffffff' : INK;

  const palette = { base, soft, ink, on };
  paletteCache.set(base, palette);
  return palette;
}

/** CSS custom properties for a habit's colour, applied on a wrapping element. */
export function habitColorStyle(value) {
  const { base, soft, ink, on } = getHabitPalette(value);
  return { '--habit-color': base, '--habit-soft': soft, '--habit-ink': ink, '--habit-on': on };
}

// ── Emoji ──────────────────────────────────────────────────────────────────

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;

function graphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((part) => part.segment);
  }
  return Array.from(text);
}

/** The first emoji in a piece of typed or pasted text, or null. */
export function extractEmoji(text) {
  if (typeof text !== 'string') return null;
  return graphemes(text.trim()).find((part) => EMOJI_PATTERN.test(part)) ?? null;
}

/** A stored emoji must be exactly one emoji (including ZWJ sequences, flags and skin tones). */
export const isEmoji = (value) => typeof value === 'string' && value.length <= 32 && extractEmoji(value) === value;
