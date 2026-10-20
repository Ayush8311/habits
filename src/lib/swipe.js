// Swipe decisions for the Add new bar and for task and habit rows, kept pure so
// they can be tested.

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

// ── Task and habit rows ─────────────────────────────────────────────────────
// A row follows a sideways drag and acts once it has travelled far enough:
// right completes, left offers the row's other action (postpone, undo). Short or
// mostly vertical movements do nothing, so scrolling a list never changes it.

export const ROW_COMMIT_FRACTION = 0.3;
export const ROW_MIN_COMMIT = 72;
export const ROW_MAX_COMMIT = 140;
// A press held this long without moving opens the editor.
export const LONG_PRESS_MS = 480;
export const LONG_PRESS_SLOP = 8;

/** How far a row must travel to act: 30% of its width, kept between 72 and 140px. */
export const rowCommitDistance = (width) =>
  Math.min(ROW_MAX_COMMIT, Math.max(ROW_MIN_COMMIT, width * ROW_COMMIT_FRACTION));

/** 'right', 'left' or null (spring back) for a released row drag. Disallowed sides never act. */
export function resolveRowSwipe(dx, width, { right = true, left = true } = {}) {
  const distance = rowCommitDistance(width);
  if (right && dx >= distance) return 'right';
  if (left && dx <= -distance) return 'left';
  return null;
}

/** Where the row is drawn for a finger offset: free up to the commit point, then
 *  resisting; a side with no action only gives a little before stopping. */
export function rowOffset(dx, width, { right = true, left = true } = {}) {
  const allowed = dx > 0 ? right : left;
  if (!allowed) return Math.sign(dx) * Math.min(Math.abs(dx) * 0.2, 24);
  const distance = rowCommitDistance(width);
  const over = Math.abs(dx) - distance;
  return over > 0 ? Math.sign(dx) * (distance + over * 0.35) : dx;
}

/** Whether a press has moved too far to still be a long press (or a tap). */
export const movedPastSlop = (dx, dy) => Math.hypot(dx, dy) > LONG_PRESS_SLOP;
