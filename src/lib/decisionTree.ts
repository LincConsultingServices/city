// DECISION_TREE traversal (PRD §8.1) — pure and testable, like sim.ts and
// budget.ts. The renderer drives the beats; these functions say where you are,
// whether you are finished, and what the world owes you. Result kind submitted
// = `trace` (the visited path of choice keys).
//
// THE CLIENT HOLDS NO RUBRIC. Which path is a good path lives only in the
// server's tier map (docs/maison.md §10.2, §0.5). Nothing in this file, and
// nothing in any authored tree, may say or imply which choice is better.
//
// Shape: a seed node, then a node per branch, keyed by the dotted path taken so
// far — `followUps["b"]` is the beat you reach by choosing `b` at the seed. A
// tree ends where the path runs out of nodes, so depth is data, not code: the
// two-beat trees MAISON ships need only the one-segment keys.

import { mulberry32, seedFromString } from "./rng";

export interface DecisionChoice {
  /** The server trace token — one letter, shuffled per activity so position carries nothing. */
  key: string;
  text: string;
  /** What happened. Reported, never judged. Terminal leaves usually have none. */
  consequence?: string;
  /** World-state keys this leaf writes, e.g. `{ rail: "mixed" }` (§12). */
  world?: Record<string, string>;
  /**
   * This option is a consultation — going and asking someone who can see the
   * thing behind the number (docs/maison.md §9.6). Flagged in data rather than
   * inferred from the prose so "is the mentor path available at this beat?" is
   * a machine-checkable question, and so an interior can route it to the desk
   * phone later. It is a scored CHOICE, never a lifeline and never a hint.
   */
  mentor?: boolean;
}

export interface DecisionNode {
  /** Stage directions and narration, one entry per paragraph. */
  stage: string[];
  choices: DecisionChoice[];
}

export interface DecisionTreeContent {
  kind: "decision_tree";
  /** Where this happens and who brings it — display only (§8). */
  station: string;
  host: string;
  /** Weeks to the show. Fiction: nothing here is ever on a real timer (§3.5). */
  countdown: string;
  seed: DecisionNode;
  /** Keyed by the dotted path that leads here: "a", "b", "c" for a two-beat tree. */
  followUps: Record<string, DecisionNode>;
}

/** The path key a node is stored under — [] is the seed. */
export const pathKey = (path: readonly string[]): string => path.join(".");

/** The node you are standing on after taking `path`, or undefined if the tree ended. */
export function nodeAt(
  content: DecisionTreeContent,
  path: readonly string[],
): DecisionNode | undefined {
  return path.length === 0 ? content.seed : content.followUps[pathKey(path)];
}

/** True when there is nothing left to decide — the path has reached a leaf. */
export const isComplete = (content: DecisionTreeContent, path: readonly string[]): boolean =>
  path.length > 0 && nodeAt(content, path) === undefined;

/** The choice taken at each step, in order. Empty entries mean a broken path. */
export function choicesAlong(
  content: DecisionTreeContent,
  path: readonly string[],
): DecisionChoice[] {
  const out: DecisionChoice[] = [];
  for (let i = 0; i < path.length; i++) {
    const node = nodeAt(content, path.slice(0, i));
    const choice = node?.choices.find((c) => c.key === path[i]);
    if (!choice) break;
    out.push(choice);
  }
  return out;
}

/**
 * The merged world delta a path owes, later keys winning — what the rail, the
 * press wall and the atelier become once this decision is made (§12).
 */
export function worldDeltaAlong(
  content: DecisionTreeContent,
  path: readonly string[],
): Record<string, string> {
  return Object.assign({}, ...choicesAlong(content, path).map((c) => c.world ?? {})) as Record<
    string,
    string
  >;
}

/** Every path a player can construct, deepest-first order. Used by the content audit. */
export function allPaths(content: DecisionTreeContent): string[][] {
  const out: string[][] = [];
  const walk = (path: string[]) => {
    const node = nodeAt(content, path);
    if (!node) {
      out.push(path);
      return;
    }
    for (const choice of node.choices) walk([...path, choice.key]);
  };
  walk([]);
  return out;
}

/**
 * The order the three choices are SHOWN in, shuffled per activity and per beat
 * (docs/maison.md §9.1: "Choice letters are shuffled per activity").
 *
 * This exists because authored trees are written weakest-first — that is the
 * order the design doc lists them in, and it is the readable order to author and
 * review in. Shipped that way, the weak option would sit first at almost every
 * node in the building, and a player would learn the position in two beats
 * without reading a word. Shuffling in the renderer makes that structurally
 * impossible instead of relying on eighteen authors to remember.
 *
 * Deterministic — same activity, same beat, same order every time — so replaying
 * a decision is not a shell game. Seeded off the id the way MiniSimRenderer
 * seeds its weather. The choice KEYS are untouched: they are the trace tokens
 * the server scores, and they carry no position.
 */
export function presentationOrder<T>(activityId: string, path: readonly string[], items: T[]): T[] {
  const rand = mulberry32(seedFromString(`${activityId}:${pathKey(path)}`));
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** How many words a choice is — the §18.3 parity check counts these. */
export const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/**
 * Longest minus shortest choice at a node. The §18.3 machine pass caps this at
 * 8: a weak option written shorter and flatter than its peers is a tell, and a
 * player who can spot the intended answer by shape is not making a decision.
 */
export const choiceSpread = (node: DecisionNode): number => {
  const lengths = node.choices.map((c) => wordCount(c.text));
  return Math.max(...lengths) - Math.min(...lengths);
};

/** Every node in a tree, labelled by its path key ("seed" for the root). */
export function nodeEntries(content: DecisionTreeContent): { where: string; node: DecisionNode }[] {
  return [
    { where: "seed", node: content.seed },
    ...Object.entries(content.followUps).map(([where, node]) => ({ where, node })),
  ];
}
