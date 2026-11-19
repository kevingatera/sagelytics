import {
  persistCompetitorForUser,
  toCompetitorMetadata,
  type CompetitorAnalysisStore,
  type CompetitorInsightInput,
  type CompetitorPublicMetadata,
  type UserCompetitorAnalysis,
} from '../../../server/db/competitor-analysis';

class InMemoryCompetitorStore implements CompetitorAnalysisStore {
  readonly competitors = new Map<string, { id: string; metadata: CompetitorPublicMetadata }>();
  readonly analyses = new Map<string, UserCompetitorAnalysis>();
  readonly links = new Map<string, number>();
  private nextId = 1;

  async findCompetitorByDomain(domain: string) {
    return this.competitors.get(domain) ?? null;
  }

  async upsertCompetitor(domain: string, metadata: CompetitorPublicMetadata) {
    const existing = this.competitors.get(domain);
    const id = existing?.id ?? `competitor-${this.nextId++}`;
    this.competitors.set(domain, { id, metadata });
    return { id };
  }

  async upsertUserAnalysis(userId: string, competitorId: string, analysis: UserCompetitorAnalysis) {
    this.analyses.set(`${userId}|${competitorId}`, analysis);
  }

  async linkUser(userId: string, competitorId: string, relationshipStrength: number) {
    this.links.set(`${userId}|${competitorId}`, relationshipStrength);
  }

  viewFor(userId: string, domain: string) {
    const row = this.competitors.get(domain);
    if (!row) throw new Error(`no competitor ${domain}`);
    return toCompetitorMetadata(row.metadata, this.analyses.get(`${userId}|${row.id}`) ?? null);
  }
}

const DOMAIN = 'rival.example';

const insightForUserA: CompetitorInsightInput = {
  businessName: 'Rival Co',
  matchScore: 92,
  matchReasons: ['Same catalog'],
  suggestedApproach: 'Undercut on bundles',
  dataGaps: [],
  listingPlatforms: [
    { platform: 'Website', url: 'https://rival.example', rating: 4.5, reviewCount: 10, priceRange: null },
  ],
  products: [
    {
      name: 'Pro Plan',
      url: 'https://rival.example/pro',
      price: 49,
      currency: 'USD',
      matchedProducts: [{ name: 'Pro Plan', url: null, matchScore: 95, priceDiff: 9 }],
    },
  ],
};

const insightForUserB: CompetitorInsightInput = {
  matchScore: 31,
  matchReasons: ['Different segment'],
  suggestedApproach: 'Ignore',
  dataGaps: ['No pricing'],
  listingPlatforms: [],
  products: [
    {
      name: 'Starter',
      url: 'https://rival.example/starter',
      price: null,
      currency: null,
      matchedProducts: [{ name: 'Starter Kit', url: null, matchScore: 60, priceDiff: null }],
    },
  ],
};

describe('competitor analysis is scoped per user', () => {
  it('keeps user A analysis intact when user B analyzes the same competitor', async () => {
    const store = new InMemoryCompetitorStore();
    const idA = await persistCompetitorForUser(store, {
      userId: 'user-a',
      domain: DOMAIN,
      insight: insightForUserA,
      relationshipStrength: 4,
      analyzedAt: '2026-11-04T00:00:00.000Z',
    });
    const idB = await persistCompetitorForUser(store, {
      userId: 'user-b',
      domain: DOMAIN,
      insight: insightForUserB,
      relationshipStrength: 1,
      analyzedAt: '2026-11-05T00:00:00.000Z',
    });

    expect(idB).toBe(idA);

    const viewA = store.viewFor('user-a', DOMAIN);
    expect(viewA.matchScore).toBe(92);
    expect(viewA.matchReasons).toEqual(['Same catalog']);
    expect(viewA.products.find((p) => p.name === 'Pro Plan')?.matchedProducts).toEqual([
      { name: 'Pro Plan', url: null, matchScore: 95, priceDiff: 9 },
    ]);

    const viewB = store.viewFor('user-b', DOMAIN);
    expect(viewB.matchScore).toBe(31);
    expect(viewB.matchReasons).toEqual(['Different segment']);
    expect(viewB.products.find((p) => p.name === 'Pro Plan')?.matchedProducts).toEqual([]);
    expect(viewB.products.find((p) => p.name === 'Starter')?.matchedProducts).toEqual([
      { name: 'Starter Kit', url: null, matchScore: 60, priceDiff: null },
    ]);
  });

  it('keeps only public competitor facts on the shared row', async () => {
    const store = new InMemoryCompetitorStore();
    await persistCompetitorForUser(store, {
      userId: 'user-a',
      domain: DOMAIN,
      insight: insightForUserA,
      relationshipStrength: 4,
    });

    const shared = store.competitors.get(DOMAIN)!.metadata;
    const serialized = JSON.stringify(shared);
    expect(shared).not.toHaveProperty('matchScore');
    expect(serialized).not.toContain('Same catalog');
    expect(serialized).not.toContain('priceDiff');
    expect(serialized).not.toContain('matchedProducts');
    expect(shared.businessName).toBe('Rival Co');
    expect(shared.products[0]).toMatchObject({ name: 'Pro Plan', price: 49 });
  });

  it('merges public product facts so one user analysis does not erase another users products', async () => {
    const store = new InMemoryCompetitorStore();
    await persistCompetitorForUser(store, {
      userId: 'user-a',
      domain: DOMAIN,
      insight: insightForUserA,
      relationshipStrength: 4,
    });
    await persistCompetitorForUser(store, {
      userId: 'user-b',
      domain: DOMAIN,
      insight: insightForUserB,
      relationshipStrength: 1,
    });

    const shared = store.competitors.get(DOMAIN)!.metadata;
    expect(shared.products.map((p) => p.name).sort()).toEqual(['Pro Plan', 'Starter']);
    expect(store.viewFor('user-a', DOMAIN).products.map((p) => p.name).sort()).toEqual([
      'Pro Plan',
      'Starter',
    ]);
  });

  it('stores an unknown competitor price as null, not 0', async () => {
    const store = new InMemoryCompetitorStore();
    await persistCompetitorForUser(store, {
      userId: 'user-b',
      domain: DOMAIN,
      insight: insightForUserB,
      relationshipStrength: 1,
    });

    const starter = store.competitors.get(DOMAIN)!.metadata.products.find((p) => p.name === 'Starter');
    expect(starter?.price).toBeNull();
  });

  it('gives a linked user with no analysis no matches from another user', async () => {
    const store = new InMemoryCompetitorStore();
    await persistCompetitorForUser(store, {
      userId: 'user-a',
      domain: DOMAIN,
      insight: insightForUserA,
      relationshipStrength: 4,
    });
    await store.linkUser('user-c', store.competitors.get(DOMAIN)!.id, 1);

    const viewC = store.viewFor('user-c', DOMAIN);
    expect(viewC.matchScore).toBe(0);
    expect(viewC.products.every((p) => p.matchedProducts.length === 0)).toBe(true);
  });
});
