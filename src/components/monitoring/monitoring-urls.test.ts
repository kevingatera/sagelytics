import { describe, expect, it } from 'vitest';
import { buildProductUrls, rowStatus, suggestCompetitorUrl, type CompetitorOption } from './monitoring-urls';

const competitor: CompetitorOption = {
  domain: 'competitor.example',
  products: [
    {
      name: 'Rival Pro',
      url: 'https://competitor.example/products/rival-pro',
      matchedProducts: [{ name: 'Our Pro', matchScore: 70 }],
    },
    {
      name: 'Rival Pro Max',
      url: 'https://competitor.example/products/rival-pro-max',
      matchedProducts: [{ name: 'Our Pro', matchScore: 90 }],
    },
    { name: 'No page', url: '', matchedProducts: [{ name: 'Our Basic', matchScore: 95 }] },
  ],
};

describe('suggestCompetitorUrl', () => {
  it("returns the best-matched competitor page from the user's analysis", () => {
    expect(suggestCompetitorUrl(competitor, 'Our Pro')).toEqual({
      url: 'https://competitor.example/products/rival-pro-max',
      competitorProductName: 'Rival Pro Max',
    });
  });

  it('returns null instead of inventing a URL when no matched page has one', () => {
    expect(suggestCompetitorUrl(competitor, 'Our Basic')).toBeNull();
    expect(suggestCompetitorUrl(competitor, 'Unmatched')).toBeNull();
    expect(suggestCompetitorUrl(undefined, 'Our Pro')).toBeNull();
  });
});

describe('buildProductUrls', () => {
  const products = [
    { id: 'p1', name: 'Our Pro', price: 40 },
    { id: 'p2', name: 'Our Basic' },
    { id: 'p3', name: 'Our Lite' },
  ];

  it('sends rows with a real URL, skips empty rows and flags bad ones', () => {
    const result = buildProductUrls(products, {
      p1: 'https://competitor.example/products/rival-pro-max',
      p2: '',
      p3: 'example.com/products/p3',
    });

    expect(result.entries).toEqual([
      {
        id: 'p1',
        name: 'Our Pro',
        url: 'https://competitor.example/products/rival-pro-max',
        price: 40,
        currency: 'USD',
      },
    ]);
    expect(result.skipped.map((p) => p.id)).toEqual(['p2']);
    expect(result.invalid.map((p) => p.id)).toEqual(['p3']);
  });

  it('never builds a placeholder URL from the product id', () => {
    const result = buildProductUrls(products, {});
    expect(result.entries).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('example.com/products');
  });
});

describe('rowStatus', () => {
  it('treats blank as skipped and a private address as invalid', () => {
    expect(rowStatus('   ')).toEqual({ kind: 'skipped' });
    expect(rowStatus('http://192.168.0.10/p')).toEqual({ kind: 'invalid' });
  });
});
