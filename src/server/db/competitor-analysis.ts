/**
 * Competitor data is stored in two places.
 *
 * - competitors.metadata: public facts shared by every user (business name, listing
 *   platforms, the competitor's own product prices).
 * - user_competitor_analysis: what one user's analysis produced (match score, reasons,
 *   approach, and matches to that user's products with price differences).
 *
 * This module has no imports so the same rules serve the Next.js routes, the tRPC
 * router, and the microservice test suite.
 */

export type PlatformData = {
  platform: string;
  url: string;
  metrics: {
    sales?: number;
    reviews?: number;
    rating?: number;
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
    lastUpdated: string;
  };
};

export type CompetitorProduct = {
  name: string;
  url: string;
  price: number | null;
  currency: string | null;
  platform: string;
  lastUpdated: string;
};

export type ProductPriceMatch = {
  name: string;
  url: string | null;
  matchScore: number;
  priceDiff: number | null;
};

export type CompetitorPublicMetadata = {
  businessName?: string;
  lastAnalyzed: string;
  platforms: PlatformData[];
  products: CompetitorProduct[];
};

export type UserCompetitorAnalysis = {
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  lastAnalyzed: string | null;
  productMatches: Array<{ productKey: string; matchedProducts: ProductPriceMatch[] }>;
};

/** Read-side view: shared facts merged with one user's analysis. */
export type CompetitorMetadata = {
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  lastAnalyzed: string;
  businessName?: string;
  platforms: PlatformData[];
  products: Array<CompetitorProduct & { matchedProducts: ProductPriceMatch[] }>;
};

/** Discovery output as the microservice and routes receive it. */
export type CompetitorInsightInput = {
  businessName?: string | null;
  matchScore?: number | null;
  matchReasons?: string[] | null;
  suggestedApproach?: string | null;
  dataGaps?: string[] | null;
  listingPlatforms?: Array<{
    platform: string;
    url: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    priceRange?: { min: number; max: number; currency: string } | null;
  }> | null;
  products?: Array<{
    name?: string | null;
    url?: string | null;
    price?: number | null;
    currency?: string | null;
    matchedProducts?: Array<{
      name?: string | null;
      url?: string | null;
      matchScore?: number | null;
      priceDiff?: number | null;
    }> | null;
  }> | null;
};

/** Stable key for a competitor product, used to tie a user's matches to shared products. */
export function productKey(product: { url?: string | null; name?: string | null }): string {
  return (product.url ?? '').trim() || (product.name ?? '').trim();
}

function knownPrice(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function splitCompetitorInsight(
  insight: CompetitorInsightInput,
  analyzedAt: string,
): { shared: CompetitorPublicMetadata; analysis: UserCompetitorAnalysis } {
  const products = insight.products ?? [];

  return {
    shared: {
      businessName: insight.businessName ?? undefined,
      lastAnalyzed: analyzedAt,
      platforms: (insight.listingPlatforms ?? []).map((platform) => ({
        platform: platform.platform,
        url: platform.url ?? '',
        metrics: {
          rating: platform.rating ?? undefined,
          reviews: platform.reviewCount ?? undefined,
          priceRange: platform.priceRange ?? undefined,
          lastUpdated: analyzedAt,
        },
      })),
      products: products.map((product) => ({
        name: product.name ?? '',
        url: product.url ?? '',
        price: knownPrice(product.price),
        currency: product.currency ?? null,
        platform: 'unknown',
        lastUpdated: analyzedAt,
      })),
    },
    analysis: {
      matchScore: insight.matchScore ?? 0,
      matchReasons: insight.matchReasons ?? [],
      suggestedApproach: insight.suggestedApproach ?? '',
      dataGaps: insight.dataGaps ?? [],
      lastAnalyzed: analyzedAt,
      productMatches: products.map((product) => ({
        productKey: productKey(product),
        matchedProducts: (product.matchedProducts ?? []).map((match) => ({
          name: match.name ?? '',
          url: match.url ?? null,
          matchScore: match.matchScore ?? 0,
          priceDiff: match.priceDiff ?? null,
        })),
      })),
    },
  };
}

/**
 * Merges one user's public facts into the shared row. Existing platforms and products
 * are kept, so one user's discovery does not erase another user's product list. A
 * product whose price is unknown in this pass keeps its last known price.
 */
export function mergeSharedMetadata(
  existing: CompetitorPublicMetadata | null,
  incoming: CompetitorPublicMetadata,
): CompetitorPublicMetadata {
  if (!existing) return incoming;

  const platforms = new Map<string, PlatformData>();
  for (const platform of existing.platforms ?? []) {
    platforms.set(`${platform.platform}|${platform.url}`, platform);
  }
  for (const platform of incoming.platforms) {
    platforms.set(`${platform.platform}|${platform.url}`, platform);
  }

  const products = new Map<string, CompetitorProduct>();
  for (const product of existing.products ?? []) {
    products.set(productKey(product), product);
  }
  for (const product of incoming.products) {
    const key = productKey(product);
    const prior = products.get(key);
    products.set(key, prior && product.price === null && prior.price !== null ? prior : product);
  }

  return {
    businessName: incoming.businessName ?? existing.businessName,
    lastAnalyzed: incoming.lastAnalyzed,
    platforms: [...platforms.values()],
    products: [...products.values()],
  };
}

/**
 * Builds the read view. A null analysis means the user has no analysis of this
 * competitor, so no matches are shown, even if other users have analyzed it.
 */
export function toCompetitorMetadata(
  shared: CompetitorPublicMetadata,
  analysis: UserCompetitorAnalysis | null,
): CompetitorMetadata {
  return {
    matchScore: analysis?.matchScore ?? 0,
    matchReasons: analysis?.matchReasons ?? [],
    suggestedApproach: analysis?.suggestedApproach ?? '',
    dataGaps: analysis?.dataGaps ?? [],
    lastAnalyzed: analysis?.lastAnalyzed ?? shared.lastAnalyzed,
    businessName: shared.businessName,
    platforms: shared.platforms ?? [],
    products: (shared.products ?? []).map((product) => ({
      ...product,
      matchedProducts:
        analysis?.productMatches.find((match) => match.productKey === productKey(product))
          ?.matchedProducts ?? [],
    })),
  };
}

export interface CompetitorAnalysisStore {
  findCompetitorByDomain(
    domain: string,
  ): Promise<{ id: string; metadata: CompetitorPublicMetadata } | null>;
  upsertCompetitor(
    domain: string,
    metadata: CompetitorPublicMetadata,
  ): Promise<{ id: string }>;
  upsertUserAnalysis(
    userId: string,
    competitorId: string,
    analysis: UserCompetitorAnalysis,
  ): Promise<void>;
  linkUser(userId: string, competitorId: string, relationshipStrength: number): Promise<void>;
}

/**
 * Saves one user's discovery result: public facts to the shared row, analysis to the
 * user's row, and the user-competitor link. Returns the competitor id.
 */
export async function persistCompetitorForUser(
  store: CompetitorAnalysisStore,
  input: {
    userId: string;
    domain: string;
    insight: CompetitorInsightInput;
    relationshipStrength: number;
    analyzedAt?: string;
  },
): Promise<string> {
  const analyzedAt = input.analyzedAt ?? new Date().toISOString();
  const { shared, analysis } = splitCompetitorInsight(input.insight, analyzedAt);

  const existing = await store.findCompetitorByDomain(input.domain);
  const { id } = await store.upsertCompetitor(
    input.domain,
    mergeSharedMetadata(existing?.metadata ?? null, shared),
  );
  await store.upsertUserAnalysis(input.userId, id, analysis);
  await store.linkUser(input.userId, id, input.relationshipStrength);

  return id;
}
