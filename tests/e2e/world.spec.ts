import { test, expect } from "@playwright/test";

// Living-city visual spec. Runs only against a dev server started with the
// auth bypass:  DEV_WORLD=1 VITE_DEV_WORLD=1 npm run e2e
// (VITE_DEV_WORLD reaches the Vite webServer through the shell env; DEV_WORLD
// un-skips this spec.) CI keeps running just the login smoke.
test.describe("the living city (dev world bypass)", () => {
  test.skip(
    process.env.DEV_WORLD !== "1",
    "needs a VITE_DEV_WORLD=1 dev server — run: DEV_WORLD=1 VITE_DEV_WORLD=1 npm run e2e",
  );

  test("boots into the world with HUD, hint and ambient life", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    // Splash goes away once assets load and the ticker starts.
    await expect(page.getByText("Entering the city…")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText("WASD")).toBeVisible();
    await expect(page.getByText("Player")).toBeVisible(); // HUD chip (no auth in bypass)

    await page.waitForTimeout(1500); // let ambient actors walk into frame
    await page.screenshot({ path: "test-results/world-spawn.png" });

    // Take a stroll east so the camera crosses districts, then look again.
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(2600);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(1200);
    await page.keyboard.up("ArrowDown");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "test-results/world-walk.png" });
  });
});
