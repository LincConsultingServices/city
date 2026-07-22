import { test, expect } from '@playwright/test';

// F0 smoke against the dev-mock auth boundary (VITE_CITY_MOCK_AUTH=1, set by the
// Playwright webServer). Covers the reliably-observable DOM seam: login → city
// HUD → logout. Movement + venue-enter run over the Pixi canvas and are covered
// by the nav/manifest unit tests + the manual playtest gate (PRD §18).
test('login (mock) → city HUD → logout', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'The City' })).toBeVisible();
  await page.getByLabel('Email').fill('player@thecity.dev');
  await page.getByLabel('Password').fill('open-sesame');
  await page.getByRole('button', { name: /enter the city/i }).click();

  // We're in the city: the HUD is up.
  await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^map$/i })).toBeVisible();

  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page.getByRole('heading', { name: 'The City' })).toBeVisible();
});
