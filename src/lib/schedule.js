// Weekly schedules for habits. A schedule lists the weekdays a habit is meant to
// be done on, as Date#getDay() numbers (0 = Sunday … 6 = Saturday). `null` means
// every day: it is what habits saved before schedules existed have, so their
// statistics are unchanged. A schedule of all seven days is stored as null too.

import { parseDateKey } from './dates.js';

/** Monday-first order for display, matching the app's Monday week start. */
export const WEEKDAYS = [
  { day: 1, short: 'M', label: 'Monday' },
  { day: 2, short: 'T', label: 'Tuesday' },
  { day: 3, short: 'W', label: 'Wednesday' },
  { day: 4, short: 'T', label: 'Thursday' },
  { day: 5, short: 'F', label: 'Friday' },
  { day: 6, short: 'S', label: 'Saturday' },
  { day: 0, short: 'S', label: 'Sunday' },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Any input → a sorted list of 1–6 weekdays, or null for every day / nothing usable. */
export function normalizeSchedule(input) {
  if (!Array.isArray(input)) return null;
  const days = [...new Set(input.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  return days.length === 0 || days.length === 7 ? null : days;
}

/** The weekdays a schedule covers, as a list (all seven for null). */
export const scheduleDays = (schedule) => schedule ?? ALL_DAYS;

export const isScheduledOn = (schedule, key) => !schedule || schedule.includes(parseDateKey(key).getDay());

const WEEKDAY_SET = [1, 2, 3, 4, 5].join();
const WEEKEND_SET = [0, 6].join();

/** "Every day", "Weekdays", "Weekends", "Mon, Wed, Fri" … */
export function describeSchedule(schedule) {
  if (!schedule) return 'Every day';
  const key = schedule.join();
  if (key === WEEKDAY_SET) return 'Weekdays';
  if (key === WEEKEND_SET) return 'Weekends';
  return WEEKDAYS.filter(({ day }) => schedule.includes(day))
    .map(({ label }) => label.slice(0, 3))
    .join(', ');
}

/** "7 days per week", "1 day per week". */
export function describeFrequency(schedule) {
  const count = scheduleDays(schedule).length;
  return `${count} ${count === 1 ? 'day' : 'days'} per week`;
}
