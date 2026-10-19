import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudOff, TriangleAlert } from 'lucide-react';
import { useBackupActions } from '../components/useBackupActions.jsx';
import { useTaskDialogs } from '../components/tasks/useTaskDialogs.jsx';
import { useHabitDialogs } from '../components/useHabitDialogs.jsx';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { getMonthDays, getMonthOf } from '../lib/dates.js';
import { getPageLayout, launchTab } from '../lib/preferences.js';
import { eligibleKeys } from '../lib/stats.js';
import { AddActionBar } from './AddActionBar.jsx';
import { AddNewSheet } from './AddNewSheet.jsx';
import { BottomNav, TABS } from './BottomNav.jsx';
import { CalendarScreen } from './screens/CalendarScreen.jsx';
import { InsightsScreen } from './screens/InsightsScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { TasksScreen } from './screens/TasksScreen.jsx';
import { TodayScreen } from './screens/TodayScreen.jsx';
import './MobileApp.css';

const hashTab = () => window.location.hash.replace(/^#\/?/, '');
/** The tabs of a page layout: Combined has no Tasks tab (tasks are on its Home page). */
const tabsFor = (layout) => (layout === 'combined' ? TABS.filter((item) => item.id !== 'tasks') : TABS);
const readTab = (tabIds) => {
  const tab = hashTab();
  return tabIds.includes(tab) ? tab : 'today';
};

/**
 * The phone layout: tabs with a fixed bottom bar, like a native app. Pages switch
 * directly from the bar, with no swipe navigation and no slide/fade transition:
 * an earlier sideways slide made the page briefly wider than the screen, and
 * Android then zoomed the whole page out, which dropped the tab bar.
 */
export function MobileApp({ store, todayKey }) {
  const { preferences } = store.state;
  const layout = getPageLayout(preferences);
  const tabs = useMemo(() => tabsFor(layout), [layout]);
  const tabIds = useMemo(() => tabs.map((item) => item.id), [tabs]);
  // Launch page: a #/page link if present, else Combined's Home or the chosen opening
  // page. Read once; changing the setting later doesn't move the user.
  const [tab, setTab] = useState(() => launchTab(preferences, hashTab(), tabIds));
  // A #/tasks link in the Combined layout opens Home at its Tasks section.
  const [scrollToTasks, setScrollToTasks] = useState(() => layout === 'combined' && hashTab() === 'tasks');
  // Calendar position survives switching tabs.
  const [calendarCursor, setCalendarCursor] = useState(todayKey);
  const [calendarView, setCalendarView] = useState('month');
  const online = useOnlineStatus();
  const reducedMotion = usePrefersReducedMotion();

  // The editor shows figures for the current month.
  const { year, monthIndex } = getMonthOf(todayKey);
  const monthKeys = useMemo(
    () => eligibleKeys(getMonthDays(year, monthIndex).map((day) => day.key), todayKey),
    [year, monthIndex, todayKey],
  );
  const { openHabitForm, confirm, dialogs } = useHabitDialogs({ store, todayKey, monthKeys, monthKey: todayKey });
  const backup = useBackupActions({ store, confirm });
  const { openTaskForm, taskDialog } = useTaskDialogs({ store, todayKey, confirm });

  // Add new: the chosen form opens only after the sheet has fully closed, so the
  // sheet's focus restore can't pull focus away from the new form.
  const [addingNew, setAddingNew] = useState(false);
  const addChoice = useRef(null);
  const closeAddNew = useCallback(() => {
    const choice = addChoice.current;
    addChoice.current = null;
    setAddingNew(false);
    if (choice === 'habit') openHabitForm();
    if (choice === 'task') openTaskForm();
  }, [openHabitForm, openTaskForm]);

  // Reflect the tab in the URL without adding history entries, and follow
  // links that change it (for example #/calendar).
  useEffect(() => {
    window.history.replaceState(null, '', `#/${tab}`);
  }, [tab]);
  useEffect(() => {
    const onHashChange = () => {
      const wanted = hashTab();
      if (wanted === 'tasks' && layout === 'combined') setScrollToTasks(true);
      const next = readTab(tabIds);
      // A link to a page this layout doesn't have shows where it went instead.
      if (next !== wanted) window.history.replaceState(null, '', `#/${next}`);
      setTab(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [layout, tabIds]);

  // Switching to Combined while on Tasks: tasks now live on Today.
  useEffect(() => {
    if (!tabIds.includes(tab)) {
      setScrollToTasks(tab === 'tasks');
      setTab('today');
    }
  }, [tabIds, tab]);

  // Stable callbacks, so the memoised tab bar and Add new bar don't re-render
  // whenever anything in the store changes.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const navigate = useCallback(
    (next) => {
      if (next === tabRef.current || !tabIds.includes(next)) return;
      setScrollToTasks(false);
      setTab(next);
      window.scrollTo(0, 0);
    },
    [tabIds],
  );
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const selectTab = useCallback(
    (next) => {
      if (next === tabRef.current) {
        window.scrollTo({ top: 0, behavior: reducedMotionRef.current ? 'auto' : 'smooth' });
        return;
      }
      navigate(next);
    },
    [navigate],
  );
  const openAddNew = useCallback(() => setAddingNew(true), []);
  const newTask = useCallback(() => openTaskForm(), [openTaskForm]);
  const newHabit = useCallback(() => openHabitForm(), [openHabitForm]);
  const openCalendar = useCallback(() => navigate('calendar'), [navigate]);

  // The Add new bar lives where things get added: Today, and Tasks in the Separate layout.
  const showAddBar = tab === 'today' || tab === 'tasks';

  const screens = {
    today: (
      <TodayScreen
        store={store}
        todayKey={todayKey}
        layout={layout}
        onAddHabit={openHabitForm}
        onEditHabit={openHabitForm}
        onAddTask={openTaskForm}
        onEditTask={openTaskForm}
        onOpenCalendar={openCalendar}
        scrollToTasks={scrollToTasks}
      />
    ),
    tasks: <TasksScreen store={store} todayKey={todayKey} onAddTask={openTaskForm} onEditTask={openTaskForm} />,
    calendar: (
      <CalendarScreen
        store={store}
        todayKey={todayKey}
        cursorKey={calendarCursor}
        onCursorChange={setCalendarCursor}
        view={calendarView}
        onViewChange={setCalendarView}
        onEditHabit={openHabitForm}
        onAddHabit={() => openHabitForm()}
      />
    ),
    insights: <InsightsScreen store={store} todayKey={todayKey} />,
    settings: (
      <SettingsScreen store={store} confirm={confirm} backup={backup} />
    ),
  };

  return (
    <div className="m-app">
      {(!online || store.saveFailed) && (
        <div className="m-banners">
          {!online && (
            <p className="m-banner" role="status">
              <CloudOff size={14} strokeWidth={2} aria-hidden="true" />
              Offline. Everything still saves on this device.
            </p>
          )}
          {store.saveFailed && (
            <p className="m-banner m-banner-warning" role="alert">
              <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" />
              Changes can’t be saved. Check that site storage is allowed.
            </p>
          )}
        </div>
      )}

      <main key={tab} className={showAddBar ? 'm-screen has-add-bar' : 'm-screen'} id="m-screen">
        {screens[tab]}
      </main>

      {showAddBar && (
        <AddActionBar onTap={openAddNew} onSwipeRight={newTask} onSwipeLeft={newHabit} />
      )}
      <BottomNav tabs={tabs} active={tab} onSelect={selectTab} />
      {backup.fileInput}
      {addingNew && (
        <AddNewSheet
          onChoose={(choice) => {
            addChoice.current = choice;
          }}
          onClose={closeAddNew}
        />
      )}
      {taskDialog}
      {dialogs}
    </div>
  );
}
