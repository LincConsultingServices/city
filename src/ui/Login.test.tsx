import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signIn = vi.fn();
const signUp = vi.fn();
const google = vi.fn();
const reset = vi.fn();
vi.mock("@/framework/auth/firebase", () => ({
  signIn: (...a: unknown[]) => signIn(...a),
  signUp: (...a: unknown[]) => signUp(...a),
  signInWithGoogle: (...a: unknown[]) => google(...a),
  resetPassword: (...a: unknown[]) => reset(...a),
}));
vi.mock("@/framework/config/appConfig", () => ({ isConfigured: () => true }));

import { Login } from "./Login";

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  for (const f of [signIn, signUp, google, reset]) f.mockReset().mockResolvedValue({ ok: true });
});

describe("the CEO City sign-in screen", () => {
  it("signs in with email and password", async () => {
    render(<Login />);
    type("Email", " asha@example.com ");
    type("Password", "secret1");
    fireEvent.click(screen.getByRole("button", { name: "Enter the city" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("asha@example.com", "secret1", true));
  });

  it("shows why a sign-in failed", async () => {
    signIn.mockResolvedValue({
      ok: false,
      status: "credentials",
      message: "That email and password don't match an account.",
    });
    render(<Login />);
    type("Email", "asha@example.com");
    type("Password", "nope");
    fireEvent.click(screen.getByRole("button", { name: "Enter the city" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("don't match an account");
  });

  it("creates an account in the game itself, checking the form first", async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));
    type("Your name", "Asha Rao");
    type("Email", "asha@example.com");
    type("Password", "secret1");
    type("Confirm password", "secret2");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("don't match");
    expect(signUp).not.toHaveBeenCalled();

    type("Confirm password", "secret1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith("Asha Rao", "asha@example.com", "secret1", true),
    );
  });

  it("refuses a too-short password before asking Firebase", async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));
    type("Your name", "Asha");
    type("Email", "asha@example.com");
    type("Password", "abc");
    type("Confirm password", "abc");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 6");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("sends a reset link without saying whether the account exists", async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    type("Email", "asha@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If there's an account for asha@example.com",
    );
    expect(reset).toHaveBeenCalledWith("asha@example.com");
  });

  it("offers Google, and stays quiet when the player closes its window", async () => {
    google.mockResolvedValue({ ok: false, status: "cancelled", message: "" });
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    await waitFor(() => expect(google).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("never mentions WarRoom", () => {
    const { container } = render(<Login />);
    expect(container.textContent).not.toMatch(/war\s?room/i);
  });
});
