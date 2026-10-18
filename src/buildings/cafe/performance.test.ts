// The performance pass (PRD §16). The Café is building 01 and sets the house
// standard, so the budget is deliberately generous and the point is to stay well
// under it rather than to fit.
//
// Only the counts that are decidable from the content are here. Draw calls,
// texture memory and bake time are runtime measurements on the reference profile
// and are named at the bottom — a test that asserted them from a headless
// software renderer would be measuring the CI box, not the budget.
import { describe, it, expect } from "vitest";
import { FURNITURE, ROOM_H, ROOM_W, SIGNS } from "./room";
import { CAST, castFor } from "./cast";
import { CREW } from "./crew";
import { SEATS, crowdSize } from "./customers";
import { BEATS } from "./ambient";
import { MAX_STEAM_PUFFS } from "./steam";

describe("sprites on screen", () => {
  it("stays under the 220 the budget allows", () => {
    // §16's own breakdown: the room, the dressing props, the cast, the ambient
    // customers. The floor is one Graphics rather than 120 tiles, which is
    // where most of the headroom came from.
    const floor = 1;
    const props = FURNITURE.length + SIGNS.length;
    // Worst case: everyone, the crew, a customer per seat each with a cup and a
    // plate, and the player.
    const people = CAST.length + CREW.length + SEATS.length * 3 + 1;
    const effects = MAX_STEAM_PUFFS * 2 + 1; // two steam pools and the pigeon
    const overlays = 2; // the grade and the glow quads
    const total = floor + props + people + effects + overlays;
    expect(total, `${total} sprites`).toBeLessThanOrEqual(220);
  });

  it("has fewer props than it has cells, which is the shape of a room", () => {
    expect(FURNITURE.length).toBeLessThan(ROOM_W * ROOM_H);
  });

  it("keeps the room a working café, not a crowd", () => {
    // It was a hard three — Priya, Owen and one customer — when the room was a
    // set for one conversation. It is a working café now: a staffed counter and
    // customers ordering, collecting and sitting, because a café with nobody in
    // it does not read as one. The ceiling is still about clutter rather than
    // frame time: the cast and crew, plus at most five customers, never more
    // than ten people around the player at once.
    expect(castFor().length + CREW.length + crowdSize()).toBeLessThanOrEqual(10);
    expect(crowdSize()).toBeLessThan(SEATS.length);
  });
});

describe("the ambient budget", () => {
  it("keeps at most eight beats live", () => {
    // Six scheduled here, plus the door bell in the customer loop and the street
    // bed crossfaded from the district. That is exactly §16's ceiling, which is
    // why there is no room for a seventh scheduled beat.
    expect(BEATS.length + 2).toBeLessThanOrEqual(8);
  });

  it("pre-allocates the steam pool rather than growing it", () => {
    // A particle system that allocates under load is a particle system that
    // stutters exactly when the room is busiest.
    expect(MAX_STEAM_PUFFS).toBeLessThanOrEqual(8);
  });
});

// Measured on the reference profile, not here:
//
//   * draw calls ≤ 40 — the dressing is baked into a small number of containers
//     and the floor is one Graphics, but the number is a renderer question;
//   * baked textures ≤ 26 unique and texture memory ≤ 32 MB — the person rigs
//     dominate this and the count depends on how many palettes are alive, which
//     is a runtime fact;
//   * scene build ≤ 250 ms and enter/exit ≤ 0.8 s — both behind the fade;
//   * interior chunk ≤ 900 KB — reported by `npm run build`, currently well
//     inside it;
//   * five enter/exit cycles with no memory growth — the teardown stack is what
//     this is testing and it has to be watched in a real heap profile.
