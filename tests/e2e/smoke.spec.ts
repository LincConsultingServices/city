import { test, expect } from "@playwright/test";

// The app boots to the login screen. The walked flows — city → café → the nine
// questions — are in cafe-interview.spec.ts and need the dev auth bypass; this
// is the one that runs without it.
test("boots to the CEO City sign-in screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("CEO CITY")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter the city" })).toBeVisible();
  // Accounts are made here, not on another site.
  await page.getByRole("tab", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Start your career" })).toBeVisible();
});
