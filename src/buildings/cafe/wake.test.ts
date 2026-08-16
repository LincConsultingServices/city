// When the week arrives.
//
// The mission surfaces — the panel at the top and the cloud over somebody's head
// — are down when the player walks in and come up the first time they work
// something in the room. Walking in is arriving somewhere; a card that lands in
// the same second as the door closes reads as a quest log rather than as a job.
//
// What is checked here is that this is a *presentation* rule and nothing more:
// the season does not wait on it, so nothing about progress, the world, or what
// is submitted can be reached only by a player who happened to press E.
import { describe, it, expect, beforeEach } from "vitest";
import {
  noteEvent,
  resetCafeState,
  showUp,
  toggleFlap,
  useCafeStore,
  wakeMission,
} from "./cafeStore";
import { clearSeason } from "./session";
import { SEASON_START, advance } from "./missionRunner";
import { STATIONS } from "./room";

const woken = () => useCafeStore.getState().missionWoken;

beforeEach(() => {
  clearSeason();
  resetCafeState();
});

describe("waking the mission", () => {
  it("starts every visit down", () => {
    expect(woken()).toBe(false);
  });

  it("comes up once, and staying up costs nothing", () => {
    const before = useCafeStore.getState();
    wakeMission();
    expect(woken()).toBe(true);

    // Identity-guarded like the ticker's own setters: waking an already-woken
    // room must not push a new state object at React.
    const after = useCafeStore.getState();
    wakeMission();
    expect(useCafeStore.getState()).toBe(after);
    expect(after).not.toBe(before);
  });

  it("counts working the flap, which can be clicked without going through act()", () => {
    expect(toggleFlap()).toBe(true);
    expect(woken()).toBe(true);
  });

  it("goes back down when you come back in", () => {
    wakeMission();
    resetCafeState();
    expect(woken()).toBe(false);
  });

  it("holds nothing about the season back", () => {
    // The point of the rule is that it is only ever about what is on screen. A
    // player who crosses to the counter before touching anything has still taken
    // the counter, and the objective moves on whether or not they were told to.
    const counter = STATIONS.find((s) => s.id === "st_counter")!;
    const moved = advance(SEASON_START, { kind: "moved", cell: counter.cell }, () => counter.cell);
    expect(moved.next.objectiveIndex).toBe(1);
    expect(woken()).toBe(false);
  });
});

describe("the week arrives when the week moves", () => {
  it("wakes on an objective closing, not only on a keypress", () => {
    // The guided-navigation list is the keyboard-only way across the room, and
    // it walks you to places without ever going through `act()`. Waking only on
    // E meant that player advanced through objectives with the tracker and the
    // cloud both still down — the one player who needs them most.
    expect(woken()).toBe(false);
    const station = STATIONS.find((p) => p.id === "st_counter")!;
    noteEvent({ kind: "moved", cell: station.cell });
    expect(useCafeStore.getState().progress.objectiveIndex).toBe(1);
    expect(woken()).toBe(true);
  });

  it("stays down when nothing actually closed", () => {
    noteEvent({ kind: "moved", cell: { x: 6, y: 7 } });
    expect(useCafeStore.getState().progress).toEqual(SEASON_START);
    expect(woken()).toBe(false);
  });
});

describe("somebody walking in", () => {
  it("puts them in the room without closing what is waiting on them", () => {
    // The cloud over a `wait_for` target hangs off that person, so there has to
    // be a moment where they are in the room and the objective is still open.
    // These were one call, and that moment did not exist.
    noteEvent({ kind: "moved", cell: STATIONS.find((p) => p.id === "st_counter")!.cell });
    const waiting = useCafeStore.getState().progress;

    showUp("nadia");
    expect(useCafeStore.getState().visitors).toContain("nadia");
    expect(useCafeStore.getState().progress, "arrival closed it early").toEqual(waiting);

    noteEvent({ kind: "arrived", id: "nadia" });
    expect(useCafeStore.getState().progress.objectiveIndex).toBe(waiting.objectiveIndex + 1);
  });
});
