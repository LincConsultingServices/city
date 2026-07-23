import { test, expect } from "@playwright/test";

// F0 smoke: the app boots to the login screen. Deeper flows (walk → venue →
// activity → submit) need a signed-in session + backend and land as F1 e2e.
test("boots to the WarRoom login screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "THE CITY" })).toBeVisible();
  await expect(page.getByText("Sign in with your WarRoom account")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter the city" })).toBeVisible();
});
