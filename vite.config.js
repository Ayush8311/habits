import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Where the app is served from. '/' for Netlify, Vercel or a custom domain;
// '/<repository>/' for a GitHub Pages project site (set by the deploy workflow).
const base = `/${(process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

const ACCENT = '#4A9466';
const BACKGROUND = '#F6F5F1';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      // A new version waits until the user chooses to reload (see UpdateToast).
      registerType: 'prompt',
      injectRegister: false, // Registered in src/pwa.js so updates can be checked periodically.
      manifest: {
        // start_url and scope resolve against the manifest's own location, so the same
        // build works at '/' and under a GitHub Pages sub-folder. `id` resolves against
        // the origin instead, so it names the base path explicitly; otherwise every app
        // on <user>.github.io would share one identity.
        id: base,
        name: 'Habit',
        short_name: 'Habit',
        description: 'A calm, personal habit tracker.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: BACKGROUND,
        theme_color: ACCENT,
        categories: ['productivity', 'lifestyle', 'health'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only the app's own build output is cached; no runtime caching of other requests.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Every in-app navigation opens the cached app shell, so it starts offline.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5173 },
  build: {
    rolldownOptions: {
      output: {
        // Keep the chart library in its own long-lived cached file.
        manualChunks: (id) => (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') ? 'charts' : undefined),
      },
    },
  },
});
