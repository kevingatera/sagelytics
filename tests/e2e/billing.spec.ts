import { expect, test } from '@playwright/test';
import { registerUser } from './helpers';

// The e2e environment has no STRIPE_SECRET_KEY, so billing runs in its disabled mode.

test('billing tab shows the free allowance and no price when paid plans are off', async ({ page }) => {
  let checkoutPosted = false;
  await page.route('**/api/billing/checkout', async (route) => {
    checkoutPosted = true;
    await route.fallback();
  });

  await registerUser(page, 'billing');
  await page.goto('/settings?tab=billing');

  await expect(page.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'true');
  const panel = page.getByRole('tabpanel', { name: 'Billing' });
  await expect(panel.getByText('Current plan')).toBeVisible();
  await expect(panel.getByText('Free', { exact: true })).toBeVisible();

  await expect(panel.getByText('Competitor discoveries')).toBeVisible();
  await expect(panel.getByText('0 / 2')).toBeVisible();
  await expect(
    panel.getByRole('progressbar', { name: 'Competitor discoveries' }),
  ).toHaveAttribute('aria-valuetext', '0 of 2 used');
  await expect(panel.getByRole('progressbar', { name: 'Monitored products' })).toBeVisible();
  await expect(panel.getByText(/Resets on \w+ \d{1,2}, \d{4}\./)).toBeVisible();

  await expect(panel.getByText("Paid plans aren't available yet.")).toBeVisible();
  const upgrade = panel.getByRole('button', { name: 'Upgrade' });
  await expect(upgrade).toBeDisabled();
  await expect(upgrade).toHaveAccessibleDescription("Paid plans aren't available yet.");
  await expect(panel.getByRole('button', { name: 'Manage billing' })).toHaveCount(0);

  const text = await panel.innerText();
  expect(text).not.toMatch(/[$€£]\s?\d|\d+(\.\d+)?\s?(USD|EUR|GBP)|\/\s?(mo|month)\b|per month/i);
  for (const banned of ['NaN', 'undefined', 'Invalid Date']) {
    expect(text, `billing text contains "${banned}"`).not.toContain(banned);
  }
  expect(checkoutPosted).toBe(false);
});

test('billing tab is reachable from the tab list and kept in the URL', async ({ page }) => {
  await registerUser(page, 'billing-tab');
  await page.goto('/settings');

  await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Billing' }).click();

  await expect(page).toHaveURL(/[?&]tab=billing\b/);
  await expect(page.getByRole('tabpanel', { name: 'Billing' }).getByText('Current plan')).toBeVisible();

  await page.getByRole('tab', { name: 'Notifications' }).click();
  await expect(page).toHaveURL(/[?&]tab=notifications\b/);
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'true');
});

test('billing tab stays visible in the scrolling tab list on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registerUser(page, 'billing-mobile');
  await page.goto('/settings?tab=billing');

  const tab = page.getByRole('tab', { name: 'Billing' });
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(tab).toBeInViewport({ ratio: 1 });
});

test('checkout return flags show a toast once and are cleared from the URL', async ({ page }) => {
  await registerUser(page, 'billing-return');
  await page.goto('/settings?tab=billing&checkout=cancelled');

  await expect(page.getByText('Checkout cancelled')).toBeVisible();
  await expect(page).not.toHaveURL(/checkout=/);
  await expect(page).toHaveURL(/[?&]tab=billing\b/);
  await expect(page.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'true');
});
