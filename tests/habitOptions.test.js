import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contrastRatio,
  extractEmoji,
  getHabitColor,
  getHabitPalette,
  isEmoji,
  normalizeHex,
} from '../src/lib/habitOptions.js';
import { sanitizeState } from '../src/lib/storage.js';

test('hex input is normalised and validated', () => {
  assert.equal(normalizeHex('#368653'), '#368653');
  assert.equal(normalizeHex('368653'), '#368653');
  assert.equal(normalizeHex('#ABC'), '#aabbcc');
  assert.equal(normalizeHex(' #FfAa00 '), '#ffaa00');
  assert.equal(normalizeHex('#12345'), null);
  assert.equal(normalizeHex('zzzzzz'), null);
  assert.equal(normalizeHex(''), null);
});

test('colours resolve from presets or custom hex', () => {
  assert.equal(getHabitColor('ocean'), '#4F7EA8');
  assert.equal(getHabitColor('#368653'), '#368653');
  assert.equal(getHabitColor('nonsense'), '#5B9A70');
});

test('derived palette keeps any colour readable', () => {
  for (const color of ['#ffff00', '#f5f5f5', '#00ffcc', '#111111', '#368653', 'sage']) {
    const { ink, soft, on, base } = getHabitPalette(color);
    assert.ok(contrastRatio(ink, soft) >= 3, `${color}: icon ink ${ink} on ${soft}`);
    assert.ok(contrastRatio(on, base) >= 2.4, `${color}: check mark ${on} on ${base}`);
  }
  assert.equal(getHabitPalette('#ffff00').on, '#1d1d1f');
  assert.equal(getHabitPalette('#111111').on, '#ffffff');
});

test('emoji detection handles sequences, flags and pasted text', () => {
  assert.equal(extractEmoji('🏃'), '🏃');
  assert.equal(extractEmoji('  go 🏃‍♀️ now'), '🏃‍♀️');
  assert.equal(extractEmoji('👍🏽'), '👍🏽');
  assert.equal(extractEmoji('🇯🇵'), '🇯🇵');
  assert.equal(extractEmoji('1️⃣'), '1️⃣');
  assert.equal(extractEmoji('hello'), null);
  assert.equal(isEmoji('👨‍👩‍👧'), true);
  assert.equal(isEmoji('🏃 run'), false);
  assert.equal(isEmoji('a'), false);
  assert.equal(isEmoji(null), false);
});

test('old habits gain defaults; emoji and custom colours survive a round trip', () => {
  const legacy = sanitizeState({
    habits: [{ id: 'a', name: 'Read', icon: 'book', color: 'ocean', createdAt: '2026-09-01' }],
    completions: { a: { '2026-10-01': true } },
  });
  assert.deepEqual(legacy.habits[0], { id: 'a', name: 'Read', icon: 'book', emoji: null, color: 'ocean', createdAt: '2026-09-01', schedule: null });
  assert.deepEqual(legacy.completions, { a: { '2026-10-01': true } });

  const custom = sanitizeState({
    habits: [
      { id: 'b', name: 'Run', icon: 'walk', emoji: '🏃‍♀️', color: '#368653' },
      { id: 'c', name: 'Bad', icon: 'walk', emoji: 'not emoji', color: '#GGGGGG' },
      { id: 'd', name: 'Upper', icon: 'walk', color: '#ABCDEF' },
    ],
    completions: {},
  });
  assert.equal(custom.habits[0].emoji, '🏃‍♀️');
  assert.equal(custom.habits[0].color, '#368653');
  assert.equal(custom.habits[1].emoji, null);
  assert.equal(custom.habits[1].color, 'sage');
  assert.equal(custom.habits[2].color, '#abcdef');
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(custom))), custom);
});
