// The gate: what he said, and the three roads out of it.
//
// A gate is the only screen that shows a player more than one road, and the
// only one in a scenario building allowed to say how a sitting went — because
// what it is reporting on is free text, where there is nothing to pattern-match
// (ADR-007 §12).
//
// Three things it must never do, all of them tempting:
//   - use the words the end-of-journey report owns. The band label is authored
//     off them, and journey.test.ts fails the build if one creeps in.
//   - show a proficiency, an n/3, or the per-question marks as a total out of a
//     total that reads like a grade.
//   - present *exit* as a failure. Leaving is one of three roads, and a player
//     who takes the job and walks after the counter has played a complete
//     journey that scores exactly what they played.
import { castById, speakerFor, type CastId } from "./cast";
import { ChoiceButton, Sheet } from "./Sheet";
import { currentStage, takeRoad, useJourneyStore, type Road } from "./journeyStore";
import { gateRoads, ROLE_LABEL, stageById } from "./journey";

export function Gate() {
  const outcome = useJourneyStore((s) => s.outcome);
  const stage = currentStage();
  const roads = gateRoads(stage);
  if (!roads) return null;

  const host = stage.hostNpc ? castById(stage.hostNpc as never) : null;
  const speaker = stage.hostNpc ? speakerFor(stage.hostNpc as CastId) : null;
  const nextStage = stageById(roads.accept);
  const nextRole = nextStage ? ROLE_LABEL[nextStage.role] : "";

  const go = (road: Road) => () => takeRoad(road);

  // A verdict that came back with nothing in it reads the same as none
  // arriving at all — better an honest line than a heading with a blank
  // space under it, the same gap the decision sheet's own consequence once
  // had (an empty paragraph, standing in for what a player came here to read).
  const hasFeedback = Boolean(outcome && (outcome.band || outcome.feedback));
  // What he thought, in his own voice — typed out like anything else he says.
  const said = hasFeedback && outcome!.feedback ? outcome!.feedback : undefined;

  return (
    <Sheet
      label={stage.title}
      speaker={speaker}
      line={said}
      head={
        <>
          <h2 className="font-display text-lg font-semibold text-gold">{stage.title}</h2>
          {/* The band is a word, never a number and never a tier name; the
              per-question marks are never shown as a total out of a total. */}
          {hasFeedback && outcome!.band && (
            <p className="mt-0.5 text-xs uppercase tracking-widest text-gold/80">{outcome!.band}</p>
          )}
        </>
      }
    >
      {hasFeedback ? null : (
        <p className="text-sm leading-relaxed text-muted">
          {/*
            An honest line for the case where nothing graded the sitting — a
            grader outage, or an offline close. Saying so is better than
            inventing a verdict, and better than silence. Named rather than
            pronouned: the host differs by stage, and the sentence should read
            the same whoever is sitting across the table.
          */}
          {host?.name ?? "The interviewer"} heard you out, but your answers couldn&apos;t be scored
          this time, so there&apos;s no feedback to show. Every option below is still open to you.
        </p>
      )}

      <ul className={`${hasFeedback ? "mt-1" : "mt-5"} space-y-2`}>
        <li>
          <ChoiceButton onClick={go("accept")} primary>
            <span className="block text-sm font-medium text-text">
              {nextRole ? `Take it — ${nextRole}` : "Take it"}
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Accept the offer and start the new role.
            </span>
          </ChoiceButton>
        </li>
        <li>
          <ChoiceButton onClick={go("retry")}>
            <span className="block text-sm font-medium text-text">Go again</span>
            {/* Not "try harder" and not a penalty. The earlier attempt stays on
                the record either way — it is the baseline the report measures
                improvement from, and it is never overwritten. */}
            <span className="mt-0.5 block text-xs text-muted">
              Answer the questions again. Your first answers stay on the record.
            </span>
          </ChoiceButton>
        </li>
        <li>
          <ChoiceButton onClick={go("exit")}>
            <span className="block text-sm font-medium text-text">Leave the café</span>
            <span className="mt-0.5 block text-xs text-muted">Stop here and see your summary.</span>
          </ChoiceButton>
        </li>
      </ul>
    </Sheet>
  );
}
