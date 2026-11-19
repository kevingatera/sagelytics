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

  for (const route of ['/dashboard', '/competitors', '/products', '/monitoring', '/insights', '/settings', '/onboarding']) {
    test(`anonymous visit to ${route} redirects to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();
    });
  }
});
