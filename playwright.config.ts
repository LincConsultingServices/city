import { defineConfig, devices } from "@playwright/test";

// E2E config (PRD §18). Boots the Vite dev server and runs the smoke spec against
// Chromium. Run: `npm run e2e` (needs `npx playwright install chromium` once).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    // Sandboxes/CI images with a system Chromium can point at it instead of
    // downloading a matching build: PW_CHROMIUM_PATH=/path/to/chrome npm run e2e
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
