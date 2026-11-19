import { expect, test } from '@playwright/test';
import { PASSWORD, createVerificationLink, login, registerUnverified } from './helpers';

test.describe('email verification', () => {
  test('unverified login is refused with a clear message; the link verifies once', async ({ page }) => {
    const email = await registerUnverified(page, 'verify');

    await login(page, email);
    await expect(page.getByText('Your email address is not confirmed yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    const link = await createVerificationLink(email);
    await page.goto(link);
    await page.getByRole('button', { name: 'Confirm email' }).click();
    await expect(page.getByText('Your email address is confirmed.')).toBeVisible();

    // The same link cannot be used twice.
    await page.goto(link);
    await page.getByRole('button', { name: 'Confirm email' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'invalid, expired or already used' })).toBeVisible();

    await login(page, email);
    await page.waitForURL('**/onboarding', { timeout: 30_000 });
  });

  test('an unverified account with a wrong password gets the generic error', async ({ page }) => {
    const email = await registerUnverified(page, 'verify-wrong');

    await login(page, email, `${PASSWORD}-wrong`);
    await expect(page.getByText('Invalid email or password. Please try again.')).toBeVisible();
    await expect(page.getByText('Your email address is not confirmed yet.')).toHaveCount(0);
  });

  test('registering an existing email shows the same confirmation screen', async ({ page }) => {
    const email = await registerUnverified(page, 'verify-dup');

    await page.goto('/register');
    await page.locator('#name').fill('Someone Else');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(`${PASSWORD}-other`);
    await page.locator('#confirmPassword').fill(`${PASSWORD}-other`);
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  });

  test('a made-up verification token is rejected', async ({ page }) => {
    await page.goto(`/verify-email?token=${'x'.repeat(43)}`);
    await page.getByRole('button', { name: 'Confirm email' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'invalid, expired or already used' })).toBeVisible();
  });
});
