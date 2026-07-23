import { describe, it, expect } from "vitest";
import { validateManifest } from "./manifest";

const good = {
  id: "ice_cream_cart",
  displayName: "Ice Cream Cart",
  district: "market_street",
  owner: "santhosh",
  enabled: true,
  hostedActivities: ["C4-BEG-09"],
  exterior: { footprintTiles: [[0, 0]], entranceTile: [1, 1] },
};

describe("building manifest validation", () => {
  it("well-formed manifest passes", () => {
    expect(validateManifest(good)).toEqual([]);
  });

  it("missing required fields fail", () => {
    expect(validateManifest({ id: "x" }).length).toBeGreaterThan(0);
  });

  it("non-array footprintTiles fails", () => {
    const bad = { ...good, exterior: { footprintTiles: "nope", entranceTile: [0, 1] } };
    expect(validateManifest(bad).length).toBeGreaterThan(0);
  });

  it("malformed entranceTile fails", () => {
    const bad = { ...good, exterior: { footprintTiles: [[0, 0]], entranceTile: [0] } };
    expect(validateManifest(bad).length).toBeGreaterThan(0);
  });

  it("empty footprint fails", () => {
    const bad = { ...good, exterior: { footprintTiles: [], entranceTile: [0, 1] } };
    expect(validateManifest(bad).length).toBeGreaterThan(0);
  });
});
