// Date helpers built around local-time "YYYY-MM-DD" keys.
// Keys are never derived from toISOString(), which converts to UTC and can
// shift the calendar day. Parsed dates are anchored at local noon so that
// daylight-saving transitions can never push a date into a neighbouring day.

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const pad = (value) => String(value).padStart(2, '0');

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isDateKey(value) {
  return (
    typeof value === 'string' &&
    DATE_KEY_PATTERN.test(value) &&
    toDateKey(parseDateKey(value)) === value
  );
}

export const getTodayKey = () => toDateKey(new Date());

export function addDays(key, amount) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** monthIndex is 0-based, matching Date. */
export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function describeDate(date) {
  const weekday = date.getDay();
  return {
    key: toDateKey(date),
    day: date.getDate(),
    weekday,
    isWeekend: weekday === 0 || weekday === 6,
  };
}

export function getMonthDays(year, monthIndex) {
  return Array.from({ length: getDaysInMonth(year, monthIndex) }, (_, index) =>
    describeDate(new Date(year, monthIndex, index + 1, 12)),
  );
}

/** Weeks start on Monday. */
export function getWeekStart(key) {
  const offset = (parseDateKey(key).getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function getWeekDays(key) {
  const start = getWeekStart(key);
  return Array.from({ length: 7 }, (_, index) => describeDate(parseDateKey(addDays(start, index))));
}

/** Inclusive range of keys from startKey to endKey. */
export function getDateRange(startKey, endKey) {
  const keys = [];
  for (let key = startKey; key <= endKey; key = addDays(key, 1)) keys.push(key);
  return keys;
}

/** The `count` days ending on endKey, oldest first. */
export function getRecentDays(endKey, count) {
  return Array.from({ length: count }, (_, index) =>
    describeDate(parseDateKey(addDays(endKey, index - count + 1))),
  );
}

export function getMonthOf(key) {
  const date = parseDateKey(key);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function getMonthStartKey(year, monthIndex) {
  return toDateKey(new Date(year, monthIndex, 1, 12));
}

/** First day of the month `delta` months away from the month containing key. */
export function shiftMonth(key, delta) {
  const { year, monthIndex } = getMonthOf(key);
  return getMonthStartKey(year, monthIndex + delta);
}

export const getMonthId = (key) => key.slice(0, 7);
export const isSameMonth = (a, b) => getMonthId(a) === getMonthId(b);

const formatter = (options) => new Intl.DateTimeFormat('en-US', options);
const formatters = {
  monthYear: formatter({ month: 'long', year: 'numeric' }),
  monthLong: formatter({ month: 'long' }),
  monthDay: formatter({ month: 'short', day: 'numeric' }),
  fullDate: formatter({ weekday: 'long', month: 'long', day: 'numeric' }),
  weekday: {
    narrow: formatter({ weekday: 'narrow' }),
    short: formatter({ weekday: 'short' }),
    long: formatter({ weekday: 'long' }),
  },
};

export const formatMonthYear = (key) => formatters.monthYear.format(parseDateKey(key));
export const formatMonthName = (key) => formatters.monthLong.format(parseDateKey(key));
export const formatMonthDay = (key) => formatters.monthDay.format(parseDateKey(key));
export const formatFullDate = (key) => formatters.fullDate.format(parseDateKey(key));
export const formatWeekday = (key, style = 'short') =>
  formatters.weekday[style].format(parseDateKey(key));

/** "Oct 12 – 18" or "Sep 28 – Oct 4". */
export function formatWeekRange(startKey) {
  const endKey = addDays(startKey, 6);
  const end = isSameMonth(startKey, endKey) ? String(parseDateKey(endKey).getDate()) : formatMonthDay(endKey);
  return `${formatMonthDay(startKey)} – ${end}`;
}
