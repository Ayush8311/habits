// App preferences stored with the habit data (so they are mirrored on Android
// and travel in backups). Absent values mean the defaults, so data saved before a
// preference existed keeps the established behaviour.

export const THEMES = ['light', 'dark', 'system'];
export const DEFAULT_THEME = 'light';

// 'separate': Today and Tasks are their own pages (the original layout).
// 'combined': habits and tasks share one Home page; there is no Tasks tab.
export const PAGE_LAYOUTS = ['separate', 'combined'];
export const DEFAULT_PAGE_LAYOUT = 'separate';

// Combined page only: which section comes first.
export const COMBINED_ORDERS = ['tasks-first', 'habits-first'];
export const DEFAULT_COMBINED_ORDER = 'tasks-first';

// Separate pages only: the page the app opens on. 'today' is the Habits page.
export const OPENING_PAGES = ['tasks', 'today'];
export const DEFAULT_OPENING_PAGE = 'tasks';

/** Only known values are kept; an older save or backup without preferences gives {}. */
export function sanitizePreferences(input) {
  const preferences = {};
  if (input && typeof input === 'object') {
    if (THEMES.includes(input.theme)) preferences.theme = input.theme;
    if (PAGE_LAYOUTS.includes(input.pageLayout)) preferences.pageLayout = input.pageLayout;
    if (COMBINED_ORDERS.includes(input.combinedOrder)) preferences.combinedOrder = input.combinedOrder;
    if (OPENING_PAGES.includes(input.openingPage)) preferences.openingPage = input.openingPage;
  }
  return preferences;
}

export const getTheme = (preferences) => preferences?.theme ?? DEFAULT_THEME;
export const getPageLayout = (preferences) => preferences?.pageLayout ?? DEFAULT_PAGE_LAYOUT;
export const getCombinedOrder = (preferences) => preferences?.combinedOrder ?? DEFAULT_COMBINED_ORDER;
export const getOpeningPage = (preferences) => preferences?.openingPage ?? DEFAULT_OPENING_PAGE;

/**
 * The page to show at launch: a valid #/page link wins (reloads, deep links);
 * otherwise Combined opens on its single Home page and Separate on the chosen
 * opening page. A link to Tasks in the Combined layout shows Home.
 */
export function launchTab(preferences, hashTab, availableTabs) {
  if (availableTabs.includes(hashTab)) return hashTab;
  if (getPageLayout(preferences) === 'combined') return 'today';
  const opening = getOpeningPage(preferences);
  return availableTabs.includes(opening) ? opening : availableTabs[0];
}
