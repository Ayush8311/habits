// Renders the app icons in public/ (website and PWA) and android/ (Android app)
// from the mink logo in assets/mink-logo-original.png (the supplied artwork, kept
// unchanged). Run `npm run icons` after replacing the logo.
//
// The logo is drawn on a white background, which is removed (see step 1); the
// mink's own pixels keep their exact colours. Nothing is redrawn: each icon is the
// same pixels, scaled about the silhouette's centre.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));

// The icon's tile colour: the app's own warm white (tokens.css --color-bg), close
// to the logo's paper, so the cutouts read exactly as in the original.
const BACKGROUND = '#F6F5F1';
// The source's paper is 253–255 in every channel.
const PAPER = 254;

// ── 1. Transparent logo, cropped to the silhouette ──────────────────────────
// Background = paper-white pixels connected to the image border (a flood fill), so
// white details enclosed by the mink (the eye) stay white. Every other pixel keeps
// its exact original colour and full opacity; only the outline's anti-aliased
// pixels get partial opacity, un-mixed from the paper so no white fringe remains.
const source = await sharp(fromRoot('assets/mink-logo-original.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = source.info;
const N = W * H;
const ink = new Float32Array(N); // how far each pixel is from the paper (0 = paper)
for (let i = 0; i < N; i += 1) {
  ink[i] = Math.max(0, PAPER - source.data[i * 3], PAPER - source.data[i * 3 + 1], PAPER - source.data[i * 3 + 2]);
}
const PAPER_TOLERANCE = 6; // paper grain and JPEG-like noise in the background
const background = new Uint8Array(N);
const stack = [];
for (let x = 0; x < W; x += 1) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y += 1) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const i = stack.pop();
  if (background[i] || ink[i] >= PAPER_TOLERANCE) continue;
  background[i] = 1;
  const x = i % W;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (i >= W) stack.push(i - W);
  if (i < N - W) stack.push(i + W);
}
// Pale areas open to the background (the chest, which fades from pale green to the
// paper) fade out with it instead of ending in a hard edge: they're found by a
// second fill from the background through pale pixels. Pale details enclosed by
// the mink (the eye and ear) aren't reached and stay solid.
const PALE = 60;
const fades = new Uint8Array(N);
const pale = [];
for (let i = 0; i < N; i += 1) if (background[i]) pale.push(i);
while (pale.length) {
  const i = pale.pop();
  const x = i % W;
  for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
    if (j < 0 || j >= N || background[j] || fades[j] || ink[j] >= PALE) continue;
    fades[j] = 1;
    pale.push(j);
  }
}
const nearBackground = (i, r) => {
  const x = i % W;
  const y = (i / W) | 0;
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && background[yy * W + xx]) return true;
    }
  }
  return false;
};
const localInk = (i, r) => {
  const x = i % W;
  const y = (i / W) | 0;
  let max = 0;
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && !background[yy * W + xx]) max = Math.max(max, ink[yy * W + xx]);
    }
  }
  return max;
};
const rgba = Buffer.alloc(N * 4);
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let i = 0; i < N; i += 1) {
  if (background[i]) continue; // fully transparent
  const c = [source.data[i * 3], source.data[i * 3 + 1], source.data[i * 3 + 2]];
  let alpha = 1;
  let out = c;
  if (fades[i] || nearBackground(i, 2)) {
    // An outline or fading pixel: part logo, part paper. Its opacity is its ink
    // relative to the solid logo around it; its colour is that logo colour, so it
    // looks exactly as before on white and has no white fringe on anything else.
    alpha = Math.min(1, ink[i] / Math.max(PALE, localInk(i, 4)));
    out = c.map((v) => Math.round(Math.min(255, Math.max(0, PAPER - (PAPER - v) / Math.max(alpha, 0.01)))));
  }
  rgba.set([...out, Math.round(alpha * 255)], i * 4);
  if (alpha > 0.05) {
    const x = i % W;
    const y = (i / W) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
const logo = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: minX, top: minY, width: cropW, height: cropH })
  .png()
  .toBuffer();
await writeFile(fromRoot('assets/mink-logo.png'), logo);
console.log(`  assets/mink-logo.png  ${cropW}×${cropH} (transparent, cropped to the silhouette)`);

// Only the shape, black: Android's themed (monochrome) icon uses just the alpha.
const silhouette = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < silhouette.data.length; i += 4) silhouette.data.fill(0, i, i + 3);
const monochromeLogo = await sharp(silhouette.data, { raw: silhouette.info }).png().toBuffer();

// ── 2. Icon designs ─────────────────────────────────────────────────────────
// `fit` sizes the silhouette: { width } as a share of the canvas, or { diagonal }
// so the whole silhouette fits inside a circle of that share (launcher masks).
const diagonal = Math.hypot(cropW, cropH);
function logoSize(size, fit) {
  const scale = fit.width ? (size * fit.width) / cropW : (size * fit.diagonal) / diagonal;
  return { w: Math.round(cropW * scale), h: Math.round(cropH * scale) };
}
async function render({ size, fit, tile = 'none', radius = 0, art = logo }) {
  const { w, h } = logoSize(size, fit);
  const mark = await sharp(art).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  const base =
    tile === 'none'
      ? sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      : tile === 'full'
        ? sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
        : sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius * size}" fill="${BACKGROUND}"/></svg>`));
  return base
    .composite([{ input: mark, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }])
    .png({ compressionLevel: 9 });
}

const designs = {
  // Rounded tile for browsers, the macOS Dock and the Windows Start menu, which show it as-is.
  any: { tile: 'rounded', radius: 0.22, fit: { width: 0.8 } },
  // Full bleed: Android crops it to the launcher's shape; the silhouette stays in the 80% safe circle.
  maskable: { tile: 'full', fit: { diagonal: 0.76 } },
  // Full bleed and opaque: iOS applies its own rounded mask.
  apple: { tile: 'full', fit: { width: 0.8 } },
  // Tab size: the silhouette as large as the tile allows.
  favicon: { tile: 'rounded', radius: 0.22, fit: { width: 0.94 } },
  // Android adaptive icon layers on a 108 dp canvas: launchers show the central 72 dp
  // and guarantee only a 66 dp circle, so the whole silhouette fits a 62 dp circle.
  androidForeground: { fit: { diagonal: 62 / 108 } },
  androidMonochrome: { fit: { diagonal: 62 / 108 }, art: monochromeLogo },
  // Legacy launcher icons (Android 7.x): a rounded tile and a circle.
  androidLegacy: { tile: 'rounded', radius: 0.19, fit: { width: 0.8 } },
  androidRound: { tile: 'rounded', radius: 0.5, fit: { diagonal: 0.86 } },
};

const outputs = [
  { file: 'public/pwa-192x192.png', design: 'any', size: 192 },
  { file: 'public/pwa-512x512.png', design: 'any', size: 512 },
  { file: 'public/maskable-icon-512x512.png', design: 'maskable', size: 512 },
  { file: 'public/apple-touch-icon.png', design: 'apple', size: 180 },
  { file: 'public/favicon-32x32.png', design: 'favicon', size: 32 },
];
const res = 'android/app/src/main/res';
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [density, scale] of Object.entries(densities)) {
  outputs.push(
    { file: `${res}/mipmap-${density}/ic_launcher.png`, design: 'androidLegacy', size: 48 * scale },
    { file: `${res}/mipmap-${density}/ic_launcher_round.png`, design: 'androidRound', size: 48 * scale },
    { file: `${res}/mipmap-${density}/ic_launcher_foreground.png`, design: 'androidForeground', size: 108 * scale },
    { file: `${res}/mipmap-${density}/ic_launcher_monochrome.png`, design: 'androidMonochrome', size: 108 * scale },
  );
}

for (const { file, design, size } of outputs) {
  const path = fromRoot(file);
  await mkdir(dirname(path), { recursive: true });
  let image = await render({ size, ...designs[design] });
  // Opaque where platforms require it (Apple touch icon, maskable).
  if (designs[design].tile === 'full') image = sharp(await image.toBuffer()).flatten({ background: BACKGROUND }).png({ compressionLevel: 9 });
  await image.toFile(path);
  const { width, height } = await sharp(path).metadata();
  console.log(`  ${file}  ${width}×${height}`);
}

// favicon.svg (browsers that prefer SVG, and the desktop header's mark): the 128 px
// favicon embedded as-is, since the logo is a bitmap.
const faviconPng = await (await render({ size: 128, ...designs.favicon })).toBuffer();
await writeFile(
  fromRoot('public/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${faviconPng.toString('base64')}"/></svg>\n`,
);
console.log('  public/favicon.svg');
await writeFile(
  fromRoot(`${res}/values/ic_launcher_background.xml`),
  `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by scripts/generate-icons.mjs: the adaptive icon's background layer. -->\n<resources>\n    <color name="ic_launcher_background">${BACKGROUND}</color>\n</resources>\n`,
);
console.log(`  ${res}/values/ic_launcher_background.xml`);
