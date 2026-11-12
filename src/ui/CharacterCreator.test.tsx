import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("@/framework/api", () => ({
  api: { putCityState: vi.fn().mockResolvedValue({ ok: true, rev: 1, updatedAt: "" }) },
}));

import { CharacterCreator } from "./CharacterCreator";
import { resetIdentity, useIdentity } from "@/framework/player/identity";

beforeEach(() => {
  localStorage.clear();
  resetIdentity();
});

describe("the character creator", () => {
  it("offers each gender its own hairstyles, body types and face shapes", () => {
    render(<CharacterCreator onDone={() => {}} />);
    const radios = (group: string) =>
      within(screen.getByRole("radiogroup", { name: group }))
        .getAllByRole("radio")
        .map((r) => r.textContent);
    expect(radios("Hairstyle")).toContain("Buzz cut");
    expect(radios("Body type")).toContain("Broad");
    expect(radios("Face shape")).toContain("Square jaw");
    expect(screen.queryByRole("radiogroup", { name: "Facial hair" })).not.toBeNull();

    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", {
        name: "Female",
      }),
    );
    expect(radios("Hairstyle")).toEqual(["Long", "Bob", "Ponytail", "Bun", "Curly"]);
    expect(radios("Body type")).toContain("Curvy");
    expect(radios("Face shape")).toContain("Heart");
    expect(screen.queryByRole("radiogroup", { name: "Facial hair" })).toBeNull();
  });

  it("needs a name before the character can be confirmed", () => {
    const done = vi.fn();
    render(<CharacterCreator onDone={done} />);
    const confirm = screen.getByRole("button", { name: /This is me/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Asha" } });
    expect(confirm.disabled).toBe(false);
  });

  it("confirms the chosen look as the player's identity", () => {
    const done = vi.fn();
    render(<CharacterCreator onDone={done} />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "  Asha  " } });
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", {
        name: "Female",
      }),
    );
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Hairstyle" })).getByRole("radio", {
        name: "Bun",
      }),
    );
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Skin tone" })).getByRole("radio", {
        name: "Deep brown",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /This is me/ }));
    const id = useIdentity.getState().identity!;
    expect(id).toMatchObject({
      name: "Asha",
      gender: "female",
      hairStyle: "bun",
      skin: 0x8d5a3b,
      confirmed: true,
    });
    expect(done).toHaveBeenCalled();
  });

  it("randomizes the look but keeps the name, and resets to where it started", () => {
    render(<CharacterCreator onDone={() => {}} />);
    const name = screen.getByLabelText("Your name") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Asha" } });
    fireEvent.click(screen.getByRole("button", { name: /Randomize/ }));
    expect(name.value).toBe("Asha");
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", {
        name: "Female",
      }),
    );
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Hairstyle" })).getByRole("radio", {
        name: "Bob",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(
      within(screen.getByRole("radiogroup", { name: "Hairstyle" }))
        .getByRole("radio", { name: "Short" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("opens on the character the player already has, after a restart", () => {
    useIdentity.getState().setIdentity({
      v: 1,
      name: "Asha",
      gender: "female",
      build: "average",
      face: "oval",
      skin: 0x6b4329,
      hairStyle: "ponytail",
      hair: 0x101010,
      eyes: 0x4a2c18,
      beard: "none",
      freckles: false,
      clothes: "hoodie",
      top: 0x5fae6f,
      accent: 0x1f3d70,
      legs: 0x2a3350,
      shoes: 0xf2f2ee,
      suit: 0x2f3a4f,
      glasses: null,
      earrings: "hoops",
      cap: null,
      sunglasses: false,
      confirmed: false,
    });
    render(<CharacterCreator onDone={() => {}} />);
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("Asha");
    expect(
      within(screen.getByRole("radiogroup", { name: "Hairstyle" }))
        .getByRole("radio", { name: "Ponytail" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});
