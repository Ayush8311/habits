import { useEffect, useState } from 'react';
import { getTodayKey } from '../lib/dates.js';

/** Today's date key, refreshed when the day rolls over or the tab regains focus. */
export function useToday() {
  const [today, setToday] = useState(getTodayKey);

  useEffect(() => {
    const update = () => setToday(getTodayKey());
    const interval = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, []);

  return today;
}
