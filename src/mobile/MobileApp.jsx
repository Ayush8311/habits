import { useEffect, useMemo, useState } from 'react';
import { CloudOff, TriangleAlert } from 'lucide-react';
import { useBackupActions } from '../components/useBackupActions.jsx';
import { useHabitDialogs } from '../components/useHabitDialogs.jsx';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { getMonthDays, getMonthOf } from '../lib/dates.js';
import { eligibleKeys } from '../lib/stats.js';
import { BottomNav, TABS } from './BottomNav.jsx';
import { CalendarScreen } from './screens/CalendarScreen.jsx';
import { InsightsScreen } from './screens/InsightsScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { TodayScreen } from './screens/TodayScreen.jsx';
import './MobileApp.css';

const readTabFromHash = () => {
  const tab = window.location.hash.replace(/^#\/?/, '');
  return TABS.some((item) => item.id === tab) ? tab : 'today';
};

/** The phone layout: four tabs with a fixed bottom bar, like a native iOS app. */
export function MobileApp({ store, todayKey }) {
  const [tab, setTab] = useState(readTabFromHash);
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

  // Reflect the tab in the URL without adding history entries, and follow
  // links that change it (for example #/calendar).
  useEffect(() => {
    window.history.replaceState(null, '', `#/${tab}`);
  }, [tab]);
  useEffect(() => {
    const onHashChange = () => setTab(readTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const selectTab = (next) => {
    if (next === tab) {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    setTab(next);
    window.scrollTo(0, 0);
  };

  const screens = {
    today: <TodayScreen store={store} todayKey={todayKey} onAddHabit={() => openHabitForm()} onEditHabit={openHabitForm} />,
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
      <SettingsScreen
        store={store}
        confirm={confirm}
        backup={backup}
        onAddHabit={() => openHabitForm()}
        onEditHabit={openHabitForm}
      />
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

      <main key={tab} className="m-screen" id="m-screen">
        {screens[tab]}
      </main>

      <BottomNav active={tab} onSelect={selectTab} />
      {backup.fileInput}
      {dialogs}
    </div>
  );
}
