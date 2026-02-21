const DENYLIST = new Set([
  'tripadvisor.com',
  'expedia.com',
  'booking.com',
  'hotels.com',
  'agoda.com',
  'kayak.com',
  'priceline.com',
  'orbitz.com',
  'travelocity.com',
  'airbnb.com',
  'google.com',
  'bing.com',
  'yahoo.com',
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
]);

export function normalizeDomain(raw: string): string {
  const input = (raw ?? '').trim();
  if (!input) {
    return '';
  }

  try {
    const url =
      input.startsWith('http://') || input.startsWith('https://')
        ? new URL(input)
        : new URL(`https://${input}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase();
  }
}

export function isDenylisted(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  return DENYLIST.has(normalized);
}
