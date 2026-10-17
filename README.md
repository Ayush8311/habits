# Habit

A calm, Apple-inspired habit tracker. One React + Vite project with two layouts that share
the same data:

- **Desktop** (wider than 820px): overview, full monthly grid and insights on one page.
- **Mobile** (820px and narrower): an installable app with Today, Calendar, Insights and
  Settings tabs, built to live on your phone's home screen and work offline.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 — desktop and mobile layouts, no service worker
npm test           # unit tests for dates, streaks, stats and storage
npm run build      # production build + service worker in dist/
npm run preview    # serve dist/ at http://localhost:4173 — use this to test offline and installing
npm run icons      # regenerate the app icons from scripts/generate-icons.mjs
```

To try the mobile layout on a computer, narrow the browser window or use the device toolbar
in Chrome DevTools.

## Deploy over HTTPS

Installing and offline mode need HTTPS (localhost is the only exception). `dist/` is a static
site, so any static host works.

### GitHub Pages

`.github/workflows/deploy-pages.yml` builds, tests and publishes the app. One-time setup:

1. GitHub Pages must be available for the repository: make it public, or use a paid plan for a
   private repository.
2. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Deploy: **Actions → Deploy to GitHub Pages → Run workflow**. To deploy automatically on every
   push to `main`, add the repository variable `DEPLOY_TO_PAGES` = `true`
   (Settings → Secrets and variables → Actions → Variables).

The app is then at `https://<user>.github.io/<repository>/` (for this repository:
`https://ayush8311.github.io/habits/`), or at your custom domain if you set one in the Pages
settings. The workflow reads the correct base path from GitHub, so no code changes are needed
for either.

### Netlify, Vercel, Cloudflare Pages

Build command `npm run build`, output directory `dist`. `public/_headers` (Netlify,
Cloudflare) and `vercel.json` set cache headers so updates reach installed apps promptly.

### Building for a sub-folder yourself

```bash
BASE_PATH=/habits/ npm run build   # assets, manifest and service worker all use /habits/
```

## Install the app

Open the deployed HTTPS address, then:

| Device | How |
|---|---|
| **iPhone / iPad** | Safari → **Share** → **Add to Home Screen** → **Add**. (iOS 16.4+: also from the Share menu in Chrome, Edge and Firefox.) Settings → *Install App* shows these steps. |
| **Android** | Chrome, Edge or Samsung Internet: Settings → **Install App** opens the install prompt, or use the browser menu → *Install app* / *Add to Home screen*. |
| **Windows** | Chrome or Edge: the **Install** button in the header or Settings, or the install icon in the address bar. |
| **macOS** | Chrome or Edge: as on Windows. Safari 17+ (macOS Sonoma or later): **File → Add to Dock**. |
| **Firefox (desktop)** | No full app installation on most systems; use Chrome, Edge or Safari to install. Habit still works offline in Firefox. |

Installed, Habit opens in its own window or full screen at the Today tab. The install button is
replaced by "Installed" there.

- **iPhone data:** a Home Screen app has its own storage, separate from Safari. If you already
  track habits in Safari, use **Export backup** there and **Import backup** in the installed app.
  (On Android and desktop, the installed app shares data with the browser.)
- **In-app browsers** (links opened inside Instagram, Facebook, Gmail and similar) can't install
  web apps; the Install App button explains how to open the page in Safari or Chrome.

## Offline and updates

- The service worker precaches only the app's own build files (HTML, JS, CSS, icons). After the
  first load the app opens with no connection, and check-ins save to the device immediately.
- When a new version is deployed, the app downloads it in the background (checked on launch,
  when it returns to the foreground and hourly) and shows **"A new version is ready."** with a
  **Reload** button. Nothing reloads without you choosing to.

## Your data

Habits and check-ins are stored in the browser's LocalStorage under `habit.state.v1` (the same
key the desktop version has always used, so existing data carries over).

**Phone and desktop do not synchronise.** Each browser keeps its own copy. To move data, use
**Export backup** on one device (Settings tab on mobile, the gear menu on desktop) and
**Import backup** on the other. Import always asks before replacing anything.

Note: browsers can clear site data. On iPhone, a Home Screen app keeps its own storage; data in
regular Safari tabs may be removed after weeks of not visiting. Export a backup occasionally.

### Adding cloud sync later

All reads and writes go through `src/data/repository.js`, which exposes `load()`, `save(state)`
and `subscribe(listener)`. To add sync, implement those three methods against a backend (for
example: save locally first, push in the background, call `listener` when remote changes
arrive) and pass it to `useHabitStore`. No component needs to change.

## Structure

```
src/
  App.jsx                    owns the store, chooses the desktop or mobile layout
  DesktopApp.jsx             desktop layout
  mobile/                    MobileApp (tabs), BottomNav, ScreenHeader, HabitCheckRow, MonthHeatmap
    screens/                 TodayScreen, CalendarScreen, InsightsScreen, SettingsScreen
  components/                shared UI: calendar grid, insights, habit form, dialogs, buttons
    useHabitDialogs.jsx      add/edit/delete/confirm dialogs used by both layouts
    useBackupActions.jsx     export/import
  hooks/                     useHabitStore, useToday, media queries, online status
  data/repository.js         storage interface (LocalStorage today)
  data/sampleData.js         example habits
  lib/                       pure logic: dates, stats, insights, storage validation, backup
  pwa.js                     service worker registration, install prompt
scripts/generate-icons.mjs   renders public/*.png icons
```

### Data model

```js
{
  version: 1,
  habits: [{ id, name, icon, color, createdAt: 'YYYY-MM-DD' }],
  completions: { [habitId]: { 'YYYY-MM-DD': true } }
}
```

Dates are built from local calendar fields (never `toISOString`) and parsed at local noon, so
time zones and daylight-saving changes can't move a check-in to another day. A habit's rates
count from the day it was created (or an earlier back-filled check-in), so new habits aren't
scored as having missed earlier days.
