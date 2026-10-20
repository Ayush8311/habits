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

// Separate pages only: the page the app opens on. 'today' is the Habit page.
export const OPENING_PAGES = ['tasks', 'today'];
export const DEFAULT_OPENING_PAGE = 'tasks';

// Add new bar and Add new sheet: which choice is first (the bar's left side, the
// sheet's top row). 'habits-first' is the original arrangement.
export const ADD_BAR_ORDERS = ['habits-first', 'tasks-first'];
export const DEFAULT_ADD_BAR_ORDER = 'habits-first';

// Separate pages only: the order of the Tasks and Habit tabs in the tab bar.
export const PAGE_ORDERS = ['tasks-first', 'habits-first'];
export const DEFAULT_PAGE_ORDER = 'tasks-first';

/** Only known values are kept; an older save or backup without preferences gives {}. */
export function sanitizePreferences(input) {
  const preferences = {};
  if (input && typeof input === 'object') {
    if (THEMES.includes(input.theme)) preferences.theme = input.theme;
    if (PAGE_LAYOUTS.includes(input.pageLayout)) preferences.pageLayout = input.pageLayout;
    if (COMBINED_ORDERS.includes(input.combinedOrder)) preferences.combinedOrder = input.combinedOrder;
    if (OPENING_PAGES.includes(input.openingPage)) preferences.openingPage = input.openingPage;
    if (ADD_BAR_ORDERS.includes(input.addBarOrder)) preferences.addBarOrder = input.addBarOrder;
    if (PAGE_ORDERS.includes(input.pageOrder)) preferences.pageOrder = input.pageOrder;
  }
  return preferences;
}

export const getTheme = (preferences) => preferences?.theme ?? DEFAULT_THEME;
export const getPageLayout = (preferences) => preferences?.pageLayout ?? DEFAULT_PAGE_LAYOUT;
export const getCombinedOrder = (preferences) => preferences?.combinedOrder ?? DEFAULT_COMBINED_ORDER;
export const getOpeningPage = (preferences) => preferences?.openingPage ?? DEFAULT_OPENING_PAGE;
export const getAddBarOrder = (preferences) => preferences?.addBarOrder ?? DEFAULT_ADD_BAR_ORDER;
export const getPageOrder = (preferences) => preferences?.pageOrder ?? DEFAULT_PAGE_ORDER;

/**
 * Tab ids in tab-bar order. Combined has no Tasks tab (tasks are on its single
 * page); Separate puts Tasks and Habit (the 'today' page) in the chosen order.
 * Ids never change with the order, so links, saved settings and the opening page
 * always mean the same page.
 */
export function tabOrder(preferences) {
  if (getPageLayout(preferences) === 'combined') return ['today', 'calendar', 'insights', 'settings'];
  const pages = getPageOrder(preferences) === 'habits-first' ? ['today', 'tasks'] : ['tasks', 'today'];
  return [...pages, 'calendar', 'insights', 'settings'];
}

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
