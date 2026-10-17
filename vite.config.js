import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BACKGROUND = '#F6F5F1';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // A new deployment activates on the next visit and reloads open tabs.
      registerType: 'autoUpdate',
      injectRegister: false, // Registered in src/pwa.js so updates can be checked periodically.
      manifest: {
        id: '/',
        name: 'Habit',
        short_name: 'Habit',
        description: 'A calm, focused daily habit tracker.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: BACKGROUND,
        theme_color: BACKGROUND,
        categories: ['productivity', 'lifestyle', 'health'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app is precached, so it opens and works with no connection.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
