// Ambient performance budgets (PRD §6.4: ≤20 NPCs, ≤6 vehicles, ≤15 animated
// props). Kept in a pixi-free module so budgets.test.ts can assert them in jsdom.

export const NPC_COUNT = 14;
export const NPC_COUNT_REDUCED = 7; // prefers-reduced-motion halves the crowd
export const CAR_COUNT = 6;
export const CAR_COUNT_REDUCED = 3;
export const MAX_PARTICLES = 64; // shared pre-allocated pool, zero per-frame alloc
export const MAX_EMITTERS = 15; // fountain + chimneys + steam + leaves + birds + pigeons
