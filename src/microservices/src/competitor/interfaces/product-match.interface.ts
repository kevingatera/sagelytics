export interface ProductMatch {
  name: string;
  url: string | null;
  price: number | null;
  currency: string | null;
  matchedProducts: Array<{
    name: string;
    url: string | null;
    matchScore: number;
    priceDiff: number | null;
  }>;
  lastUpdated: string;
} 