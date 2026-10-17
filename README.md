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
npm run preview    # serve dist/ at http://localhost:4173 — use this to test offline/install
npm run icons      # regenerate the app icons from scripts/generate-icons.mjs
```

To try the mobile layout on a computer, narrow the browser window or use the device toolbar
in Chrome DevTools.

## Deploy over HTTPS

Service workers and installation require HTTPS (localhost is the only exception). `dist/` is a
plain static site, so any static host works. Pick one:

- **Netlify:** `npx netlify-cli deploy --prod --dir=dist` (or drag `dist/` onto
  app.netlify.com/drop). `public/_headers` sets the cache headers.
- **Vercel:** `npx vercel --prod` from this folder. `vercel.json` sets the cache headers.
  Build command `npm run build`, output directory `dist`.
- **Cloudflare Pages:** connect the repository, build command `npm run build`, output `dist`.
  `public/_headers` sets the cache headers.

The app assumes it is served from the domain root (`/`). To host it in a sub-folder (for
example GitHub Pages at `/habits/`), set `base` in `vite.config.js` and the manifest's
`start_url`, `scope` and `id` to that path.

Testing on your phone before deploying: the phone must reach the app over HTTPS, so a plain
`http://192.168.x.x` address will open the app but can't install it or run it offline. Use a
deployment, or a tunnel such as `npx cloudflared tunnel --url http://localhost:4173` while
`npm run preview` is running.

## Install on a phone

**iPhone (Safari):** open the HTTPS address in Safari → tap **Share** → **Add to Home Screen**
→ **Add**. Habit opens full screen from its icon. (Other iOS browsers can also add it from
their Share menu on iOS 16.4 and later.)

**Android (Chrome):** open the address → tap **Install app** when offered, or **⋮ → Add to
Home screen → Install**. Settings → *Install Habit* also triggers the prompt when Chrome
allows it.

## Offline and updates

- The whole app (HTML, JavaScript, CSS, icons) is precached by the service worker on first
  load, so it opens and works with no connection. Check-ins made offline are saved
  immediately on the device. A small banner says when you are offline.
- When you deploy a new version, the installed app checks for it on launch, when it returns
  to the foreground and hourly, then activates it automatically on the next load.

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
