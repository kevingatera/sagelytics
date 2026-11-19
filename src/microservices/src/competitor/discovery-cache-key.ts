import { createHash } from 'crypto';

/**
 * Version 3 scopes complete discovery results to the requesting user and keeps the catalog
 * query string. Keys from earlier versions were shared across users and are never read.
 */
export const DISCOVERY_CACHE_VERSION = 3;
export const DISCOVERY_CACHE_PREFIX = `competitor:discovery:v${DISCOVERY_CACHE_VERSION}`;

export type DiscoveryPipelineName = 'legacy' | 'two-stage';

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

/**
 * Keeps scheme, host, path and the query sorted by key. Drops userinfo and the fragment,
 * which never reach the server.
 */
export function normalizeCatalogUrl(url: string | null | undefined): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    parsed.searchParams.sort();
    const query = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return trimmed.split('#')[0] ?? '';
  }
}

/** A bounded, secret-free stand-in for the catalog URL. Empty when there is no catalog. */
export function hashCatalogUrl(url: string | null | undefined): string {
  const normalized = normalizeCatalogUrl(url);
  return normalized ? sha256(normalized) : '';
}

/**
 * Key for a complete discovery result, which holds the user's products and match scores.
 * Callers pass an already normalized domain. Returns null without a user id, so such a
 * request is neither cached nor shared with another in-flight call.
 */
export function buildDiscoveryCacheKey(input: {
  pipeline: DiscoveryPipelineName;
  userId: string | null | undefined;
  userDomain: string;
  businessType: string;
  knownCompetitors: string[];
  productCatalogUrl: string | null | undefined;
}): string | null {
  const userId = (input.userId ?? '').trim();
  if (!userId) {
    return null;
  }

  const payload = {
    userId,
    userDomain: input.userDomain,
    businessType: (input.businessType ?? '').toLowerCase().trim(),
    knownCompetitors: input.knownCompetitors.filter(Boolean).sort(),
    catalog: hashCatalogUrl(input.productCatalogUrl),
  };
  return `${DISCOVERY_CACHE_PREFIX}:${input.pipeline}:${sha256(JSON.stringify(payload))}`;
}
