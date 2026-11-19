import { expect, test } from '@playwright/test';

test('privacy and terms load signed out and login and register link to both', async ({ page }) => {
  const privacy = await page.goto('/privacy');
  expect(privacy?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();

  const terms = await page.goto('/terms');
  expect(terms?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible();

  for (const route of ['/login', '/register']) {
    await page.goto(route);
    await expect(page.getByRole('link', { name: 'Privacy Policy', exact: true })).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name: 'Terms of Service', exact: true })).toHaveAttribute('href', '/terms');
  }
});
