// activityType → renderer registry (PRD §8.1). Buildings may theme a renderer,
// never fork it. Content is looked up separately by activity ID.

import type { Renderer } from './types';
import { DragMatchRenderer } from './DragMatchRenderer';
import { McqRenderer } from './McqRenderer';
import { SortOrderRenderer } from './SortOrderRenderer';
import { MiniSimRenderer } from './MiniSimRenderer';

const RENDERERS: Record<string, Renderer<any>> = {
  DRAG_MATCH: DragMatchRenderer,
  MCQ_FEEDBACK: McqRenderer,
  SORT_ORDER: SortOrderRenderer,
  MINI_SIM: MiniSimRenderer,
  BUDGET_SLIDER: MiniSimRenderer,
};

export function getRenderer(activityType: string): Renderer<any> | undefined {
  return RENDERERS[activityType];
}
