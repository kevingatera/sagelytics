import { toMonitorableUrl } from '~/app/api/monitoring-tasks/product-url';

export interface CompetitorProductOption {
  name: string;
  url: string;
  matchedProducts?: Array<{ name: string; matchScore: number }>;
}

export interface CompetitorOption {
  domain: string;
  products: CompetitorProductOption[];
}

export interface UrlSuggestion {
  url: string;
  competitorProductName: string;
}

/**
 * The competitor's own product page that this user's analysis matched to `productName`,
 * picking the highest match score. Null when discovery found no matched page with a
 * usable URL; the caller must then ask the user rather than invent one.
 */
export function suggestCompetitorUrl(
  competitor: CompetitorOption | undefined,
  productName: string,
): UrlSuggestion | null {
  if (!competitor) return null;

  let best: { suggestion: UrlSuggestion; score: number } | null = null;
  for (const product of competitor.products) {
    const url = toMonitorableUrl(product.url ?? '');
    if (!url) continue;
    const match = (product.matchedProducts ?? []).find((m) => m.name === productName);
    if (!match) continue;
    if (!best || match.matchScore > best.score) {
      best = { suggestion: { url, competitorProductName: product.name }, score: match.matchScore };
    }
  }
  return best?.suggestion ?? null;
}

export type RowStatus =
  | { kind: 'ready'; url: string }
  | { kind: 'skipped' }
  | { kind: 'invalid' };

/** An empty URL skips the row; anything else must be a public http(s) URL. */
export function rowStatus(value: string | undefined): RowStatus {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return { kind: 'skipped' };
  const url = toMonitorableUrl(trimmed);
  return url ? { kind: 'ready', url } : { kind: 'invalid' };
}

export interface SelectedProduct {
  id: string;
  name: string;
  price?: number;
  currency?: string;
}

/**
 * Splits the selected products into task entries (with a real URL), skipped rows
 * (no URL) and invalid rows (a URL that will not be accepted).
 */
export function buildProductUrls(
  products: SelectedProduct[],
  urls: Record<string, string | undefined>,
): {
  entries: Array<{ id: string; name: string; url: string; price?: number; currency: string }>;
  skipped: SelectedProduct[];
  invalid: SelectedProduct[];
} {
  const entries: Array<{ id: string; name: string; url: string; price?: number; currency: string }> = [];
  const skipped: SelectedProduct[] = [];
  const invalid: SelectedProduct[] = [];

  for (const product of products) {
    const status = rowStatus(urls[product.id]);
    if (status.kind === 'ready') {
      entries.push({
        id: product.id,
        name: product.name,
        url: status.url,
        price: product.price,
        currency: product.currency ?? 'USD',
      });
    } else if (status.kind === 'skipped') {
      skipped.push(product);
    } else {
      invalid.push(product);
    }
  }

  return { entries, skipped, invalid };
}
