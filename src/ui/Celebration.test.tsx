import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { Celebration } from "./Celebration";
import { events } from "@/framework/events";
import { audio } from "@/framework/audio/audioManager";
import type { SubmitResponse } from "@/framework/api/schemas";

const response = (over: Partial<SubmitResponse> = {}): SubmitResponse =>
  ({
    activityId: "X-1",
    proficiency: 3,
    bestProficiency: 3,
    passed: true,
    status: "COMPLETED",
    feedback: "",
    graded: "server",
    badgesAwarded: [],
    ...over,
  }) as SubmitResponse;

describe("Celebration — the silent-tier contract (docs/maison.md §11)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("bursts for an ordinary venue when the server says you passed", () => {
    const play = vi.spyOn(audio, "play").mockImplementation(() => {});
    const { container } = render(<Celebration />);
    expect(container).toBeEmptyDOMElement();

    act(() => events.emit("activity_completed", { response: response(), silent: false }));

    expect(container).not.toBeEmptyDOMElement();
    expect(play).toHaveBeenCalledWith("jingle_win");
  });

  it("stays completely quiet for a silent-tier venue, passed or not", () => {
    // The §11 defect this test exists for: a burst that fires on `passed` and
    // not otherwise IS a verdict, delivered before the player has read the world
    // their decision changed. A scenario venue does not deliver verdicts.
    const play = vi.spyOn(audio, "play").mockImplementation(() => {});
    const { container } = render(<Celebration />);

    act(() => events.emit("activity_completed", { response: response(), silent: true }));
    expect(container).toBeEmptyDOMElement();

    act(() =>
      events.emit("activity_completed", {
        response: response({ passed: false, proficiency: 1 }),
        silent: true,
      }),
    );
    expect(container).toBeEmptyDOMElement();
    expect(play).not.toHaveBeenCalled();
  });

  it("does not burst on a failed result anywhere — silence is not the punishment", () => {
    const { container } = render(<Celebration />);
    act(() =>
      events.emit("activity_completed", {
        response: response({ passed: false }),
        silent: false,
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
