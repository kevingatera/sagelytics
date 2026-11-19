import { expect, test, type Page } from '@playwright/test';
import { registerUser } from './helpers';

const MARKETPLACE_MESSAGE = 'Enter your own website domain, not a marketplace storefront page.';

async function fillCompanyStep(page: Page, domain: string) {
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'E-commerce' }).click();
  await page.getByPlaceholder('https://yourcompany.com').fill(domain);
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

    await fillCompanyStep(page, 'https://www.etsy.com/shop/example');
    await expect(page.getByText(MARKETPLACE_MESSAGE)).toBeVisible();
    await expect(page.getByText('Add your main competitors')).toHaveCount(0);

    await page.getByPlaceholder('https://yourcompany.com').fill('https://acme-widgets.test');
    await expect(page.getByText(MARKETPLACE_MESSAGE)).toHaveCount(0);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Add your main competitors')).toBeVisible();

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Set up your integrations')).toBeVisible();
    await page.getByRole('button', { name: 'Complete Setup' }).click();

    await expect(page.getByText('Setting up your account')).toBeVisible();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ companyDomain: 'https://acme-widgets.test', businessType: 'ecommerce' });
    await expect.poll(() => progressUrls).toEqual(['/api/onboarding/progress/e2e-session']);
    await expect(page.getByText('Setup Failed')).toHaveCount(0);

    releaseProgress();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
