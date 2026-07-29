import { test, expect, type Page } from "@playwright/test";

// MAISON, walked (docs/maison.md §18.3 "E2E"). Runs only against a dev server
// started with the auth bypass:
//   DEV_WORLD=1 VITE_DEV_WORLD=1 npm run e2e
// CI keeps running just the login smoke.
//
// This is also the only place anything about MAISON is seen rather than proved:
// the unit suite holds the invariants, and this holds the pixels.
test.describe("MAISON (dev world bypass)", () => {
  test.skip(
    process.env.DEV_WORLD !== "1",
    "needs a VITE_DEV_WORLD=1 dev server — run: DEV_WORLD=1 VITE_DEV_WORLD=1 npm run e2e",
  );
  test.setTimeout(180_000);

  /** Everything the page complained about, so a silent failure cannot stay silent. */
  function collectProblems(page: Page): string[] {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console.error: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}\n${e.stack ?? ""}`));
    return problems;
  }

  async function bootCity(page: Page) {
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Entering the city…")).toHaveCount(0, { timeout: 60_000 });
    await expect(page.getByText("WASD")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800);
  }

  /**
   * Stand at MAISON's door without walking the whole of Market Street.
   *
   * The city publishes the venue you are next to on `worldStore`, and
   * CityScreen's E handler reads it straight back — so setting it is the same
   * door the player uses, not a back way in. Vite serves the module in dev,
   * which is the only reason this is reachable from a test.
   */
  async function standAtTheDoor(page: Page) {
    await page.evaluate(async () => {
      const mod = await import("/src/world/worldStore.ts");
      mod.useWorldStore.setState({ nearVenueId: "fashion_brand" });
    });
    await expect(page.getByRole("button", { name: /Enter\s+MAISON/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  test("the room loads, and says where you are", async ({ page }) => {
    const problems = collectProblems(page);
    await bootCity(page);
    await standAtTheDoor(page);
    await page.screenshot({ path: "test-results/maison-01-outside.png" });

    await page.keyboard.press("e");

    // The interior mounts behind its own overlay. If the build throws, the
    // overlay never clears — which is exactly the symptom to catch here.
    await expect(page.getByText("Back to the street")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("The door is heavy…")).toHaveCount(0, { timeout: 30_000 });

    await page.waitForTimeout(1200);
    await page.screenshot({ path: "test-results/maison-02-threshold.png" });

    // §14: Élise asks the threshold question once, before there is a season.
    await expect(
      page.getByText(/label you're starting, or the one you're taking over/),
    ).toBeVisible();
    await page.getByRole("button", { name: /the label you started/i }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "test-results/maison-03-room.png" });

    // The room says where you are and how long is left, in its own words.
    await expect(page.getByText(/to the show/)).toBeVisible();
    await expect(page.getByText(/is at the rail/)).toBeVisible(); // Ines, beat one

    // The interior owns the screen: the street's chrome is not stacked under
    // the room's own labels, and its hint no longer says "E to enter" at
    // somebody who is already inside.
    await expect(page.getByText("E to enter")).toHaveCount(0);
    await expect(page.getByText("Log out")).toHaveCount(0);
    await expect(page.getByText(/E to look/)).toBeVisible();

    // Walk to the rail and look at the collection (§18.2.4).
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(900);
    await page.keyboard.up("ArrowRight");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "test-results/maison-04-floor.png" });

    // The registry has no MAISON rows and the dev world has no token, so the
    // eighteen level fetches 401. That is §0.4, not a defect — everything else
    // the page complains about is.
    const real = problems.filter((p) => !/401/.test(p));
    expect(real, `the page reported problems:\n${real.join("\n\n")}`).toEqual([]);
  });
});
