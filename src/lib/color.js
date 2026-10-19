// HSV (hue, saturation, value/brightness) for the colour picker. Habits still store
// colours as '#rrggbb' (see habitOptions.js); conversion happens only at the edges.
//   h: 0–360 (degrees), s: 0–1, v: 0–1

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const toByte = (value) => Math.round(clamp01(value) * 255);

export function hsvToRgb({ h, s, v }) {
  const hue = (((h % 360) + 360) % 360) / 60;
  const chroma = clamp01(v) * clamp01(s);
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const m = clamp01(v) - chroma;
  const [r, g, b] =
    hue < 1 ? [chroma, x, 0] : hue < 2 ? [x, chroma, 0] : hue < 3 ? [0, chroma, x] : hue < 4 ? [0, x, chroma] : hue < 5 ? [x, 0, chroma] : [chroma, 0, x];
  return [toByte(r + m), toByte(g + m), toByte(b + m)];
}

export function hsvToHex(hsv) {
  return `#${hsvToRgb(hsv).map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

/** '#rrggbb' → { h, s, v }. Greys keep hue 0. */
export function hexToHsv(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

const HUE_NAMES = [
  [15, 'red'],
  [40, 'orange'],
  [65, 'yellow'],
  [160, 'green'],
  [195, 'cyan'],
  [255, 'blue'],
  [290, 'purple'],
  [335, 'magenta'],
  [360, 'red'],
];

/** A plain-language description for screen readers, e.g. "muted dark green". */
export function describeHsv({ h, s, v }) {
  if (v < 0.12) return 'black';
  if (s < 0.1) return v > 0.9 ? 'white' : 'grey';
  const hue = HUE_NAMES.find(([limit]) => h < limit)?.[1] ?? 'red';
  const tone = [s < 0.4 && 'muted', v < 0.45 ? 'dark' : v > 0.85 && s < 0.6 && 'light'].filter(Boolean).join(' ');
  return tone ? `${tone} ${hue}` : hue;
}

export const hueName = (h) => describeHsv({ h, s: 1, v: 1 });
