const FALLBACK_CATEGORY = 'other';
const MAX_CATEGORY_LENGTH = 100;

/**
 * Category for a product saved during onboarding. Prefers the category discovery reported,
 * then the business type the user chose, then 'other'.
 */
export function resolveProductCategory(input: {
  discoveredCategory?: unknown;
  businessType?: string | null;
}): string {
  const discovered =
    typeof input.discoveredCategory === 'string'
      ? input.discoveredCategory.trim()
      : '';
  if (discovered) {
    return discovered.slice(0, MAX_CATEGORY_LENGTH);
  }

  const businessType = input.businessType?.trim() ?? '';
  if (businessType) {
    return businessType.slice(0, MAX_CATEGORY_LENGTH);
  }

  return FALLBACK_CATEGORY;
}
