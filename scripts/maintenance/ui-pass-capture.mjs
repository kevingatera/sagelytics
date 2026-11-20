import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'docs/wip/ui-pass';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const routes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/onboarding', '/dashboard', '/competitors', '/products', '/monitoring', '/insights', '/settings', '/settings/data', '/missing-ui-pass'];
const records = [];
try {
  for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto('http://localhost:3100/register');
    await page.locator('#name').fill('UI Pass');
    await page.locator('#email').fill(`ui-pass-${size}-${Date.now()}@example.test`);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.waitForURL('**/onboarding', { timeout: 30000 });
    const anonymous = await context.browser().newContext({ viewport });
    const anonymousPage = await anonymous.newPage();
    for (const route of routes) {
      const target = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/missing-ui-pass'].includes(route) ? anonymousPage : page;
      const entry = { route, size, errors: [], failedRequests: [] };
      const onConsole = msg => { if (msg.type() === 'error') entry.errors.push(msg.text()); };
      const onPageError = error => entry.errors.push(error.message);
      const onFailed = req => entry.failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
      target.on('console', onConsole); target.on('pageerror', onPageError); target.on('requestfailed', onFailed);
      try {
        const response = await target.goto(`http://localhost:3100${route}`, { waitUntil: 'networkidle', timeout: 20000 });
        entry.status = response?.status(); entry.finalUrl = target.url();
        await target.screenshot({ path: `${output}/${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${size}.png` });
      } catch (error) { entry.errors.push(String(error)); }
      target.off('console', onConsole); target.off('pageerror', onPageError); target.off('requestfailed', onFailed);
      records.push(entry);
    }
    await anonymous.close();
    await context.close();
  }
} finally { await writeFile(`${output}/console.json`, JSON.stringify(records, null, 2) + '\n'); await browser.close(); }
