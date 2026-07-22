import { describe, it, expect } from 'vitest';
import { mapToWorld, worldToCell, tilePolygon } from '@/lib/iso';

describe('iso projection', () => {
  it('round-trips cell → world → cell', () => {
    const cells = [
      { x: 0, y: 0 },
      { x: 3, y: 5 },
      { x: 12, y: 7 },
      { x: 19, y: 0 },
      { x: 0, y: 19 },
    ];
    for (const c of cells) {
      expect(worldToCell(mapToWorld(c))).toEqual(c);
    }
  });

  it('produces a 4-corner diamond polygon', () => {
    const poly = tilePolygon({ x: 0, y: 0 });
    expect(poly).toHaveLength(4);
    // top and bottom share x; left and right share y (2:1 diamond).
    expect(poly[0]!.x).toBe(poly[2]!.x);
    expect(poly[1]!.y).toBe(poly[3]!.y);
  });
});
