const MIN_POSITION_GAP = 1e-5;
const STEP_SIZE = 1000;

/**
 * Deterministic comparator matching backend `{ position: 1, createdAt: 1 }` ordering.
 */
export function sortByPosition(items = []) {
  return [...items].sort((a, b) => {
    const posA = Number.isFinite(a?.position) ? a.position : Number.MAX_SAFE_INTEGER;
    const posB = Number.isFinite(b?.position) ? b.position : Number.MAX_SAFE_INTEGER;
    if (posA !== posB) {
      return posA - posB;
    }
    const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
}

/**
 * Computes a midpoint floating-point position (>= 0, finite) for inserting an item
 * at `destinationIndex` inside `items` (after removing `excludeId` if present).
 *
 * Returns `{ position, needsRebalance }` so callers can detect extreme precision exhaustion.
 */
export function calculateInsertPosition(items = [], destinationIndex = 0, excludeId = null) {
  const ordered = sortByPosition(items).filter((item) => item?.id !== excludeId);

  if (ordered.length === 0) {
    return { position: STEP_SIZE, needsRebalance: false };
  }

  const clampedIndex = Math.max(0, Math.min(destinationIndex, ordered.length));

  if (clampedIndex === 0) {
    const firstPos = Number.isFinite(ordered[0].position) ? ordered[0].position : STEP_SIZE;
    if (firstPos <= MIN_POSITION_GAP) {
      return { position: 0, needsRebalance: true };
    }
    const nextPos = firstPos / 2;
    return {
      position: nextPos,
      needsRebalance: nextPos < MIN_POSITION_GAP || firstPos - nextPos < MIN_POSITION_GAP,
    };
  }

  if (clampedIndex >= ordered.length) {
    const lastPos = Number.isFinite(ordered[ordered.length - 1].position)
      ? ordered[ordered.length - 1].position
      : ordered.length * STEP_SIZE;
    return { position: lastPos + STEP_SIZE, needsRebalance: false };
  }

  const prev = ordered[clampedIndex - 1];
  const next = ordered[clampedIndex];
  const prevPos = Number.isFinite(prev.position) ? prev.position : 0;
  const nextPos = Number.isFinite(next.position) ? next.position : prevPos + STEP_SIZE;
  const midpoint = (prevPos + nextPos) / 2;

  return {
    position: Math.max(0, midpoint),
    needsRebalance:
      !Number.isFinite(midpoint) ||
      nextPos - prevPos < MIN_POSITION_GAP * 2 ||
      midpoint === prevPos ||
      midpoint === nextPos,
  };
}

/**
 * Generates cleanly spaced sequential positions (1000, 2000, ...) for rebalancing.
 */
export function buildRebalancedPositions(orderedItems = []) {
  return orderedItems.map((item, idx) => ({
    id: item.id,
    position: (idx + 1) * STEP_SIZE,
  }));
}
