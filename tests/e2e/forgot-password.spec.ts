import { expect, test } from '@playwright/test';
import { uniqueEmail } from './helpers';

// Runs with SMTP_HOST and EMAIL_FROM unset, as in local dev and CI. Set E2E_SMTP_CONFIGURED=1
// when pointing PLAYWRIGHT_BASE_URL at a deployment that sends email, such as staging.
test('forgot password explains that reset email is not configured', async ({ page }) => {
  test.skip(process.env.E2E_SMTP_CONFIGURED === '1', 'the target server sends email');
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
