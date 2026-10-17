// Renders the app icons in public/ from the SVG designs below.
// Run `npm run icons` after changing the design.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const GREEN = '#4A9466';
const publicPath = (file) => fileURLToPath(new URL(`../public/${file}`, import.meta.url));

// A 512-unit glyph: a three-quarter progress ring around a check mark. Its
// outer radius (167) stays inside the 40% maskable safe zone (204).
const glyph = `
  <circle cx="256" cy="256" r="150" fill="none" stroke="#fff" stroke-opacity="0.28" stroke-width="34"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round"
    stroke-dasharray="706.86 942.48" transform="rotate(-90 256 256)"/>
  <path d="M196 262 L240 306 L320 214" fill="none" stroke="#fff" stroke-width="36"
    stroke-linecap="round" stroke-linejoin="round"/>`;

function svg({ radius = 0, scale = 1 }) {
  const offset = 256 * (1 - scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${GREEN}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${glyph}</g>
</svg>
`;
}

const designs = {
  // Rounded tile for browsers and launchers that show the icon as-is.
  any: { svg: svg({ radius: 112 }), opaque: false },
  // Full bleed: Android crops it to the launcher's own shape.
  maskable: { svg: svg({ scale: 0.86 }), opaque: true },
  // Full bleed and opaque: iOS applies its own rounded mask.
  apple: { svg: svg({ scale: 0.92 }), opaque: true },
  // A slightly larger glyph reads better at tab size.
  favicon: { svg: svg({ radius: 112, scale: 1.12 }), opaque: false },
};

const outputs = [
  { file: 'pwa-192x192.png', design: 'any', size: 192 },
  { file: 'pwa-512x512.png', design: 'any', size: 512 },
  { file: 'maskable-icon-512x512.png', design: 'maskable', size: 512 },
  { file: 'apple-touch-icon.png', design: 'apple', size: 180 },
  { file: 'favicon-32x32.png', design: 'favicon', size: 32 },
];

for (const { file, design, size } of outputs) {
  let image = sharp(Buffer.from(designs[design].svg), { density: 384 }).resize(size, size);
  if (designs[design].opaque) image = image.flatten({ background: GREEN });
  await image.png({ compressionLevel: 9 }).toFile(publicPath(file));
  console.log(`  ${file}  ${size}×${size}`);
}
await writeFile(publicPath('favicon.svg'), designs.favicon.svg);
console.log('  favicon.svg');
