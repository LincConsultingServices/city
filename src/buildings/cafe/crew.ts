// The Café's crew — the staff nobody talks to.
//
// The cast (cast.ts) are people with lines and a part in the career. The crew
// are the rest of the shift: somebody on the till taking orders, somebody on the
// live counter cooking. They are never an objective, never a speaker, and never
// in the guided-navigation list — the same rule customers.ts holds for the
// people in front of the counter. Their whole job is that the counter is staffed
// at every station a customer uses, so an order has somebody to take it and a
// plate has somebody to make it.
//
// Pure data, like cast.ts, so the layout facts — both stand on staff-side floor,
// both walk only where the counter lets them — are unit-testable (crew.test.ts).
import { UNIFORM, type Figure } from "./cast";

export const CREW: readonly Figure[] = [
  {
    // Behind the till, under the ORDER & PAY sign. Stays put: the till is the
    // one station that is never left unattended.
    id: "crew_till",
    palette: { ...UNIFORM, outfit: "uniform", skin: 0xe8c9a0, hair: 0x5a3a24 },
    anchor: { x: 2, y: 1 },
    patrol: [],
    seated: false,
    noticesAt: 2,
  },
  {
    // The cook, in the chef's cap, working the griddle along the live counter.
    // Never into the corner at (10,1): from there he reads as standing beside
    // the counter rather than behind it.
    id: "crew_kitchen",
    palette: { ...UNIFORM, outfit: "chef", skin: 0x8d5a3b, hair: 0x101010 },
    anchor: { x: 9, y: 1 },
    patrol: [
      { x: 9, y: 1 },
      { x: 8, y: 1 },
    ],
    seated: false,
    noticesAt: 2,
  },
];

/** Everyone on the crew, always — the shift does not change with the career. */
export const CREW_IDS: ReadonlySet<string> = new Set(CREW.map((c) => c.id));
