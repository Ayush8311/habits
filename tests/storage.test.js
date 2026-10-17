import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeState } from '../src/lib/storage.js';

test('sanitizeState drops invalid habits, dates and orphaned records', () => {
  const result = sanitizeState({
    habits: [
      { id: 'a', name: '  Read  ', icon: 'book', color: 'ocean' },
      { id: 'a', name: 'Duplicate id' },
      { id: 'b', name: '   ' },
      { id: 'c', name: 'Walk', icon: 'not-an-icon', color: 'neon' },
      null,
    ],
    completions: {
      a: { '2026-10-01': true, '2026-02-30': true, '2026-10-02': false, garbage: true },
      ghost: { '2026-10-01': true },
    },
  });
  assert.deepEqual(result.habits.map((h) => h.name), ['Read', 'Walk']);
  assert.equal(result.habits[1].icon, 'leaf');
  assert.equal(result.habits[1].color, 'sage');
  assert.deepEqual(result.completions, { a: { '2026-10-01': true }, c: {} });
});

test('sanitizeState rejects non-state input', () => {
  assert.equal(sanitizeState(null), null);
  assert.equal(sanitizeState({ habits: 'nope' }), null);
});
