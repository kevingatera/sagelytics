// Marketplace seller pages live on a marketplace host, not on the business's own domain.
const STOREFRONT_RULES = [
  { host: 'amazon.com', path: /^\/shops\/[^/]+/i },
  { host: 'etsy.com', path: /^\/shop\/[^/]+/i },
  { host: 'ebay.com', path: /^\/str\/[^/]+/i },
];

export const MARKETPLACE_STOREFRONT_MESSAGE =
  'Enter your own website domain, not a marketplace storefront page.';

export function isMarketplaceStorefrontUrl(value: string): boolean {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();
  const rule = STOREFRONT_RULES.find(
    (candidate) =>
      host === candidate.host || host.endsWith(`.${candidate.host}`),
  );
  return rule?.path.test(url.pathname) ?? false;
}
