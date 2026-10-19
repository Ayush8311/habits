import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeHsv, hexToHsv, hsvToHex, hueName } from '../src/lib/color.js';
import { normalizeHex } from '../src/lib/habitOptions.js';

test('HSV converts to stored hex for the full hue spectrum', () => {
  assert.equal(hsvToHex({ h: 0, s: 1, v: 1 }), '#ff0000');
  assert.equal(hsvToHex({ h: 30, s: 1, v: 1 }), '#ff8000');
  assert.equal(hsvToHex({ h: 60, s: 1, v: 1 }), '#ffff00');
  assert.equal(hsvToHex({ h: 120, s: 1, v: 1 }), '#00ff00');
  assert.equal(hsvToHex({ h: 180, s: 1, v: 1 }), '#00ffff');
  assert.equal(hsvToHex({ h: 240, s: 1, v: 1 }), '#0000ff');
  assert.equal(hsvToHex({ h: 300, s: 1, v: 1 }), '#ff00ff');
  assert.equal(hsvToHex({ h: 360, s: 1, v: 1 }), '#ff0000');
  assert.equal(hsvToHex({ h: 200, s: 0, v: 1 }), '#ffffff');
  assert.equal(hsvToHex({ h: 200, s: 1, v: 0 }), '#000000');
});

test('every generated colour is a valid stored colour', () => {
  for (let h = 0; h <= 360; h += 7) for (const s of [0, 0.33, 1]) for (const v of [0, 0.5, 1]) {
    const hex = hsvToHex({ h, s, v });
    assert.equal(normalizeHex(hex), hex);
  }
});

test('existing colours round-trip through HSV unchanged', () => {
  for (const hex of ['#5b9a70', '#4f7ea8', '#bc7656', '#123456', '#abcdef', '#808080', '#000000', '#ffffff']) {
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  }
  const { h, s, v } = hexToHsv('#ff0000');
  assert.deepEqual([h, s, v], [0, 1, 1]);
});

test('colours are described in words for screen readers', () => {
  assert.equal(hueName(120), 'green');
  assert.equal(hueName(220), 'blue');
  assert.equal(hueName(350), 'red');
  assert.equal(describeHsv({ h: 120, s: 0.3, v: 0.3 }), 'muted dark green');
  assert.equal(describeHsv({ h: 0, s: 0.02, v: 0.5 }), 'grey');
  assert.equal(describeHsv({ h: 0, s: 1, v: 0.05 }), 'black');
});
