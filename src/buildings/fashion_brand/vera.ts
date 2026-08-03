// The desk phone (§9.6). Véra is never punished and never gated: the phone works
// at every beat, at any time, and calling her is free and unscored.
//
// "A lifeline that costs something is a lifeline nobody uses, and the point of
// this competency is that asking is the strong move." The SCORED consultation is
// an option inside the C2 trees; this is the other half — the one that costs
// nothing, so that asking is a habit rather than a resource.
//
// She never tells you what to do. Every line here ends on a question, because
// that is the whole character: she asks you what the number means.
import { BEATS } from "./season";

/** One question per beat, aimed at the decision that beat is actually about. */
const BY_COMPETENCY: Record<string, string> = {
  C1: "Three people asked you the same thing. Do you know yet whether that is three opinions or one opinion, repeated?",
  C2: "Three times faster than what — the bold, or last season's bold? And faster in units, or in value?",
  C3: "You have forty-eight hours. Which of the things you do not know would actually change your answer?",
  C4: "Price it against the year this works rather than the year it doesn't. What does that percentage cost you then?",
  C5: "Say the deal out loud in three years' time. Who is still taking your call in that sentence?",
  C6: "She wants your margin. What does she have that you want, and have you asked for it yet?",
  C7: "Who in that room has stopped telling you things? And when did you last notice it yourself?",
  C8: "If it works and nobody ever finds out how you did it — is that the house you wanted?",
  C9: "Three bad things happened. Are they three problems, or one problem three times?",
};

const ANY_TIME =
  "You rang without a reason, which is usually when the useful question turns up. What is on the rail that you have stopped looking at?";

/** What she says when you call from a given beat. Never an answer (§9.6). */
export function veraQuestion(competency: string | null): string {
  return (competency && BY_COMPETENCY[competency]) ?? ANY_TIME;
}

/** Every beat has a question of its own — checked in vera.test.ts. */
export const VERA_COVERAGE = BEATS.map((b) => b.competency);
