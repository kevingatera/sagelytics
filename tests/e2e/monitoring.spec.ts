import { expect, test } from '@playwright/test';
import { registerUser } from './helpers';

test('add-task form rejects an invalid product URL', async ({ page }) => {
  // A new user has no competitors or products, so seed the form's two lookups.
  // The rule under test runs in the browser, before anything is posted.
  await page.route('**/api/competitors', (route) =>
    route.fulfill({ json: { competitors: [{ id: 'c1', domain: 'rival-shop.test', metadata: { products: [] } }] } }),
  );
  await page.route('**/api/products', (route) =>
    route.fulfill({ json: { products: [{ id: 'p1', name: 'Blue Widget' }] } }),
  );
  let posted = false;
  await page.route('**/api/monitoring-tasks', async (route) => {
    if (route.request().method() === 'POST') posted = true;
    await route.continue();
  });

  await registerUser(page, 'monitoring');
  await page.goto('/monitoring');
  await page.getByRole('tab', { name: 'Add New Task' }).click();

  await page.getByRole('combobox').filter({ hasText: 'Select a competitor' }).click();
  await page.getByRole('option', { name: 'rival-shop.test' }).click();
  await page.getByText('Blue Widget', { exact: true }).click();

  const urlInput = page.locator('#product-url-p1');
  const submit = page.getByRole('button', { name: 'Create Monitoring Task' });

  for (const bad of ['not a url', 'ftp://rival-shop.test/widget', 'http://localhost/widget', 'http://192.168.1.10/widget']) {
    await urlInput.fill(bad);
    await expect(page.getByText('Enter a public http(s) product page URL')).toBeVisible();
    await expect(urlInput).toHaveAttribute('aria-invalid', 'true');
    await expect(submit).toBeDisabled();
  }

  await urlInput.fill('https://rival-shop.test/products/blue-widget');
  await expect(page.getByText('Enter a public http(s) product page URL')).toHaveCount(0);
  await expect(submit).toBeEnabled();
  expect(posted).toBe(false);
});
