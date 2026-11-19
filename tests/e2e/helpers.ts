import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'TestPassword123!';

export function uniqueEmail(prefix: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${prefix}-${suffix}@example.test`;
}

/** Registers a fresh account through the UI. The page ends signed in on /onboarding. */
export async function registerUser(page: Page, prefix: string): Promise<string> {
  const email = uniqueEmail(prefix);
  await page.goto('/register');
  await page.locator('#name').fill('E2E User');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#confirmPassword').fill(PASSWORD);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.waitForURL('**/onboarding', { timeout: 30_000 });
  return email;
}

export async function login(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
}

export async function logout(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
}
