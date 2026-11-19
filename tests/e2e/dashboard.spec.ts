import { expect, test } from '@playwright/test';
import { registerUser } from './helpers';

test('dashboard shows honest empty states for a new user', async ({ page }) => {
  await registerUser(page, 'dashboard');
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('No price comparisons yet')).toBeVisible();
  await expect(page.getByText('Competitor profiles', { exact: true })).toBeVisible();
  await expect(page.getByText('No matched products yet')).toBeVisible();
  await expect(page.getByText('No competitors monitored yet')).toBeVisible();
  await expect(page.getByText('No competitors added yet')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const text = await page.locator('body').innerText();
  for (const banned of ['NaN', 'undefined', 'PriceWhisperer', 'example.com']) {
    expect(text, `dashboard text contains "${banned}"`).not.toContain(banned);
  }
  // With no data there is nothing to compute a percentage from. The one allowed
  // figure is the real alert threshold the monitoring worker uses (10%).
  const withoutThreshold = text.replace('moves 10% or more between checks', '');
  expect(withoutThreshold.match(/\d+(\.\d+)?\s?%/g) ?? []).toEqual([]);
});

test('insights page shows an empty state, not demo numbers', async ({ page }) => {
  await registerUser(page, 'insights');
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'No insights yet' })).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text.match(/\d+(\.\d+)?\s?%/g) ?? []).toEqual([]);
});
