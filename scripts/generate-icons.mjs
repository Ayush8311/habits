// Renders the app icons in public/ from the master artwork in assets/habit-icon.svg.
// Run `npm run icons` after changing the design.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));

const master = await readFile(fromRoot('assets/habit-icon.svg'), 'utf8');
const background = master.match(/<rect id="background"[^>]*fill="([^"]+)"/)?.[1];
const artwork = master.match(/<g id="artwork"[\s\S]*?<\/g>/)?.[0];
if (!background || !artwork) throw new Error('assets/habit-icon.svg needs #background and #artwork');

// One variant of the master: an optional rounded tile, the artwork scaled about
// the centre, and optionally heavier strokes so it survives tiny sizes.
function svg({ radius = 0, scale = 1, strokeWidth }) {
  const offset = 256 * (1 - scale);
  const art = strokeWidth ? artwork.replace(/stroke-width="[\d.]+"/, `stroke-width="${strokeWidth}"`) : artwork;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${background}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
  ${art}
  </g>
</svg>
`;
}

const designs = {
  // Rounded tile for browsers, the macOS Dock and the Windows Start menu, which show the icon as-is.
  any: { svg: svg({ radius: 112 }), opaque: false },
  // Full bleed: Android crops it to the launcher's own shape (circle, squircle…).
  maskable: { svg: svg({ scale: 0.9 }), opaque: true },
  // Full bleed and opaque: iOS applies its own rounded mask.
  apple: { svg: svg({ scale: 0.94 }), opaque: true },
  // Larger artwork and heavier strokes read better at tab size.
  favicon: { svg: svg({ radius: 112, scale: 1.12, strokeWidth: 44 }), opaque: false },
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
  if (designs[design].opaque) image = image.flatten({ background });
  await image.png({ compressionLevel: 9 }).toFile(fromRoot(`public/${file}`));
  const { width, height } = await sharp(fromRoot(`public/${file}`)).metadata();
  console.log(`  public/${file}  ${width}×${height}`);
}
await writeFile(fromRoot('public/favicon.svg'), designs.favicon.svg);
console.log('  public/favicon.svg');
