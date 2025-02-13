import type { ProductMatch } from './product-match.interface';

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
    priceRange: {
      min: number;
      max: number;
      currency: string;
    } | null;
  }>;
  products: ProductMatch[];
} 