import { defineConfig, devices } from '@playwright/test';

// F0 smoke: login (dev-mock auth) -> walk -> enter venue -> exit.
// The webServer runs the dev build with VITE_CITY_MOCK_AUTH=1 so CI needs no
// real Firebase credentials (PRD §18). The real Firebase path is exercised
// manually with a supplied web API key.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_CITY_MOCK_AUTH: '1' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
