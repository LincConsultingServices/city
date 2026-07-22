// The renderer contract (PRD §8.1) — FROZEN in F0, renderers land in F1.
// Every renderer is a React component over typed content that reports exactly
// one of the seven result kinds via onResultChange. It literally cannot emit a
// malformed result — the wire ResultSchema (a discriminated union) rejects it.

import type { FC } from 'react';
import type { Result, ResultKind } from '@/framework/api/schemas';

export interface RendererProps<TContent = unknown> {
  content: TContent;
  /** Report the current buildable result (or null while incomplete). */
  onResultChange: (result: Result | null) => void;
  onHint?: () => void;
}

export type ResultBuilder = () => Result;
export type Renderer<TContent = unknown> = FC<RendererProps<TContent>>;

/**
 * The 13 activity types → the 7 result kinds they submit (PRD §8.1). STORY_CHOICE
 * is 'objective' for independent beats, 'trace' when branching — resolved per
 * that activity's rubric kind at F1.
 */
export const RESULT_KIND_BY_ACTIVITY_TYPE: Record<string, ResultKind> = {
  MCQ_FEEDBACK: 'objective',
  DRAG_MATCH: 'objective',
  SPOT_IT: 'objective',
  CASE_STUDY: 'objective',
  DIAGNOSE: 'objective',
  STORY_CHOICE: 'objective',
  SORT_ORDER: 'order',
  DECISION_TREE: 'trace',
  MINI_SIM: 'metrics',
  BUDGET_SLIDER: 'metrics',
  BUILD_PLAN: 'slots',
  OPEN_TEXT_AI: 'text',
  DEFEND_PITCH: 'transcript',
};
