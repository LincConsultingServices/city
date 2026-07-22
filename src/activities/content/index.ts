// Content registry — display content keyed by the exact registry activity ID.
// getActivityContent(id) is how a renderer gets its prompt/options/items.

import type { ActivityContent } from './types';
import { c4Beg } from './c4-beg';

const CONTENT: Record<string, ActivityContent> = {
  ...c4Beg,
};

export function getActivityContent(id: string): ActivityContent | undefined {
  return CONTENT[id];
}

export function hasContent(id: string): boolean {
  return id in CONTENT;
}
