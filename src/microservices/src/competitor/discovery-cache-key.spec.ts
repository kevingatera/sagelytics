import {
  DISCOVERY_CACHE_PREFIX,
  buildDiscoveryCacheKey,
  hashCatalogUrl,
  normalizeCatalogUrl,
} from './discovery-cache-key';

const base = {
  pipeline: 'two-stage' as const,
  userId: 'user-a',
  userDomain: 'acme.example',
  businessType: 'ecommerce',
  knownCompetitors: ['rival.example'],
  productCatalogUrl: 'https://acme.example/catalog?sig=aaa',
};

describe('discovery cache key', () => {
  it('differs for two users with the same domain and catalog', () => {
    const a = buildDiscoveryCacheKey(base);
    const b = buildDiscoveryCacheKey({ ...base, userId: 'user-b' });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).not.toBe(b);
  });

  it('differs for the same user when catalog URLs differ only in the query', () => {
    const a = buildDiscoveryCacheKey(base);
    const b = buildDiscoveryCacheKey({
      ...base,
      productCatalogUrl: 'https://acme.example/catalog?sig=bbb',
    });
    expect(a).not.toBe(b);
  });

  it('is shared when catalog URLs differ only in the fragment', () => {
    const a = buildDiscoveryCacheKey(base);
    const b = buildDiscoveryCacheKey({
      ...base,
      productCatalogUrl: 'https://acme.example/catalog?sig=aaa#rooms',
    });
    expect(a).toBe(b);
  });

  it('ignores query parameter order', () => {
    const a = buildDiscoveryCacheKey({
      ...base,
      productCatalogUrl: 'https://acme.example/catalog?b=2&a=1',
    });
    const b = buildDiscoveryCacheKey({
      ...base,
      productCatalogUrl: 'https://acme.example/catalog?a=1&b=2',
    });
    expect(a).toBe(b);
  });

  it('separates the two pipelines', () => {
    expect(buildDiscoveryCacheKey(base)).not.toBe(
      buildDiscoveryCacheKey({ ...base, pipeline: 'legacy' }),
    );
  });

  it('uses the bumped version prefix and holds no URL or secret', () => {
    const key = buildDiscoveryCacheKey(base) as string;
    expect(DISCOVERY_CACHE_PREFIX).toBe('competitor:discovery:v3');
    expect(key.startsWith(`${DISCOVERY_CACHE_PREFIX}:two-stage:`)).toBe(true);
    expect(key).toMatch(/^competitor:discovery:v3:two-stage:[0-9a-f]{64}$/);
    expect(key).not.toContain('sig');
    expect(key).not.toContain('acme');
    expect(key).not.toContain('user-a');
  });

  it('returns null without a user id, so nothing is cached or shared', () => {
    expect(buildDiscoveryCacheKey({ ...base, userId: '' })).toBeNull();
    expect(buildDiscoveryCacheKey({ ...base, userId: undefined })).toBeNull();
  });
});

describe('catalog URL normalization', () => {
  it('keeps scheme, host, path and the sorted query; drops fragment and userinfo', () => {
    expect(
      normalizeCatalogUrl('https://user:pw@Acme.example/Catalog?z=1&a=2#frag'),
    ).toBe('https://acme.example/Catalog?a=2&z=1');
  });

  it('adds https to a bare host', () => {
    expect(normalizeCatalogUrl('acme.example/catalog')).toBe(
      'https://acme.example/catalog',
    );
  });

  it('hashes to a fixed-length sha256, empty for no catalog', () => {
    expect(hashCatalogUrl('https://acme.example/catalog?sig=x')).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(hashCatalogUrl('')).toBe('');
  });
});
