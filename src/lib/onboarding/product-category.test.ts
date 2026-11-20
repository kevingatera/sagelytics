import { describe, expect, it } from 'vitest';
import { resolveProductCategory } from './product-category';

describe('resolveProductCategory', () => {
  it('uses the category discovery reported', () => {
    expect(
      resolveProductCategory({
        discoveredCategory: 'tours',
        businessType: 'saas',
      }),
    ).toBe('tours');
  });

  it('trims a discovered category', () => {
    expect(
      resolveProductCategory({
        discoveredCategory: '  meals  ',
        businessType: 'ecommerce',
      }),
    ).toBe('meals');
  });

  it('falls back to the business type when no category was discovered', () => {
    expect(
      resolveProductCategory({
        discoveredCategory: undefined,
        businessType: 'ecommerce',
      }),
    ).toBe('ecommerce');
  });

  it('ignores a blank or non-string discovered category', () => {
    expect(
      resolveProductCategory({ discoveredCategory: '   ', businessType: 'saas' }),
    ).toBe('saas');
    expect(
      resolveProductCategory({ discoveredCategory: 42, businessType: 'saas' }),
    ).toBe('saas');
  });

  it('falls back to other when neither value is usable', () => {
    expect(resolveProductCategory({})).toBe('other');
    expect(
      resolveProductCategory({ discoveredCategory: null, businessType: '' }),
    ).toBe('other');
  });

  it('truncates to the 100 character column width', () => {
    const long = 'a'.repeat(150);

    expect(resolveProductCategory({ discoveredCategory: long })).toHaveLength(
      100,
    );
  });
});
