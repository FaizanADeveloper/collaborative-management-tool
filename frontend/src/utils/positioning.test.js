import { describe, it, expect } from 'vitest';
import {
  sortByPosition,
  calculateInsertPosition,
  buildRebalancedPositions,
} from './positioning';

describe('positioning utility', () => {
  it('sorts items by ascending position with createdAt tie-breaker', () => {
    const items = [
      { id: 'c', position: 2000, createdAt: '2026-01-03T00:00:00Z' },
      { id: 'b', position: 1000, createdAt: '2026-01-02T00:00:00Z' },
      { id: 'a', position: 1000, createdAt: '2026-01-01T00:00:00Z' },
    ];

    expect(sortByPosition(items).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('computes initial, start, midpoint, and end insert positions safely', () => {
    expect(calculateInsertPosition([], 0)).toEqual({
      position: 1000,
      needsRebalance: false,
    });

    const items = [
      { id: '1', position: 1000 },
      { id: '2', position: 2000 },
      { id: '3', position: 3000 },
    ];

    expect(calculateInsertPosition(items, 0)).toEqual({
      position: 500,
      needsRebalance: false,
    });

    expect(calculateInsertPosition(items, 1)).toEqual({
      position: 1500,
      needsRebalance: false,
    });

    expect(calculateInsertPosition(items, 3)).toEqual({
      position: 4000,
      needsRebalance: false,
    });
  });

  it('excludes moving item when calculating destination midpoint within the same list', () => {
    const items = [
      { id: 'a', position: 1000 },
      { id: 'b', position: 2000 },
      { id: 'c', position: 3000 },
    ];

    // Moving 'a' to destination index 1 (between 'b' and 'c')
    const result = calculateInsertPosition(items, 1, 'a');
    expect(result.position).toBe(2500);
    expect(result.needsRebalance).toBe(false);
  });

  it('flags precision exhaustion for rebalancing and builds clean 1000-step spacing', () => {
    const dense = [
      { id: 'a', position: 1 },
      { id: 'b', position: 1 + 1e-6 },
    ];

    const result = calculateInsertPosition(dense, 1);
    expect(result.needsRebalance).toBe(true);

    expect(buildRebalancedPositions(dense)).toEqual([
      { id: 'a', position: 1000 },
      { id: 'b', position: 2000 },
    ]);
  });
});
