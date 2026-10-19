// Manual ordering. Habits and tasks are shown in the order of their arrays, which
// is what gets saved and backed up, so no separate order field is needed and
// backups made before reordering existed keep their order.

/** Moves the item at `from` to `to` in a copy of `list`. */
export function moveItem(list, from, to) {
  if (from === to || from < 0 || from >= list.length) return list.slice();
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

/**
 * Puts the items named in `orderedIds` into that order, within the positions those
 * items already occupy; every item not named keeps its exact position. Unknown and
 * repeated ids are ignored, so a stale or partial order can never drop or duplicate
 * an item. (Reordering the pending tasks therefore leaves completed ones in place.)
 */
export function reorderSubset(items, orderedIds) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set();
  const named = [];
  for (const id of Array.isArray(orderedIds) ? orderedIds : []) {
    if (byId.has(id) && !seen.has(id)) {
      seen.add(id);
      named.push(byId.get(id));
    }
  }
  if (named.length === 0) return items;
  // The subset is every item that was named; their slots are refilled in the new order.
  const slots = [];
  items.forEach((item, index) => {
    if (seen.has(item.id)) slots.push(index);
  });
  const next = items.slice();
  slots.forEach((slot, index) => {
    next[slot] = named[index];
  });
  return next;
}
