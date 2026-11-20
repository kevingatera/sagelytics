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
    'https://www.amazon.co.uk/shops/acme-store',
    'https://amazon.de/shops/acme',
    'https://www.amazon.com.au/shops/acme',
    'https://www.ebay.co.uk/str/acme-outlet',
    'https://www.ebay.de/str/acme-outlet',
    'https://etsy.ca/shop/AcmeCrafts',
    'https://www.etsy.co.uk/shop/AcmeCrafts',
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
    'https://myamazonstore.com/shops/acme',
    'https://myamazonstore.co.uk/shops/acme',
    'https://acme-ebay.de/str/acme',
    'https://etsyshop.ca/shop/acme',
    'https://amazon.evil.co.uk/shops/acme',
    'https://ebay.example.com/str/acme',
    'https://www.amazon.co.uk',
    'https://www.ebay.de/str/',
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
