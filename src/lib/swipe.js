// Decisions for the Today action bar's swipe, kept pure so they can be tested.

// A drag only starts once the finger has clearly moved sideways; anything that
// starts vertical is left to the page so scrolling is never captured.
export const START_DISTANCE = 10;
export const HORIZONTAL_BIAS = 1.3;
export const COMMIT_FRACTION = 0.45;
export const MIN_COMMIT_DISTANCE = 56;

/** 'drag' (sideways, ours), 'scroll' (vertical, the page's) or 'pending' (too small to tell). */
export function classifyMovement(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay > START_DISTANCE && ay >= ax) return 'scroll';
  if (ax > START_DISTANCE && ax > ay * HORIZONTAL_BIAS) return 'drag';
  return 'pending';
}

/** What a finished drag does: 'task' (right), 'habit' (left) or null (spring back). */
export function resolveSwipe(dx, travel) {
  const threshold = Math.max(MIN_COMMIT_DISTANCE, travel * COMMIT_FRACTION);
  if (dx >= threshold) return 'task';
  if (dx <= -threshold) return 'habit';
  return null;
}

/** Position of the knob for a finger offset: follows up to `travel`, then resists. */
export function knobOffset(dx, travel) {
  const over = Math.abs(dx) - travel;
  return over > 0 ? Math.sign(dx) * (travel + over * 0.25) : dx;
}
