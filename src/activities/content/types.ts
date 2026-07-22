// Client-authored activity content (PRD §8.2). The backend serves ONLY routing/
// scoring metadata (id, activityType, title, passCriteria) — every prompt, option,
// and item label lives here, keyed by the exact registry activity ID. Item keys
// MUST match the server's hidden answer/order keys so submissions score correctly.

export interface DragMatchContent {
  kind: 'drag_match';
  prompt: string;
  zones: { id: string; label: string }[]; // choice values the server grades against
  items: { key: string; label: string; emoji?: string }[]; // key = server itemId
}

export interface McqContent {
  kind: 'mcq';
  prompt?: string;
  questions: {
    id: string; // server itemId (e.g. "q1")
    text: string;
    options: { value: string; label: string }[]; // value = server choice (e.g. "b")
  }[];
}

export interface SortOrderContent {
  kind: 'sort_order';
  prompt: string;
  // Presented (scrambled) order; the user arranges. key = server order-key item.
  items: { key: string; label: string; emoji?: string }[];
}

export interface MiniSimContent {
  kind: 'mini_sim';
  prompt: string;
  budget: number;
  currency?: string;
  needs: { key: string; label: string; cost: number; emoji?: string }[];
  wants: { key: string; label: string; cost: number; emoji?: string }[];
  savingsGoalHint?: string;
}

export type ActivityContent = DragMatchContent | McqContent | SortOrderContent | MiniSimContent;
