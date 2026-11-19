import { z } from 'zod';

// Stored values must stay valid for existing rows, so the original four keep their values.
export const BUSINESS_TYPE_VALUES = [
  'hospitality',
  'tour_operator',
  'restaurant',
  'retail',
  'ecommerce',
  'saas',
  'marketplace',
  'other',
] as const;

export type BusinessType = (typeof BUSINESS_TYPE_VALUES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  hospitality: 'Hotel, lodge or guesthouse',
  tour_operator: 'Tours and activities',
  restaurant: 'Restaurant or café',
  retail: 'Shop (physical store)',
  ecommerce: 'Online shop',
  saas: 'Software (SaaS)',
  marketplace: 'Marketplace',
  other: 'Other',
};

export const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPE_VALUES.map((value) => ({
  value,
  label: BUSINESS_TYPE_LABELS[value],
}));

export const businessTypeSchema = z.enum(BUSINESS_TYPE_VALUES);

export function isBusinessType(value: unknown): value is BusinessType {
  return businessTypeSchema.safeParse(value).success;
}
