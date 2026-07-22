import { describe, it, expect } from 'vitest';
import { validateManifest, footprintCells, entranceCell } from '@/framework/building';

const good = {
  id: 'x',
  displayName: 'X',
  district: 'd',
  owner: 'o',
  enabled: true,
  hostedActivities: [],
  interior: null,
  exterior: { footprintTiles: [[0, 0]], entranceTile: [0, 1] },
};

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(validateManifest(good)).toEqual([]);
  });

  it('reports missing required strings', () => {
    expect(validateManifest({ ...good, id: '' }).join(' ')).toMatch(/id/);
  });

  it('reports a non-boolean enabled', () => {
    expect(validateManifest({ ...good, enabled: 'yes' }).join(' ')).toMatch(/enabled/);
  });

  it('rejects a bad exterior', () => {
    const e = validateManifest({ ...good, exterior: { footprintTiles: [], entranceTile: [0] } });
    expect(e.length).toBeGreaterThan(0);
  });

  it('never throws on garbage input', () => {
    expect(() => validateManifest(null)).not.toThrow();
    expect(validateManifest(42).length).toBeGreaterThan(0);
  });
});

describe('manifest accessors', () => {
  it('maps footprint + entrance tiles to cells', () => {
    const m = { ...good, interior: null } as unknown as Parameters<typeof footprintCells>[0];
    expect(footprintCells(m)).toEqual([{ x: 0, y: 0 }]);
    expect(entranceCell(m)).toEqual({ x: 0, y: 1 });
  });
});
