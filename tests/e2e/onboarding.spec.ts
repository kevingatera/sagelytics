import { expect, test, type Page } from '@playwright/test';
import { registerUser } from './helpers';

const MARKETPLACE_MESSAGE = 'Enter your own website domain, not a marketplace storefront page.';
// Exact match: the catalog field's placeholder also starts with this text.
const DOMAIN_PLACEHOLDER = 'https://yourcompany.com';

async function fillCompanyStep(page: Page, domain: string) {
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Online shop' }).click();
  await page.getByPlaceholder(DOMAIN_PLACEHOLDER, { exact: true }).fill(domain);
  await page.getByRole('button', { name: 'Continue' }).click();
}

test.describe('onboarding', () => {
  test('rejects a marketplace storefront and accepts a real domain', async ({ page }) => {
    // Discovery calls paid APIs. Intercept it so the test never reaches the backend.
    const posted: unknown[] = [];
    await page.route('**/api/onboarding', async (route) => {
      posted.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, json: { success: true, sessionId: 'e2e-session' } });
    });
    // Hold the progress stream open so the page stays on its "setting up" view.
    let releaseProgress: () => void = () => undefined;
    const progressHeld = new Promise<void>((resolve) => (releaseProgress = resolve));
    const progressUrls: string[] = [];
    await page.route('**/api/onboarding/progress/**', async (route) => {
      progressUrls.push(new URL(route.request().url()).pathname);
      await progressHeld;
      await route.abort().catch(() => undefined);
    });

    await registerUser(page, 'onboarding');

    await expect(page.getByRole('link', { name: 'Skip for now' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
    await expect(page.getByText('Page that lists your rooms, tours or prices (optional)')).toBeVisible();
    await expect(page.getByText('We read prices from this page.')).toBeVisible();

    await fillCompanyStep(page, 'https://www.etsy.com/shop/example');
    await expect(page.getByText(MARKETPLACE_MESSAGE)).toBeVisible();
    await expect(page.getByText('Add your main competitors')).toHaveCount(0);

    await page.getByPlaceholder(DOMAIN_PLACEHOLDER, { exact: true }).fill('https://acme-widgets.test');
    await expect(page.getByText(MARKETPLACE_MESSAGE)).toHaveCount(0);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Add your main competitors')).toBeVisible();
    await expect(page.getByText('we find competitors for you automatically')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();

    await expect(page.getByText('Integration', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Complete Setup' }).click();

    await expect(page.getByText('Setting up your account')).toBeVisible();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ companyDomain: 'https://acme-widgets.test', businessType: 'ecommerce' });
    await expect.poll(() => progressUrls).toEqual(['/api/onboarding/progress/e2e-session']);
    await expect(page.getByText('Setup Failed')).toHaveCount(0);

    releaseProgress();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('Skip for now opens the dashboard', async ({ page }) => {
    await registerUser(page, 'onboarding-skip');

    await page.getByRole('link', { name: 'Skip for now' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
