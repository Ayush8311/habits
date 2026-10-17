import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { HabitCalendar } from './components/calendar/HabitCalendar.jsx';
import { Header } from './components/Header.jsx';
import { InsightsSection } from './components/insights/InsightsSection.jsx';
import { MonthlyOverview } from './components/MonthlyOverview.jsx';
import { useBackupActions } from './components/useBackupActions.jsx';
import { useHabitDialogs } from './components/useHabitDialogs.jsx';
import { useInstallFlow } from './components/install/useInstallFlow.jsx';
import { COMPACT_QUERY, useMediaQuery } from './hooks/useMediaQuery.js';
import { addDays, getMonthDays, getMonthOf, isSameMonth, shiftMonth } from './lib/dates.js';
import { countCompletedOn, eligibleKeys, getOverallProgress } from './lib/stats.js';
import './DesktopApp.css';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** The desktop and laptop layout: overview, full monthly grid and insights on one page. */
export function DesktopApp({ store, todayKey }) {
  const { habits, completions } = store.state;
  const isCompact = useMediaQuery(COMPACT_QUERY);

  // `cursorKey` is the focused date; the visible month and week both derive from it.
  const [cursorKey, setCursorKey] = useState(todayKey);
  const [direction, setDirection] = useState('none');
  const [view, setView] = useState(() => (window.matchMedia(COMPACT_QUERY).matches ? 'week' : 'month'));

  const navigateTo = (key) => {
    setDirection(key > cursorKey ? 'forward' : key < cursorKey ? 'back' : 'none');
    setCursorKey(key);
  };
  const goToMonth = (delta) => {
    const target = shiftMonth(cursorKey, delta);
    navigateTo(isSameMonth(target, todayKey) ? todayKey : target);
  };

  const { year, monthIndex } = getMonthOf(cursorKey);
  const monthKeys = useMemo(
    () => eligibleKeys(getMonthDays(year, monthIndex).map((day) => day.key), todayKey),
    [year, monthIndex, todayKey],
  );
  const monthProgress = useMemo(() => getOverallProgress(habits, completions, monthKeys), [habits, completions, monthKeys]);
  const todayDone = useMemo(() => countCompletedOn(habits, completions, todayKey), [habits, completions, todayKey]);
  const totalCheckIns = useMemo(
    () => Object.values(completions).reduce((sum, record) => sum + Object.keys(record).length, 0),
    [completions],
  );

  const { openHabitForm, confirm, dialogs } = useHabitDialogs({ store, todayKey, monthKeys, monthKey: cursorKey });
  const backup = useBackupActions({ store, confirm });
  const installFlow = useInstallFlow();

  return (
    <div className="app">
      <Header
        todayKey={todayKey}
        onAddHabit={() => openHabitForm()}
        summary={`${plural(habits.length, 'habit')}, ${plural(totalCheckIns, 'check-in')}`}
        installFlow={installFlow}
        settingsActions={{
          export: backup.exportData,
          import: backup.chooseFile,
          reset: () =>
          confirm({
            title: 'Reset to sample data?',
            message: 'Your habits and check-ins will be replaced with the example set.',
            confirmLabel: 'Reset',
            onConfirm: store.resetToSample,
          }),
          clear: () =>
          confirm({
            title: 'Clear all check-ins?',
            message: `Your habits stay, but ${plural(totalCheckIns, 'check-in')} will be removed. This can’t be undone.`,
            confirmLabel: 'Clear check-ins',
            onConfirm: store.clearCompletions,
          }),
        }}
      />
      {backup.fileInput}

      {store.saveFailed && (
        <p className="save-warning" role="status">
          <TriangleAlert size={16} strokeWidth={1.9} aria-hidden="true" />
          Changes can’t be saved in this browser. Check that site storage is allowed.
        </p>
      )}

      <main className="app-main">
        <MonthlyOverview
          cursorKey={cursorKey}
          todayKey={todayKey}
          habitCount={habits.length}
          todayDone={todayDone}
          monthProgress={monthProgress}
          eligibleDays={monthKeys.length}
          direction={direction}
          onPrevious={() => goToMonth(-1)}
          onNext={() => goToMonth(1)}
          onToday={() => navigateTo(todayKey)}
        />

        <HabitCalendar
          habits={habits}
          completions={completions}
          todayKey={todayKey}
          cursorKey={cursorKey}
          view={view}
          isCompact={isCompact}
          direction={direction}
          onViewChange={setView}
          onShiftWeek={(delta) => navigateTo(addDays(cursorKey, delta * 7))}
          onToggle={store.toggleCompletion}
          onEditHabit={openHabitForm}
          onAddHabit={() => openHabitForm()}
        />

        <InsightsSection habits={habits} completions={completions} todayKey={todayKey} cursorKey={cursorKey} />
      </main>

      {dialogs}
      {installFlow.dialog}
    </div>
  );
}
