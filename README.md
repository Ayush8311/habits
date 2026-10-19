# Habit

A calm, Apple-inspired habit tracker. One React + Vite project with two layouts that share
the same data:

- **Desktop** (wider than 820px): overview, full monthly grid and insights on one page.
- **Mobile** (820px and narrower): an installable app with Today, Tasks, Calendar, Insights
  and Settings tabs, built to live on your phone's home screen and work offline.
- **Android app**: the same app packaged with Capacitor as an APK (see [Android app](#android-app)).

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 — desktop and mobile layouts, no service worker
npm test           # unit tests for dates, streaks, stats and storage
npm run build      # production build + service worker in dist/
npm run preview    # serve dist/ at http://localhost:4173 — use this to test offline and installing
npm run verify     # check dist/: manifest, icons, service worker, linked assets
npm run icons      # regenerate every icon in public/ from assets/habit-icon.svg
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

## Releases

Versions follow [semantic versioning](https://semver.org): `v1.0.1` for fixes, `v1.1.0` for new
features that keep existing data working, `v2.0.0` for breaking changes (for example a data
format older versions can't read). Pre-releases use a suffix such as `v1.1.0-rc.1`.

Ordinary commits never create a release. To publish one:

1. Write the notes in `.github/release-notes/vX.Y.Z.md` (copy the previous file's sections:
   What's new, Improvements, Bug fixes, Installation, Known limitations). `{{APP_URL}}` is
   replaced with the live app address.
2. Set the version: `npm version X.Y.Z --no-git-tag-version`, then commit and push to `main`.
3. Optional dry run: **Actions → Release → Run workflow**, enter `vX.Y.Z`.
4. Tag and push: `git tag -a vX.Y.Z -m "Habit vX.Y.Z" && git push origin vX.Y.Z`

`.github/workflows/release.yml` then checks the tag, runs the tests, builds and verifies the
app, confirms the live site is up and publishes the release with the notes, an automatic
changelog and `habit-vX.Y.Z-web.zip` (a static build for self-hosting). Tags are never reused:
a fix after a release gets the next patch version. Re-running the workflow for an existing
release changes nothing.

The same tag also starts `.github/workflows/android-apk.yml`, which builds the signed Android
APK and attaches it to that release (see [Android app](#android-app)).

The web app is installed from the website; Android users can also download the APK from the
release. Deploying the website (`deploy-pages.yml`) is separate from releasing.

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

## Android app

The same React app also ships as a native Android app built with
[Capacitor](https://capacitorjs.com). The APK contains the production build (`dist/`) and
loads it locally from `https://localhost` inside the app — never from the website — so it
works offline from the first launch. In the app there is no service worker or install
button; backups are saved through Android's share sheet.

- App ID: `com.ayush8311.habit` (the debug build is `com.ayush8311.habit.debug`, named
  "Habit Debug", and installs alongside it). Android 7.0 (API 24) or newer.
- `capacitor.config.json` configures Capacitor; `android/` is the native project.
- Version: `versionName` is `package.json`'s `version`, and
  `versionCode = MAJOR×10000 + MINOR×100 + PATCH` (1.0.1 → 10001), set in
  `android/app/build.gradle`. Bump `package.json` and both follow.
- Icons and launch screen come from `assets/habit-icon.svg` via `npm run icons`.
- Permissions: only `INTERNET` (Capacitor's default; Habit makes no network requests).

### Set up Android tools (once)

1. Install [Android Studio](https://developer.android.com/studio). Its setup wizard installs
   the Android SDK; afterwards, in **Settings → Languages & Frameworks → Android SDK**, make
   sure **Android 16 (API 36)** and **Android SDK Build-Tools 36** are installed.
2. Install JDK 21 (Android Studio's bundled JDK works), and set
   `export ANDROID_HOME="$HOME/Library/Android/sdk"` (macOS default) in your shell profile.

### Build and run locally

```bash
npm run android:sync     # npm run build + npx cap sync android (do this after every web change)
npx cap open android     # open in Android Studio, then Run ▶ on a device or emulator
npm run android:debug    # or build a debug APK from the command line
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Install it with
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`, or copy it to a phone.

### Release signing

Release APKs are signed with Habit's own release key. Android only installs an update over
an existing app if it is signed with the **same** key, so create it once and keep it safe:
if it is lost, users must uninstall (and lose their in-app data unless they exported a
backup) to install a newer version.

1. Create the keystore **outside the repository** (it is git-ignored anyway):

   ```bash
   keytool -genkeypair -v -keystore ~/habit-release.jks -alias habit \
     -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Habit"
   ```

   Choose a strong password. Back up `~/habit-release.jks` and the password somewhere
   safe (for example a password manager). Never commit it or paste it into an issue.

2. Add four **repository secrets** (GitHub → Settings → Secrets and variables → Actions →
   Secrets → New repository secret):

   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | output of `base64 -i ~/habit-release.jks` (macOS) or `base64 -w0 ~/habit-release.jks` (Linux) |
   | `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
   | `ANDROID_KEY_ALIAS` | `habit` |
   | `ANDROID_KEY_PASSWORD` | the key password (the same as the keystore password unless you chose another) |

   On macOS, `base64 -i ~/habit-release.jks | pbcopy` copies the value straight to the
   clipboard.

3. Add the **repository variable** `ANDROID_SIGNING_CERT_SHA256` (Variables tab) with the
   fingerprint printed by
   `keytool -list -v -keystore ~/habit-release.jks -alias habit | grep SHA256:`.
   Release builds require it, and fail if the APK is signed with any other key.

Because the alias `habit` is a secret, GitHub Actions masks the word "habit" in every log,
so file names show as `***-v1.0.1.apk` there. Only the logs are affected: artifacts and
release files keep their real names, and the workflow never passes file names between
jobs through outputs, which GitHub drops when they contain a secret.

To build a signed APK locally, create `android/keystore.properties` (git-ignored):

```properties
storeFile=/Users/you/habit-release.jks
storePassword=…
keyAlias=habit
keyPassword=…
```

then run `npm run android:release`. The APK is
`android/app/build/outputs/apk/release/app-release.apk`. Without signing configured, a
release build stops with an error instead of producing an unsigned APK.

### APKs in GitHub Releases

`.github/workflows/android-apk.yml` builds the APK:

- **On a version tag** (`git push origin v1.0.1`): tests, builds and verifies the web app,
  syncs Capacitor, builds a signed release APK and checks it with
  `scripts/android-apk.sh` (signature, release certificate, package name, version, not
  debuggable). It uploads the APK and its `.sha256` as the workflow artifact
  `habit-android-release`; the `verify-artifact` job downloads and checks it again; then
  the `attach` job adds `habit-v1.0.1.apk` and `habit-v1.0.1.apk.sha256` to the release
  that `release.yml` publishes for that tag. It never creates a second release and never
  replaces an attached file. Missing secrets, a missing certificate variable, a wrong
  signature or a release that doesn't appear within 20 minutes fail the run with a message.
- **Manually** (Actions → Android APK → Run workflow): `debug` builds a test APK, `release`
  a signed one. `build` and `verify-artifact` run as above; `attach` is skipped, so
  nothing is published. Download the APK from the run's **Artifacts** section
  (`habit-android-release` or `habit-android-debug`), named `habit-v1.0.1-<commit>.apk`.

To check a downloaded APK yourself (needs Node, Java and Android build-tools), unzip the
artifact into an empty folder and run, from the repository at the commit it was built from:

```sh
EXPECTED_CERT=<ANDROID_SIGNING_CERT_SHA256> \
  ANDROID_HOME=~/Library/Android/sdk \
  scripts/android-apk.sh verify release ~/Downloads/habit-android-release
```

Add `TAG=v1.0.1` for an APK from a release.

### Installing the APK on Android

1. Open the release on GitHub (Releases → the latest version) on the phone and download
   `habit-vX.Y.Z.apk` under **Assets**.
2. Open the file. Android may ask you to allow your browser or file manager to **install
   unknown apps** (Settings → Apps → Special app access → Install unknown apps); allow it
   for that app, go back and tap **Install**. Play Protect may warn about an app that
   isn't from Google Play.
3. Updates: download the newer APK from a later release and open it. Because it is signed
   with the same key and has a higher `versionCode`, it installs over the existing app and
   keeps your habits.

The app's data is separate from the website's and the PWA's: use Export backup / Import
backup to move habits between them.

## Offline and updates

- The service worker precaches only the app's own build files (HTML, JS, CSS, icons). After the
  first load the app opens with no connection, and check-ins save to the device immediately.
- When a new version is deployed, the app downloads it in the background (checked on launch,
  when it returns to the foreground and hourly) and shows **"A new version is ready."** with a
  **Reload** button. Nothing reloads without you choosing to.

## Using Habit

- **Habits** repeat on the weekdays you choose (**Repeat on** in the habit form; every day by
  default). Days a habit isn't scheduled are shown as "Not scheduled" and never count as missed.
- **Tasks** are one-off to-dos with an optional due date, optional time and optional Low /
  Medium / High priority. They live in the Tasks tab (and a Tasks section on desktop) and never
  affect habit statistics.
- **Adding**: on Today (and Tasks), tap the bar at the bottom for **Add new** (Habit or Task),
  or swipe it right for a new task and left for a new habit. The name field is focused at once.
- **Page layout** (Settings → Page layout): **Separate pages** (default: habits on Today, tasks
  on their own Tasks page) or **Combined page** (habits and tasks together on Today under a
  compact header, no Tasks tab). Switching changes only the layout, never any data.
- **Moving between pages**: swipe left or right on a page, or use the tab bar. Swipes that start
  on the Add new bar, a drag handle, a wheel or slider, a text field, an open sheet, or the
  screen edge (Android's back gesture) are left alone.
- **Reordering**: tap **Edit**, then drag a row by its handle (or focus the handle and use the
  arrow keys). Habits and tasks are ordered separately, in your own order; nothing is sorted
  automatically.
- **Colours**: preset swatches, or **Custom** for a hue slider and a saturation/brightness
  board. A custom colour is applied only when you tap **Apply color**.
- **Appearance**: Settings → Appearance → Light (default), Dark or System. On desktop it is in
  the gear menu.

### How the figures are calculated

Every figure uses one definition (`src/lib/stats.js`): a habit is **expected** on a day when the
day is one of its scheduled weekdays and on or after the day it was created.

- **Completion rate** (Today, This week, month consistency, per habit, Summary): expected habit
  instances that were checked in ÷ expected habit instances.
- **Perfect Day**: a past or current day with at least one expected habit, on which every
  expected habit was checked in. Days with nothing expected are never Perfect Days.
- **Best Week**: of the last 8 Monday–Sunday weeks (the current week up to today), the highest
  completion rate as defined above; weeks with nothing expected or nothing checked in are
  skipped, and a tie keeps the earlier week.
- **Best day (last 30 days)**: the day with the most expected habits checked in.
- **Streaks**: consecutive scheduled days with a check-in, counting back from today (an
  unchecked today doesn't break it yet). Unscheduled days are skipped. Back-filled check-ins
  count towards streaks even from before a habit was created.
- **Week comparison**: this week's rate against last week's, shown only when last week has
  check-ins.

Fallbacks for older data: a habit without a schedule is expected every day; its current schedule
applies to its whole history (earlier schedules aren't recorded); a habit without a creation date
counts from its first check-in. Check-ins on days a habit isn't expected stay stored and visible
but don't count towards rates or Perfect Days.

## Your data

Habits, check-ins, tasks and the appearance setting are stored in the browser's LocalStorage
under `habit.state.v1` (the same key the desktop version has always used, so existing data
carries over). Backups contain all of it. Importing a backup from before tasks existed replaces
habits and check-ins but keeps the tasks and appearance already on the device.

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
    AddActionBar.jsx         Today's swipe/tap add bar; AddNewSheet.jsx is its Add new sheet
    screens/                 TodayScreen, TasksScreen, CalendarScreen, InsightsScreen, SettingsScreen
  components/                shared UI: calendar grid, insights, habit form, dialogs, buttons
    tasks/                   task list, task form (wheels, keyboard handling), task dialogs
    ColorPicker.jsx          habit colour swatches, custom colour and hex input
    ui/WheelPicker.jsx       scroll-snap wheel columns (date and time pickers)
    useHabitDialogs.jsx      add/edit/delete/confirm dialogs used by both layouts
    useBackupActions.jsx     export/import
  hooks/                     useHabitStore, useToday, media queries, online status
  data/repository.js         storage interface (LocalStorage today)
  data/appReducer.js         every data change, as a pure reducer
  data/defaultHabits.js      habits a new installation starts with (no check-ins)
  lib/                       pure logic: dates, stats, insights, schedules, tasks, theme,
                             storage validation, backup
  pwa.js                     service worker registration, install prompt
assets/habit-icon.svg        master app icon (edit this, then `npm run icons`)
scripts/generate-icons.mjs   renders public/ icons from the master (192/512, maskable 512,
                             Apple touch 180, favicon 32 and SVG) and the Android launcher icons
scripts/android-apk.sh       names, packages and verifies APKs (used by the APK workflow)
capacitor.config.json        Capacitor (Android app) configuration
android/                     native Android project; web files are copied in by `cap sync`
```

### Data model

```js
{
  version: 1,
  habits: [{ id, name, icon, emoji, color, createdAt: 'YYYY-MM-DD',
             schedule: null | [0–6, …] }],          // null = every day; 0 = Sunday
  completions: { [habitId]: { 'YYYY-MM-DD': true } },
  tasks: [{ id, name, notes, dueDate: null | 'YYYY-MM-DD', dueTime: null | 'HH:MM',
            priority: null | 'low' | 'medium' | 'high', completedAt: null | ms, createdAt: ms }],
  preferences: { theme?: 'light' | 'dark' | 'system',       // absent = light
                 pageLayout?: 'separate' | 'combined' }  // absent = separate
}
```

Habits and tasks are shown in the order of their arrays, so that order is what Edit-mode
reordering changes and what backups carry; older backups simply keep the order they were saved
in. `tasks`, `preferences` and `schedule` are optional additions to schema version 1: data saved by
earlier versions simply doesn't have them and reads exactly as before, so no migration runs. A
task's time is only kept with a date, and a missing priority stays missing (it is never shown or
saved as a default). Dates are built from local calendar fields (never `toISOString`) and parsed
at local noon, so time zones and daylight-saving changes can't move a check-in or due date to
another day. A habit's rates count from the day it was created, so new habits aren't scored as
having missed earlier days.
