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
    priceRange: {
      min: number;
      max: number;
      currency: string;
    } | null;
  }>;
  products: ProductMatch[];
}

export interface AnalysisResult {
  searchType: 'maps' | 'shopping' | 'local' | 'organic';
  searchQuery: string;
  locationContext?: {
    location: {
      address: string;
      latitude: number;
      longitude: number;
      country: string;
      region: string;
      city: string;
      postalCode?: string;
      formattedAddress: string;
    };
    radius: number;
    timezone?: string;
  } | null;
  targetDemographic?: string;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  businessAttributes?: {
    size: 'small' | 'medium' | 'large';
    focus: string[];
    onlinePresence: 'weak' | 'moderate' | 'strong';
    businessCategory: string;
    serviceType: 'product' | 'service' | 'hybrid';
    uniqueFeatures: string[];
  };
}

export interface DiscoveryResult {
  competitors: CompetitorInsight[];
  recommendedSources: string[];
  searchStrategy: AnalysisResult;
  stats: {
    totalDiscovered: number;
    newCompetitors: number;
    existingCompetitors: number;
    failedAnalyses: number;
  };
} 