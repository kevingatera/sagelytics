import { expect, test, type Page, type Request } from '@playwright/test';
import { registerUser } from './helpers';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
const SIGNED_IN_ROUTES = ['/onboarding', '/dashboard', '/competitors', '/products', '/monitoring', '/insights', '/settings', '/settings/data'];

/**
 * Failed requests that are not bugs. Keep this list short and explain each entry.
 */
function isAllowedFailure(request: Request): boolean {
  const error = request.failure()?.errorText ?? '';
  // Next.js prefetches linked routes (`?_rsc=`). Navigating away cancels the
  // in-flight prefetches, which Chromium reports as net::ERR_ABORTED.
  if (error === 'net::ERR_ABORTED' && new URL(request.url()).searchParams.has('_rsc')) return true;
  // React Query cancels in-flight tRPC fetches when the page that started them
  // unmounts during navigation. Also reported as net::ERR_ABORTED.
  if (error === 'net::ERR_ABORTED' && new URL(request.url()).pathname.startsWith('/api/trpc/')) return true;
  return false;
}

function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (!isAllowedFailure(request)) problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`http ${response.status()}: ${response.url()}`);
  });
  return problems;
}

async function visit(page: Page, problems: string[], route: string) {
  const start = problems.length;
  const response = await page.goto(route, { waitUntil: 'networkidle' });
  expect(response?.status(), `${route} status`).toBe(200);
  await expect(page.locator('body')).not.toBeEmpty();
  expect(problems.slice(start), `problems on ${route}`).toEqual([]);
}

test('public routes load without console errors', async ({ page }) => {
  const problems = watch(page);
  for (const route of PUBLIC_ROUTES) await visit(page, problems, route);
});

test('signed-in routes load without console errors', async ({ page }) => {
  await registerUser(page, 'smoke');
  const problems = watch(page);
  for (const route of SIGNED_IN_ROUTES) await visit(page, problems, route);
});
