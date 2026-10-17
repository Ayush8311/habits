import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  formatWeekRange,
  getDateRange,
  getDaysInMonth,
  getMonthDays,
  getWeekDays,
  isDateKey,
  isLeapYear,
  shiftMonth,
  toDateKey,
} from '../src/lib/dates.js';

test('leap years follow the Gregorian rules', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2000), true);
});

test('months have the right number of days, including February', () => {
  assert.equal(getDaysInMonth(2024, 1), 29);
  assert.equal(getDaysInMonth(2026, 1), 28);
  assert.equal(getDaysInMonth(2100, 1), 28);
  assert.equal(getMonthDays(2026, 9).length, 31);
  assert.equal(getMonthDays(2026, 10).length, 30);
  const leapFebruary = getMonthDays(2028, 1);
  assert.equal(leapFebruary.at(-1).key, '2028-02-29');
});

test('date keys are local and never shift across DST or month ends', () => {
  assert.equal(toDateKey(new Date(2026, 2, 29, 0, 30)), '2026-03-29');
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(getDateRange('2026-10-30', '2026-11-02').length, 4);
});

test('month navigation wraps years', () => {
  assert.equal(shiftMonth('2026-01-15', -1), '2025-12-01');
  assert.equal(shiftMonth('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftMonth('2024-01-31', 1), '2024-02-01');
});

test('weeks run Monday to Sunday', () => {
  const week = getWeekDays('2026-10-17'); // Saturday
  assert.equal(week[0].key, '2026-10-12');
  assert.equal(week[6].key, '2026-10-18');
  assert.equal(formatWeekRange('2026-09-28'), 'Sep 28 – Oct 4');
});

test('isDateKey rejects impossible dates', () => {
  assert.equal(isDateKey('2026-02-29'), false);
  assert.equal(isDateKey('2028-02-29'), true);
  assert.equal(isDateKey('2026-13-01'), false);
  assert.equal(isDateKey('nope'), false);
});
