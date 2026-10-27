import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Portrait } from "./Portrait";
import { CAST, speakerFor } from "@/buildings/cafe/cast";
import { CAFE_CAST, CAFE_CREW, CROWD, MAISON_CAST, PLAYER, paletteOf } from "./characters";

describe("the conversation portrait", () => {
  it("draws everyone in the café's cast", () => {
    for (const m of CAST) {
      const s = speakerFor(m.id)!;
      const { container, unmount } = render(<Portrait look={s.look} />);
      expect(container.querySelector("svg"), `${m.id} drew nothing`).toBeTruthy();
      unmount();
    }
  });

  it("draws every design on the character sheet, the player and the crowd too", () => {
    const looks = [
      PLAYER.look,
      ...[CAFE_CAST, CAFE_CREW, MAISON_CAST].flatMap((set) =>
        Object.values(set).map((d) => d.look),
      ),
      ...CROWD,
    ];
    for (const look of looks) {
      const { container, unmount } = render(<Portrait look={look} />);
      expect(container.querySelector("svg")).toBeTruthy();
      unmount();
    }
  });

  it("gives the walking figure the same hair, beard and glasses", () => {
    expect(paletteOf(CAFE_CAST.marcus.look)).toMatchObject({
      hairStyle: "receding",
      beard: true,
      glasses: true,
    });
    // Stubble is too fine for a twelve-pixel face; glasses on the head are not worn.
    expect(paletteOf(CAFE_CAST.tomas.look).beard).toBe(false);
    expect(paletteOf(MAISON_CAST.elise.look).glasses).toBe(false);
    expect(paletteOf(CAFE_CAST.owen.look).outfit).toBe("suit");
  });

  it("dresses the staff in the uniform and Owen in a suit and tie", () => {
    const fills = (id: "priya" | "owen") => {
      const { container } = render(<Portrait look={speakerFor(id)!.look} />);
      return [...container.querySelectorAll("[fill]")].map((e) => e.getAttribute("fill"));
    };
    // Priya's apron is the uniform's black; Owen's tie is his accent colour.
    expect(fills("priya")).toContain("#1d1d22");
    expect(fills("owen")).toContain("#7a2a33");
  });

  it("is named for assistive tech only when asked to be", () => {
    const look = speakerFor("owen")!.look;
    const quiet = render(<Portrait look={look} />);
    expect(quiet.container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    quiet.unmount();
    const named = render(<Portrait look={look} title="Owen" />);
    expect(named.getByRole("img", { name: "Owen" })).toBeTruthy();
  });
});
