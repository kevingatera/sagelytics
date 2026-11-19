import { createHash, randomBytes } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import postgres from 'postgres';

export const PASSWORD = 'TestPassword123!';

export function uniqueEmail(prefix: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${prefix}-${suffix}@example.test`;
}

/**
 * Gives each test its own client address so the per-IP auth rate limits do not trip across the
 * suite. The app reads the IP only from a configured source: run the server with
 * CLIENT_IP_HEADER=cf-connecting-ip (as on staging behind Cloudflare) or TRUSTED_PROXY_HOPS=1.
 * Both headers carry the same address so either setting works.
 */
export async function useFreshClientIp(page: Page): Promise<void> {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  const ip = `10.${octet()}.${octet()}.${octet()}`;
  await page.context().setExtraHTTPHeaders({ 'cf-connecting-ip': ip, 'x-forwarded-for': ip });
}

let sql: postgres.Sql | null = null;

function testDb(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL must point at the throwaway e2e database');
  sql ??= postgres(url, { max: 1, onnotice: () => undefined });
  return sql;
}

/**
 * Creates a verification link for the account, as the registration email would. The app stores
 * only a SHA-256 of each token, so the test writes its own token row into the throwaway database
 * instead of reading one; consuming it still goes through the real /verify-email flow.
 */
export async function createVerificationLink(email: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const identifier = `verify:${email.trim().toLowerCase()}`;
  const db = testDb();
  await db`delete from sg_verification_token where identifier = ${identifier}`;
  await db`
    insert into sg_verification_token (identifier, token, expires)
    values (${identifier}, ${createHash('sha256').update(token).digest('hex')}, now() + interval '1 hour')
  `;
  return `/verify-email?token=${token}`;
}

/** Registers through the UI and stops at the "check your email" screen. */
export async function registerUnverified(page: Page, prefix: string): Promise<string> {
  const email = uniqueEmail(prefix);
  await useFreshClientIp(page);
  await page.goto('/register');
  await page.locator('#name').fill('E2E User');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#confirmPassword').fill(PASSWORD);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  return email;
}

export async function verifyEmail(page: Page, email: string): Promise<void> {
  await page.goto(await createVerificationLink(email));
  await page.getByRole('button', { name: 'Confirm email' }).click();
  await expect(page.getByText('Your email address is confirmed.')).toBeVisible();
}

/** Registers, confirms the email and logs in. The page ends signed in on /onboarding. */
export async function registerUser(page: Page, prefix: string): Promise<string> {
  const email = await registerUnverified(page, prefix);
  await verifyEmail(page, email);
  await login(page, email);
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
