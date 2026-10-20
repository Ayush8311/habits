import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudOff, TriangleAlert } from 'lucide-react';
import { useBackupActions } from '../components/useBackupActions.jsx';
import { useTaskDialogs } from '../components/tasks/useTaskDialogs.jsx';
import { useHabitDialogs } from '../components/useHabitDialogs.jsx';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { getMonthDays, getMonthOf } from '../lib/dates.js';
import { containerTransform } from '../lib/containerTransform.js';
import { getAddBarOrder, getPageLayout, launchTab, tabOrder } from '../lib/preferences.js';
import { cx } from '../lib/classNames.js';
import { eligibleKeys } from '../lib/stats.js';
import { AddActionBar } from './AddActionBar.jsx';
import { AddNewSheet } from './AddNewSheet.jsx';
import { BottomNav, buildTabs } from './BottomNav.jsx';
import { CalendarScreen } from './screens/CalendarScreen.jsx';
import { InsightsScreen } from './screens/InsightsScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { INBOX, TasksScreen } from './screens/TasksScreen.jsx';
import { TodayScreen } from './screens/TodayScreen.jsx';
import './MobileApp.css';

const hashTab = () => window.location.hash.replace(/^#\/?/, '');
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
  const combined = layout === 'combined';
  const addBarOrder = getAddBarOrder(preferences);
  // Tab ids in the order chosen in Settings (Separate: Tasks/Habit either way round).
  const tabKey = tabOrder(preferences).join();
  const tabIds = useMemo(() => tabKey.split(','), [tabKey]);
  const tabs = useMemo(() => buildTabs(tabIds, layout), [tabIds, layout]);
  // Launch page: a #/page link if present, else Combined's Home or the chosen opening
  // page. Read once; changing the setting later doesn't move the user.
  const [tab, setTab] = useState(() => launchTab(preferences, hashTab(), tabIds));
  // A #/tasks link in the Combined layout opens Home at its Tasks section.
  const [scrollToTasks, setScrollToTasks] = useState(() => layout === 'combined' && hashTab() === 'tasks');
  // Calendar position survives switching tabs.
  const [calendarCursor, setCalendarCursor] = useState(todayKey);
  const [calendarView, setCalendarView] = useState('month');
  // The task list opened on the Tasks page (a list id, INBOX or null), kept across pages.
  const [openList, setOpenList] = useState(null);
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
  const onListDeleted = useCallback((id) => setOpenList((current) => (current === id ? null : current)), []);
  const { openTaskForm, openPostpone, openListForm, taskDialog } = useTaskDialogs({
    store,
    todayKey,
    confirm,
    onListDeleted,
  });
  const openListRef = useRef(openList);
  openListRef.current = openList;

  // Add new: the chosen form opens only after the sheet has fully closed, so the
  // sheet's focus restore can't pull focus away from the new form.
  const [addingNew, setAddingNew] = useState(false);
  const addChoice = useRef(null);
  const createRef = useRef(null); // { habit, task }, set below
  const closeAddNew = useCallback(() => {
    const choice = addChoice.current;
    addChoice.current = null;
    setAddingNew(false);
    if (choice) createRef.current[choice]();
  }, []);

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
  const openCalendar = useCallback(() => navigate('calendar'), [navigate]);

  // Combined page: bring a section (Habits or Tasks) into view, smoothly, then run
  // `then`. Measured from the section's real position, so it works with either
  // section order and any screen size; already in view → no scrolling at all.
  const revealSection = useCallback((sectionId, then) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      then();
      return;
    }
    const top = section.getBoundingClientRect().top;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(maxScroll, window.scrollY + top - 12));
    const inView = top >= 0 && top < window.innerHeight * 0.45;
    if (inView || Math.abs(target - window.scrollY) < 4) {
      then();
      return;
    }
    if (reducedMotionRef.current) {
      window.scrollTo(0, target);
      then();
      return;
    }
    let finished = false;
    let timer = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      window.removeEventListener('scrollend', finish);
      then();
    };
    window.addEventListener('scrollend', finish);
    timer = window.setTimeout(finish, 650); // where scrollend isn't supported
    window.scrollTo({ top: target, behavior: 'smooth' });
  }, []);

  // Creating a habit or a task always happens where that kind of item lives:
  // Separate pages → switch to the Habit or Tasks page first (no switch when already
  // there); Combined page → scroll to its Habits or Tasks section. The form that
  // opens is always the kind that was chosen.
  const newHabit = useCallback(() => {
    if (combined) {
      revealSection('home-habits', () => openHabitForm());
      return;
    }
    navigate('today');
    openHabitForm();
  }, [combined, navigate, openHabitForm, revealSection]);
  const newTask = useCallback(() => {
    if (combined) {
      revealSection('home-tasks', () => openTaskForm());
      return;
    }
    navigate('tasks');
    // A new task from inside an opened list goes into that list.
    const list = openListRef.current;
    openTaskForm(null, { listId: list && list !== INBOX ? list : undefined });
  }, [combined, navigate, openTaskForm, revealSection]);
  createRef.current = { habit: newHabit, task: newTask };
  const addTaskToList = useCallback((listId) => openTaskForm(null, { listId }), [openTaskForm]);
  const newList = useCallback(() => openListForm(null, { onCreated: (id) => setOpenList(id) }), [openListForm]);

  // Opening a list card: the card grows into the list's page; Back shrinks the page
  // into its card again, at the scroll position the overview was left at.
  const overviewScroll = useRef(0);
  const showList = useCallback((id, from) => {
    const previous = openListRef.current;
    if (id === previous) return;
    const opening = id !== null;
    if (opening) overviewScroll.current = window.scrollY;
    containerTransform({
      from,
      direction: opening ? 'open' : 'close',
      reducedMotion: reducedMotionRef.current,
      update: () => setOpenList(id),
      after: () => window.scrollTo(0, opening ? 0 : overviewScroll.current),
      to: () =>
        opening
          ? document.getElementById('m-screen')
          : document.querySelector(`[data-list-card="${CSS.escape(previous ?? '')}"]`),
    });
  }, []);
  const editList = useCallback((listId) => openListForm(listId), [openListForm]);

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
        onPostponeTask={openPostpone}
        onOpenCalendar={openCalendar}
        scrollToTasks={scrollToTasks}
      />
    ),
    tasks: (
      <TasksScreen
        store={store}
        todayKey={todayKey}
        openList={openList}
        onOpenList={showList}
        onAddTask={addTaskToList}
        onEditTask={openTaskForm}
        onPostponeTask={openPostpone}
        onNewList={newList}
        onEditList={editList}
      />
    ),
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

      <main
        key={tab}
        className={cx('m-screen', showAddBar && 'has-add-bar', tab === 'tasks' && openList && 'is-list-view')}
        id="m-screen"
      >
        {screens[tab]}
      </main>

      {showAddBar && (
        <AddActionBar order={addBarOrder} onTap={openAddNew} onTask={newTask} onHabit={newHabit} />
      )}
      <BottomNav tabs={tabs} active={tab} onSelect={selectTab} />
      {backup.fileInput}
      {addingNew && (
        <AddNewSheet
          order={addBarOrder}
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
