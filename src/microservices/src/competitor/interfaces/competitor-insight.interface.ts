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

export interface CompetitorInsight {
  domain: string;
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  listingPlatforms: Array<{
    platform: string;
    url: string;
    rating: number | null;
    reviewCount: number | null;
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
  }>;
  products: Array<{
    name: string;
    url: string;
    price: number | null;
    currency: string;
    matchedProducts: Array<{
      name: string;
      url: string;
      matchScore: number;
      priceDiff: number | null;
    }>;
    lastUpdated: string;
  }>;
}
