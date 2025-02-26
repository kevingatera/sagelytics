export interface BusinessContext {
  businessType?: string;
  specificType?: string;
  offeringNomenclature?: string;
  userProducts?: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
  }>;
  extractionStrategy?: {
    offeringNomenclature?: string;
    [key: string]: unknown;
  };
}
