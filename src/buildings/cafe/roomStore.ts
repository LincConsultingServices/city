/**
 * Where you are standing, and what is within reach.
 *
 * This is the half of the old `cafeStore` that was always about the room rather
 * than about the game being played in it: position, proximity, the flap, who is
 * talking, the live region. It is deliberately separate from `journeyStore` —
 * the career has now replaced a season and then an interview, and each time the
 * room survived unchanged. Keeping the two apart means the next change to what
 * happens here does not touch the code that knows where the counter is.
 *
 * The world state lives here rather than in the journey, because it is what the
 * *room* looks like: props read it, the canvas draws it, and it is presentation
 * only. Nothing in it reaches a submitted decision and nothing in it decides a
 * proficiency.
 */

import { create } from "zustand";
import { audio } from "@/framework/audio/audioManager";
import type { Cell } from "@/lib/pathfinding";
import { GATES, SPAWN, zoneAt, type GateId, type ZoneId } from "./room";
import { castById, type CastId } from "./cast";
import { START_STAGE, stageById, type Stage } from "./journey";
import {
  announcementFor,
  applyPatch,
  changedKeys,
  OPENING_WORLD,
  type World,
  type WorldPatch,
} from "./world";

/** A line for the live region, with a sequence so a repeat still announces. */
export interface Announcement {
  text: string;
  seq: number;
}

interface RoomState {
  charCell: Cell;
  zoneId: ZoneId;
  /** Standing on or beside the door. */
  nearExit: boolean;
  /** The gate you are close enough to work, if any. */
  nearGateId: GateId | null;
  /** The person you are close enough to speak to, if any. */
  nearCastId: CastId | null;
  /** Who you are mid-conversation with, if anyone. */
  speakingToId: CastId | null;
  /** What they just said. Held here so the DOM and the live region agree. */
  spokenLine: string;
  flapOpen: boolean;
  /**
   * A request from the DOM for the room to walk somewhere — the keyboard station
   * list. The canvas paths there and clears it, the same shape `flapOpen` uses.
   */
  walkTo: Cell | null;
  /** What the room looks like. Presentation only. */
  world: World;
  /** True while a DOM panel is up — the room ignores clicks and WASD. */
  inputLocked: boolean;
  /**
   * The stage the player has sat down for on this visit. A stage that waits for
   * its host (see `awaitsHost`) stays closed until this names it, so walking in
   * the door is exploring the room, not being interviewed.
   */
  acceptedStageId: string | null;
  /**
   * The shift the player has been briefed on by its host. A shift is not
   * started by talking to Priya: she tells you what the shift is, and you start
   * it yourself at the counter (see `startsAtStation`).
   */
  briefedStageId: string | null;
  /**
   * The scene whose customer has walked up to the till (counterShift.ts). A
   * shift's scene waits until they are standing in front of you.
   */
  customerAtTill: string | null;
  announcement: Announcement;

  setCharCell: (cell: Cell) => void;
  setNearExit: (near: boolean) => void;
  setNearGate: (id: GateId | null) => void;
  setNearCast: (id: CastId | null) => void;
  setSpeaking: (id: CastId | null, line: string) => void;
  setFlapOpen: (open: boolean) => void;
  setWalkTo: (cell: Cell | null) => void;
  setInputLocked: (locked: boolean) => void;
  acceptStage: (id: string) => void;
  briefStage: (id: string) => void;
  setCustomerAtTill: (key: string | null) => void;
  announce: (text: string) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  charCell: { ...SPAWN },
  zoneId: zoneAt(SPAWN).id,
  nearExit: false,
  nearGateId: null,
  nearCastId: null,
  speakingToId: null,
  spokenLine: "",
  world: { ...OPENING_WORLD },
  flapOpen: false,
  walkTo: null,
  inputLocked: false,
  acceptedStageId: null,
  briefedStageId: null,
  customerAtTill: null,
  announcement: { text: "", seq: 0 },

  setCharCell: (charCell) =>
    set((s) => {
      if (s.charCell.x === charCell.x && s.charCell.y === charCell.y) return s;
      const zoneId = zoneAt(charCell).id;
      return zoneId === s.zoneId ? { charCell } : { charCell, zoneId };
    }),
  setNearExit: (nearExit) => set((s) => (s.nearExit === nearExit ? s : { nearExit })),
  setNearGate: (nearGateId) => set((s) => (s.nearGateId === nearGateId ? s : { nearGateId })),
  setNearCast: (nearCastId) => set((s) => (s.nearCastId === nearCastId ? s : { nearCastId })),
  setSpeaking: (speakingToId, spokenLine) =>
    set({ speakingToId, spokenLine, inputLocked: speakingToId !== null }),
  setWalkTo: (walkTo) => set({ walkTo }),
  setFlapOpen: (flapOpen) => set((s) => (s.flapOpen === flapOpen ? s : { flapOpen })),
  setInputLocked: (inputLocked) =>
    set((s) => (s.inputLocked === inputLocked ? s : { inputLocked })),
  acceptStage: (acceptedStageId) => set({ acceptedStageId }),
  briefStage: (briefedStageId) => set({ briefedStageId }),
  setCustomerAtTill: (customerAtTill) =>
    set((s) => (s.customerAtTill === customerAtTill ? s : { customerAtTill })),
  announce: (text) => set((s) => ({ announcement: { text, seq: s.announcement.seq + 1 } })),
}));

/**
 * Work the counter flap. Both call sites — clicking the flap in the room and
 * pressing E beside it — come through here, so the guard and the feedback are
 * identical either way.
 *
 * Closing it while you are standing on it is refused: the cell becomes a wall
 * the moment it shuts, and the player would be inside the counter.
 */
export function toggleFlap(): boolean {
  const s = useRoomStore.getState();
  const gate = GATES[0];
  const standingOnIt = s.charCell.x === gate.cell.x && s.charCell.y === gate.cell.y;

  if (s.flapOpen && standingOnIt) {
    audio.play("ui_error");
    s.announce("Step off the flap before you lower it.");
    return false;
  }

  const next = !s.flapOpen;
  s.setFlapOpen(next);
  audio.play(next ? "ui_open" : "ui_close");
  s.announce(next ? gate.openedSays : gate.closedSays);
  return true;
}

/**
 * Start a visit.
 *
 * The room always starts the same way — at the door, flap down, nothing open —
 * because the canvas boots with no gates open and a stale `flapOpen: true` here
 * would desync the two. Where you are in your *career* is whatever you left
 * behind, and that is `journeyStore`'s to restore.
 */
export function resetRoomState(world: World): void {
  resetSpoken();
  useRoomStore.setState({
    charCell: { ...SPAWN },
    zoneId: zoneAt(SPAWN).id,
    nearExit: false,
    nearGateId: null,
    nearCastId: null,
    speakingToId: null,
    spokenLine: "",
    flapOpen: false,
    walkTo: null,
    inputLocked: false,
    acceptedStageId: null,
    briefedStageId: null,
    customerAtTill: null,
    world,
    announcement: { text: "", seq: 0 },
  });
}

/**
 * Whether a stage waits for the player to go to its host and say yes, rather
 * than opening the moment it becomes current.
 *
 * Every stage somebody runs does: the interview and the reviews wait at Owen's
 * table, the shifts at the counter wait for you to go to Priya, and the branch
 * waits for Tomas at the pass. A room that throws you straight into the next
 * thing is a room you never get to look at — and walking to the person is the
 * thing that says "this is where the work is". Running the business waits for
 * Tomas to hand you the table, and choosing a successor — which nobody hosts —
 * waits for you to sit down to it. Only the gates between stages open at once:
 * a gate is the host's answer, already in front of you.
 */
export function stageAwaitsHost(stage: Stage | undefined): boolean {
  if (!stage) return false;
  if (stage.kind === "succession") return true;
  return stage.hostNpc !== null && (stage.kind === "qa" || stage.kind === "scenarios");
}

/** True while `stageId` is waiting for the player to accept it from its host. */
export function awaitsHost(stageId: string, acceptedStageId: string | null): boolean {
  return stageAwaitsHost(stageById(stageId)) && acceptedStageId !== stageId;
}

/**
 * A shift starts at its station, not in conversation. Its host briefs you —
 * Priya tells you what the counter is like today — and then the shift waits for
 * you to go to the counter and start it yourself, the way you would clock on.
 * Interviews and reviews are conversations, so they still start with the host.
 */
export function startsAtStation(stage: Stage | undefined): boolean {
  return stageAwaitsHost(stage) && (stage!.kind === "scenarios" || stage!.kind === "succession");
}

/** True while the waiting shift `stageId` still needs its host to brief you. */
export function needsBriefing(stageId: string, briefedStageId: string | null): boolean {
  const stage = stageById(stageId);
  return startsAtStation(stage) && stage!.hostNpc !== null && briefedStageId !== stageId;
}

/** True once you have been briefed and the shift waits for you at its station. */
export function readyAtStation(
  stageId: string,
  acceptedStageId: string | null,
  briefedStageId: string | null,
): boolean {
  const stage = stageById(stageId);
  return (
    awaitsHost(stageId, acceptedStageId) &&
    startsAtStation(stage) &&
    // Nobody to brief you on a stage nobody hosts: it is ready when you are.
    (stage!.hostNpc === null || briefedStageId === stageId)
  );
}

/** What a host says when you walk up with their stage waiting, and the button to say yes. */
export interface Invitation {
  line: string;
  accept: string;
  /** For a shift: the host's briefing, and the button that ends it. */
  brief?: { line: string; ok: string };
}

const INVITATIONS: Readonly<Record<string, Invitation>> = {
  [START_STAGE]: {
    line: "Good, you found me. It's a short one — a few questions about you and how you work, and I just want to hear it in your own words. A few sentences each is plenty. Ready when you are.",
    accept: "Start the interview",
  },
  "cafe.l1": {
    line: "There you are. Apron's on the hook. The counter's yours once you're ready — customers come to you, and you deal with them as they come. I'm right here.",
    accept: "Start your shift",
    brief: {
      line: "Welcome aboard. Apron's on the hook — you're in the uniform now. Today you're on the billing counter: I've lifted the flap, so get behind the till when you're ready and start your shift. Customers come up to you, and you deal with them as they come. I'm right here if you need me.",
      ok: "Got it",
    },
  },
  "cafe.review1": {
    line: "Sit down when you're ready. Same as last time — a few questions, in your own words. This one's about how the counter went.",
    accept: "Start the review",
  },
  "cafe.l2": {
    line: "You're behind the flap now. The team's on, and the rota's yours. Say when and we'll get going.",
    accept: "Take charge",
    brief: {
      line: "You're behind the flap now. The team's on, and the rota's yours. Go to the pass when you're ready and take charge — we'll follow your lead.",
      ok: "Got it",
    },
  },
  "cafe.l3": {
    line: "Owen's not coming in any more. The table's yours — sit down when you're ready, and we'll bring you what needs deciding.",
    accept: "Take the table",
    brief: {
      line: "Owen's not coming in any more — this is all yours now. That table's where you run it from. Sit down when you're ready, and we'll bring you what needs deciding, one thing at a time.",
      ok: "Got it",
    },
  },
  "cafe.succession": {
    line: "Three people want this place after you. Sit down when you're ready to see them.",
    accept: "Meet the candidates",
  },
  "cafe.review2": {
    line: "Take a seat. Last review before the big one — tell me how running the branch went.",
    accept: "Start the review",
  },
};

/** The invitation for a stage. Every waiting stage has one; this is the fallback. */
export function invitationFor(stageId: string): Invitation {
  return (
    INVITATIONS[stageId] ?? {
      line: "Ready when you are.",
      accept: "Let's start",
    }
  );
}

/** The interview's invitation — kept by name for the tests that hold its wording. */
export const INVITATION = invitationFor(START_STAGE).line;

/** The host asks whether you are ready for `stageId`, in place of their idle chatter. */
export function invite(id: CastId, stageId: string = START_STAGE): void {
  const member = castById(id);
  if (!member) return;
  const inv = invitationFor(stageId);
  const line = startsAtStation(stageById(stageId)) && inv.brief ? inv.brief.line : inv.line;
  const s = useRoomStore.getState();
  audio.play("ui_open");
  s.setSpeaking(id, line);
  s.announce(`${member.name}. ${line}`);
}

/** Say yes to the host: the stage opens, and the conversation bubble closes. */
export function acceptStage(stageId: string): void {
  const s = useRoomStore.getState();
  audio.play("ui_open");
  s.setSpeaking(null, "");
  s.acceptStage(stageId);
}

/**
 * The briefing is heard: the shift now waits for you at its station. The till
 * and the pass are behind the counter, so the flap is lifted for you on the way.
 */
export function briefStage(stageId: string): void {
  const s = useRoomStore.getState();
  audio.play("ui_open");
  s.setSpeaking(null, "");
  s.briefStage(stageId);
  const station = stageById(stageId)?.station;
  if ((station === "st_till" || station === "st_pass") && !useRoomStore.getState().flapOpen) {
    toggleFlap();
  }
}

/**
 * Change something about the room.
 *
 * Every key that actually moves is announced, because a consequence that exists
 * only in the picture is a consequence half the audience never receives. Illegal
 * writes are dropped by the reducer and therefore announce nothing, which is the
 * right failure: a typo in a decision's world write costs a change, never a
 * crash and never a wrong line.
 */
export function writeWorld(patch: WorldPatch): void {
  const s = useRoomStore.getState();
  const moved = changedKeys(s.world, patch);
  if (moved.length === 0) return;

  const next = applyPatch(s.world, patch);
  useRoomStore.setState({ world: next });

  const said = moved
    .map((k) => announcementFor(k, next[k] as never))
    .filter((line): line is string => line !== null);
  if (said.length > 0) s.announce(said.join(" "));
}

/**
 * Say hello. Which line comes out is a plain rotation rather than a random pick:
 * a room where the same person says the same random thing twice running reads as
 * broken, and cycling means a player who talks to Priya four times hears four
 * different things and then a repeat they can predict.
 */
const spokenCount = new Map<CastId, number>();

export function speakTo(id: CastId): void {
  const member = castById(id);
  if (!member || member.ambientLines.length === 0) return;
  const n = spokenCount.get(id) ?? 0;
  spokenCount.set(id, n + 1);
  const line = member.ambientLines[n % member.ambientLines.length];
  const s = useRoomStore.getState();
  audio.play("ui_open");
  s.setSpeaking(id, line);
  s.announce(`${member.name}. ${line}`);
}

export function stopSpeaking(): void {
  audio.play("ui_close");
  useRoomStore.getState().setSpeaking(null, "");
}

/** Fresh rotation for a fresh visit, so re-entering starts the room over. */
function resetSpoken(): void {
  spokenCount.clear();
}
