import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyMovement, knobOffset, resolveSwipe } from '../src/lib/swipe.js';

test('tiny or ambiguous movements never start a swipe', () => {
  assert.equal(classifyMovement(0, 0), 'pending');
  assert.equal(classifyMovement(6, 2), 'pending');
  assert.equal(classifyMovement(-9, 9), 'pending');
  // Diagonal: more sideways than down, but not clearly enough.
  assert.equal(classifyMovement(12, 10), 'pending');
});

test('vertical movement is left to page scrolling', () => {
  assert.equal(classifyMovement(3, 14), 'scroll');
  assert.equal(classifyMovement(-12, -12), 'scroll');
  assert.equal(classifyMovement(0, -40), 'scroll');
});

test('clear sideways movement becomes a drag in either direction', () => {
  assert.equal(classifyMovement(14, 2), 'drag');
  assert.equal(classifyMovement(-30, 8), 'drag');
});

test('right opens a task, left a habit, short drags spring back', () => {
  const travel = 140; // threshold = max(56, 63) = 63
  assert.equal(resolveSwipe(63, travel), 'task');
  assert.equal(resolveSwipe(200, travel), 'task');
  assert.equal(resolveSwipe(-63, travel), 'habit');
  assert.equal(resolveSwipe(62, travel), null);
  assert.equal(resolveSwipe(-20, travel), null);
  assert.equal(resolveSwipe(0, travel), null);
  // On a very narrow bar the minimum distance still applies.
  assert.equal(resolveSwipe(50, 60), null);
  assert.equal(resolveSwipe(56, 60), 'task');
});

test('the knob follows the finger, then resists past the end', () => {
  assert.equal(knobOffset(40, 100), 40);
  assert.equal(knobOffset(-100, 100), -100);
  assert.equal(knobOffset(140, 100), 110);
  assert.equal(knobOffset(-140, 100), -110);
});
