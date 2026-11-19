import { expect, test } from '@playwright/test';
import { uniqueEmail } from './helpers';

// Runs with SMTP_HOST and EMAIL_FROM unset, as in local dev and CI.
test('forgot password explains that reset email is not configured', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/forgot-password');
  await page.locator('#email').fill(uniqueEmail('forgot'));

  const reply = page.waitForResponse('**/api/auth/forgot-password');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  expect((await reply).status()).toBe(503);

  await expect(page.getByRole('alert').filter({ hasText: 'Password reset email is not configured' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to login' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
