import { UpdateToast } from './components/install/UpdateToast.jsx';
import { DesktopApp } from './DesktopApp.jsx';
import { useAppliedTheme } from './hooks/useAppliedTheme.js';
import { useHabitStore } from './hooks/useHabitStore.js';
import { MOBILE_QUERY, useMediaQuery } from './hooks/useMediaQuery.js';
import { useToday } from './hooks/useToday.js';
import { getTheme } from './lib/preferences.js';
import { MobileApp } from './mobile/MobileApp.jsx';

/**
 * Owns the shared habit store and picks a layout. Both layouts read and write
 * the same data, so resizing a window or rotating a tablet never loses state.
 */
export default function App() {
  const todayKey = useToday();
  const store = useHabitStore();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  useAppliedTheme(getTheme(store.state.preferences));

  return (
    <>
      {isMobile ? <MobileApp store={store} todayKey={todayKey} /> : <DesktopApp store={store} todayKey={todayKey} />}
      <UpdateToast />
    </>
  );
}
