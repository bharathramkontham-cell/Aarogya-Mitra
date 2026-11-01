// Automated accessibility scans (axe-core) on the main public and app pages.
// Manual keyboard-navigation checks are listed in docs/TEST_RESULTS.md.

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const DEMO_PATIENT = 'patient.demo@example.com';
const DEMO_PASSWORD = 'Password123!';

async function scan(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  if (path === '/app' || path === '/app/medications') {
    await page.getByLabel('E-mail').fill(DEMO_PATIENT);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app/);
  }
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  return results.violations;
}

test('landing page has no serious/critical axe violations', async ({ page }) => {
  const violations = await scan(page, '/');
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});

test('privacy page has no serious/critical axe violations', async ({ page }) => {
  const violations = await scan(page, '/privacy');
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});

test('sign-in page has no serious/critical axe violations', async ({ page }) => {
  const violations = await scan(page, '/signin');
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});

test('dashboard has no serious/critical axe violations', async ({ page }) => {
  const violations = await scan(page, '/app');
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});

test('medications page has no serious/critical axe violations', async ({ page }) => {
  const violations = await scan(page, '/app/medications');
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});
