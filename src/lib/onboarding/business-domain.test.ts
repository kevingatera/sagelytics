import { describe, expect, it } from 'vitest';
import {
  isMarketplaceStorefrontUrl,
  MARKETPLACE_STOREFRONT_MESSAGE,
} from './business-domain';

describe('isMarketplaceStorefrontUrl', () => {
  it.each([
    'https://www.amazon.com/shops/acme-store',
    'amazon.com/shops/acme',
    'https://www.etsy.com/shop/AcmeCrafts',
    'https://etsy.com/shop/acme/about',
    'https://www.ebay.com/str/acme-outlet',
  ])('flags storefront URL %s', (url) => {
    expect(isMarketplaceStorefrontUrl(url)).toBe(true);
  });

  it.each([
    'https://acme.com',
    'https://acme.com/shop/rooms',
    'https://acme.myshopify.com',
    'https://acme.myshopify.com/collections/all',
    'https://www.amazon.com/dp/B000TEST00',
    'https://www.amazon.com',
    'https://www.etsy.com/shop/',
    'https://notamazon.com/shops/acme',
    'https://amazon.com.evil.example/shops/acme',
  ])('allows %s', (url) => {
    expect(isMarketplaceStorefrontUrl(url)).toBe(false);
  });

  it('returns false for input that is not a URL', () => {
    expect(isMarketplaceStorefrontUrl('not a url')).toBe(false);
  });

  it('exposes a user-facing message', () => {
    expect(MARKETPLACE_STOREFRONT_MESSAGE).toContain('storefront');
  });
});
