// Marketplace seller pages live on a marketplace host, not on the business's own domain.
// Rules match the registrable name under any country suffix (amazon.co.uk, ebay.de, etsy.ca).
const STOREFRONT_RULES = [
  { name: 'amazon', path: /^\/shops\/[^/]+/i },
  { name: 'etsy', path: /^\/shop\/[^/]+/i },
  { name: 'ebay', path: /^\/str\/[^/]+/i },
];

const SECOND_LEVEL_LABELS = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac']);

export const MARKETPLACE_STOREFRONT_MESSAGE =
  'Enter your own website domain, not a marketplace storefront page.';

// The labels after the registrable name must be a bare TLD (amazon.de) or a
// second-level label plus country code (amazon.co.uk). Anything longer is someone else's domain.
function isPublicSuffix(labels: string[]): boolean {
  if (labels.length === 1) {
    return /^[a-z]{2,}$/.test(labels[0] ?? '');
  }
  if (labels.length === 2) {
    return (
      SECOND_LEVEL_LABELS.has(labels[0] ?? '') &&
      /^[a-z]{2}$/.test(labels[1] ?? '')
    );
  }
  return false;
}

function hasRegistrableName(host: string, name: string): boolean {
  const labels = host.split('.');
  return labels.some(
    (label, index) => label === name && isPublicSuffix(labels.slice(index + 1)),
  );
}

export function isMarketplaceStorefrontUrl(value: string): boolean {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();
  const rule = STOREFRONT_RULES.find((candidate) =>
    hasRegistrableName(host, candidate.name),
  );
  return rule?.path.test(url.pathname) ?? false;
}
