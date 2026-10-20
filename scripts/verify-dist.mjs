// Checks a production build in dist/ before it is released: the manifest, its
// icons, the service worker and every asset index.html links to.
// Usage: npm run build && npm run verify
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const problems = [];
const check = (ok, message) => ok || problems.push(message);
const file = (path) => `${dist}${path}`;

check(existsSync(file('index.html')), 'dist/index.html is missing (run npm run build first)');
const html = existsSync(file('index.html')) ? readFileSync(file('index.html'), 'utf8') : '';

// Every local href/src in index.html, minus the configured base path, must exist in dist/.
const base = html.match(/<link rel="manifest" href="([^"]*)manifest\.webmanifest"/)?.[1];
check(base, 'index.html does not link manifest.webmanifest');
for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (/^(https?:)?\/\//.test(url)) continue;
  const path = base && url.startsWith(base) ? url.slice(base.length) : url.replace(/^\.?\//, '');
  check(existsSync(file(path)), `index.html links ${url}, which is not in dist/`);
}
check(/rel="apple-touch-icon"/.test(html), 'index.html has no apple-touch-icon');
check(/name="apple-mobile-web-app-capable"/.test(html), 'index.html has no iOS web app metadata');

const manifestPath = file('manifest.webmanifest');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  check(manifest.name === 'mink' && manifest.short_name === 'mink', 'manifest name/short_name should be "mink"');
  check(manifest.display === 'standalone', 'manifest display should be "standalone"');
  check(manifest.start_url && manifest.scope && manifest.id, 'manifest needs start_url, scope and id');
  check(manifest.theme_color && manifest.background_color, 'manifest needs theme_color and background_color');

  const icons = manifest.icons ?? [];
  for (const [size, purpose] of [[192, 'any'], [512, 'any'], [512, 'maskable']]) {
    const icon = icons.find((i) => i.sizes === `${size}x${size}` && (i.purpose ?? 'any').split(' ').includes(purpose));
    check(icon, `manifest has no ${size}x${size} ${purpose} icon`);
  }
  for (const icon of icons) {
    const path = file(icon.src.replace(/^\.?\//, ''));
    if (!existsSync(path)) {
      check(false, `manifest icon ${icon.src} is not in dist/`);
      continue;
    }
    const { width, height, format } = await sharp(path).metadata();
    check(`${width}x${height}` === icon.sizes, `${icon.src} is ${width}x${height}, manifest says ${icon.sizes}`);
    check(format === 'png', `${icon.src} is ${format}, expected png`);
  }
} else {
  check(false, 'dist/manifest.webmanifest is missing');
}

const appleIcon = file('apple-touch-icon.png');
if (existsSync(appleIcon)) {
  const { width, height, hasAlpha } = await sharp(appleIcon).metadata();
  check(width === 180 && height === 180, `apple-touch-icon.png is ${width}x${height}, expected 180x180`);
  check(!hasAlpha, 'apple-touch-icon.png should be opaque');
}

check(existsSync(file('sw.js')), 'dist/sw.js (service worker) is missing');
if (existsSync(file('sw.js'))) {
  const sw = readFileSync(file('sw.js'), 'utf8');
  check(/index\.html/.test(sw), 'service worker does not precache index.html');
  check(/manifest\.webmanifest/.test(sw), 'service worker does not precache the manifest');
}

if (problems.length) {
  console.error(`Build check failed:\n${problems.map((p) => `  ✗ ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Build check passed (base path ${base}).`);
