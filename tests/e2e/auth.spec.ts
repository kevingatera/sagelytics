import { expect, test } from '@playwright/test';
import { PASSWORD, login, logout, registerUser } from './helpers';

test.describe('auth', () => {
  test('register, confirm email, log in and open onboarding', async ({ page }) => {
    await registerUser(page, 'register');
    await expect(page.getByRole('heading', { name: 'Welcome to Sagelytics' })).toBeVisible();
  });

  test('login and logout', async ({ page }) => {
    const email = await registerUser(page, 'login');
    await logout(page);

    await login(page, email);
    // A user who has not finished onboarding is sent there after login.
    await page.waitForURL('**/onboarding', { timeout: 30_000 });

    await logout(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('wrong password shows an error and stays on login', async ({ page }) => {
    const email = await registerUser(page, 'wrong-password');
    await logout(page);

    await login(page, email, `${PASSWORD}-wrong`);
    await expect(page.getByText('Invalid email or password. Please try again.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('changing the password in settings ends other sessions', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const email = await registerUser(page, 'change-password');
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, email);
    await otherPage.waitForURL('**/onboarding', { timeout: 30_000 });

    const newPassword = `${PASSWORD}-new`;
    await page.goto('/settings?tab=profile');
    await page.locator('#currentPassword').fill(PASSWORD);
    await page.locator('#newPassword').fill(newPassword);
    await page.locator('#confirmPassword').fill(newPassword);
    await page.getByRole('button', { name: 'Update Password' }).click();
    await page.waitForURL('**/login', { timeout: 30_000 });

    // Every request re-checks the session version, so the other session ends at once.
    await otherPage.goto('/dashboard');
    await expect(otherPage).toHaveURL(/\/login$/);
    await other.close();

    await login(page, email);
    await expect(page.getByText('Invalid email or password. Please try again.')).toBeVisible();
    await login(page, email, newPassword);
    await page.waitForURL('**/onboarding', { timeout: 30_000 });
  });

  test('reset-password limits each client IP before any token or password work', async ({ request }) => {
    const ip = `10.250.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
    const attempt = () =>
      request.post('/api/auth/reset-password', {
        headers: { 'cf-connecting-ip': ip, 'x-forwarded-for': ip },
        data: { token: 'x'.repeat(43), password: 'irrelevant-password' },
      });
    for (let i = 0; i < 10; i++) expect((await attempt()).status()).toBe(400);
    const limited = await attempt();
    expect(limited.status()).toBe(429);
    expect(limited.headers()['retry-after']).toBeTruthy();
  });

  test('a refused Google sign-in explains how to sign in with a password instead', async ({ page }) => {
    await page.goto('/auth/error?error=GoogleEmailMismatch');
    await expect(page.getByText('does not match the email address of the Sagelytics account')).toBeVisible();
    await expect(page.getByText('Sign in with your email and password instead.')).toBeVisible();
    await page.getByRole('link', { name: 'Reset your password' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test('a Google sign-in refused for an unproven link says to confirm the email or reset the password', async ({ page }) => {
    await page.goto('/auth/error?error=GoogleLinkUnproven');
    await expect(page.getByText("Google doesn't manage the email address on this Google account")).toBeVisible();
    await expect(page.getByText('Confirm your email address from the link we email you, or reset your password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reset your password' })).toBeVisible();
  });

  test('a Google sign-up for an address Google does not manage points to registering with a password', async ({ page }) => {
    await page.goto('/auth/error?error=GoogleEmailUnmanaged');
    await expect(page.getByText("Google sign-up isn't available for this address")).toBeVisible();
    await expect(page.getByText('Create an account with your email address and a password instead')).toBeVisible();
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  for (const route of ['/dashboard', '/competitors', '/products', '/monitoring', '/insights', '/settings', '/onboarding']) {
    test(`anonymous visit to ${route} redirects to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();
    });
  }
});
