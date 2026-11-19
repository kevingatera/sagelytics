import { describe, expect, it } from 'vitest';
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_TYPE_VALUES,
  businessTypeSchema,
  isBusinessType,
} from './business-types';

describe('business types', () => {
  it('lists hospitality-style types first', () => {
    expect(BUSINESS_TYPE_VALUES.slice(0, 4)).toEqual([
      'hospitality',
      'tour_operator',
      'restaurant',
      'retail',
    ]);
  });

  it('keeps every value that existing onboarding rows may store', () => {
    expect(BUSINESS_TYPE_VALUES).toEqual(expect.arrayContaining(['ecommerce', 'saas', 'marketplace', 'other']));
  });

  it('has a unique, non-empty label for every value', () => {
    const labels = BUSINESS_TYPE_OPTIONS.map((option) => option.label);

    expect(new Set(labels).size).toBe(BUSINESS_TYPE_VALUES.length);
    for (const value of BUSINESS_TYPE_VALUES) {
      expect(BUSINESS_TYPE_LABELS[value].trim()).not.toBe('');
    }
  });

  it('uses the labels hotel and tour owners recognise', () => {
    expect(BUSINESS_TYPE_LABELS.hospitality).toBe('Hotel, lodge or guesthouse');
    expect(BUSINESS_TYPE_LABELS.tour_operator).toBe('Tours and activities');
    expect(BUSINESS_TYPE_LABELS.restaurant).toBe('Restaurant or café');
    expect(BUSINESS_TYPE_LABELS.retail).toBe('Shop (physical store)');
    expect(BUSINESS_TYPE_LABELS.ecommerce).toBe('Online shop');
    expect(BUSINESS_TYPE_LABELS.saas).toBe('Software (SaaS)');
  });

  it('accepts known values and rejects anything else', () => {
    expect(isBusinessType('hospitality')).toBe(true);
    expect(isBusinessType('saas')).toBe(true);
    expect(isBusinessType('Hospitality')).toBe(false);
    expect(isBusinessType('')).toBe(false);
    expect(isBusinessType(undefined)).toBe(false);
    expect(businessTypeSchema.safeParse('bakery').success).toBe(false);
  });
});
