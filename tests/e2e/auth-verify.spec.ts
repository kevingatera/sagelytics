import { expect, test } from '@playwright/test';
import {
  PASSWORD,
  createResetLink,
  createVerificationLink,
  login,
  registerAs,
  registerUnverified,
  submitVerification,
  uniqueEmail,
} from './helpers';

test.describe('email verification', () => {
  test('unverified login is refused with a clear message; the link verifies once', async ({ page }) => {
    const email = await registerUnverified(page, 'verify');

    await login(page, email);
    await expect(page.getByText('Your email address is not confirmed yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    const link = await createVerificationLink(email);
    await submitVerification(page, link);
    await expect(page.getByText('Your email address is confirmed.')).toBeVisible();

    // The same link cannot be used twice.
    await submitVerification(page, link);
    await expect(page.getByRole('alert').filter({ hasText: 'invalid, expired or already used' })).toBeVisible();

    await login(page, email);
    await page.waitForURL('**/onboarding', { timeout: 30_000 });
  });

  test('the link does not confirm a password the clicker did not choose', async ({ page }) => {
    // An attacker registers the owner's address with a password of their choosing.
    const email = uniqueEmail('verify-hijack');
    const attackerPassword = `${PASSWORD}-attacker`;
    await registerAs(page, email, attackerPassword);

    // The owner opens the emailed link but does not know that password.
    const link = await createVerificationLink(email);
    await submitVerification(page, link, PASSWORD);
    await expect(page.getByRole('alert').filter({ hasText: "doesn't match this account" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reset it' })).toBeVisible();

    // The account is still unverified, so the attacker's password does not sign in.
    await login(page, email, attackerPassword);
    await expect(page.getByText('Your email address is not confirmed yet.')).toBeVisible();

    // The owner resets the password instead, which also confirms the address.
    const ownerPassword = `${PASSWORD}-owner`;
    await page.goto(await createResetLink(email));
    await page.locator('#password').fill(ownerPassword);
    await page.locator('#confirmPassword').fill(ownerPassword);
    await page.getByRole('button', { name: 'Reset Password' }).click();
    await page.waitForURL('**/login', { timeout: 30_000 });

    // The verification link is gone and the attacker's password no longer works.
    await submitVerification(page, link, attackerPassword);
    await expect(page.getByRole('alert').filter({ hasText: 'invalid, expired or already used' })).toBeVisible();
    await login(page, email, attackerPassword);
    await expect(page.getByText('Invalid email or password. Please try again.')).toBeVisible();

    await login(page, email, ownerPassword);
    await page.waitForURL('**/onboarding', { timeout: 30_000 });
  });

  test('an unverified account with a wrong password gets the generic error', async ({ page }) => {
    const email = await registerUnverified(page, 'verify-wrong');

    await login(page, email, `${PASSWORD}-wrong`);
    await expect(page.getByText('Invalid email or password. Please try again.')).toBeVisible();
    await expect(page.getByText('Your email address is not confirmed yet.')).toHaveCount(0);
  });

  test('registering an existing email shows the same screen and keeps the first password', async ({ page }) => {
    const email = await registerUnverified(page, 'verify-dup');
    await registerAs(page, email, `${PASSWORD}-other`);

    // The second registration changed nothing: only the first password confirms the address.
    const link = await createVerificationLink(email);
    await submitVerification(page, link, `${PASSWORD}-other`);
    await expect(page.getByRole('alert').filter({ hasText: "doesn't match this account" })).toBeVisible();
    await page.locator('#verify-password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Confirm email' }).click();
    await expect(page.getByText('Your email address is confirmed.')).toBeVisible();
  });

  test('a made-up verification token is rejected', async ({ page }) => {
    await submitVerification(page, `/verify-email?token=${'x'.repeat(43)}`);
    await expect(page.getByRole('alert').filter({ hasText: 'invalid, expired or already used' })).toBeVisible();
  });
});
