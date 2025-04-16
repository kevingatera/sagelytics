// Product Types
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
  matchScore?: number;
  priceDiff?: number;
}

export interface Product {
  name: string;
  description?: string;
  url?: string;
  price?: number;
  currency?: string;
}

export interface ListingPlatform {
  platform: string;
  url: string;
  rating: number | null;
  reviewCount: number | null;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  } | null;
}

// Competitor Analysis Types
export interface CompetitorInsight {
  domain: string;
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  listingPlatforms: ListingPlatform[];
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
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
    targetMarket: string[];
    competitiveAdvantages: string[];
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

// Website Content Types
export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    url?: string | null;
    price?: number | null;
    currency?: string;
    description?: string | null;
    category?: string | null;
    lastUpdated?: string;
    type?: 'physical' | 'digital' | 'service';
  }>;
  services: Array<{
    name: string;
    description?: string | null;
    price?: number | null;
    currency?: string;
    url?: string | null;
    category?: string | null;
  }>;
  categories: string[];
  keywords: string[];
  mainContent: string;
  metadata?: {
    businessType?: string;
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      postalCode?: string;
      employeeCount?: number;
      locationCount?: number;
      hasOnlineBooking?: boolean;
      serviceRadius?: number;
      deliveryRadius?: number;
      hasApp?: boolean;
      hasPhysicalLocation?: boolean;
      hasOnlineServices?: boolean;
      capabilities?: string[];
      targetDemographics?: string[];
    };
    socialMedia?: Record<string, string>;
    structuredData?: Record<string, unknown>[];
    prices?: Array<{
      price: number;
      currency: string;
      source: string;
    }>;
    extractedData?: Record<string, unknown>;
  };
}

// Enhanced Website Content Type (extends WebsiteContent)
export interface EnhancedWebsiteContent extends WebsiteContent {
  metadata?: WebsiteContent['metadata'] & {
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
    marketPosition?: string;
    uniqueFeatures?: string[];
    serviceRadius?: number;
    deliveryRadius?: number;
    employeeCount?: number;
    locationCount?: number;
    hasOnlineBooking?: boolean;
    hasApp?: boolean;
    hasPhysicalLocation?: boolean;
    hasOnlineServices?: boolean;
    capabilities?: string[];
    targetDemographics?: string[];
    usp?: string[];
    strengths?: string[];
  };
}

// Business Context Types
export interface BusinessContext {
  domain: string;
  businessType?: string;
  specificType?: string;
  offeringNomenclature?: string;
  userBusinessType?: string;
  products?: Product[];
  extractionStrategy?: {
    offeringNomenclature?: string;
    [key: string]: unknown;
  };
}

// Location Types
export interface GeoLocation {
  address: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  city: string;
  postalCode?: string;
  formattedAddress: string;
}

export interface LocationContext {
  location: GeoLocation;
  radius: number; // in kilometers
  timezone?: string;
}

// Data Types
export interface PriceData {
  price: number;
  currency: string;
  source: string;
}

export interface RobotsData {
  userAgent: string;
  rules: string[];
  sitemaps?: string[];
  crawlDelay?: number;
  allowedPaths?: string[];
  disallowedPaths?: string[];
}

export interface SitemapData {
  urls: string[];
  entries?: Array<{
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: number;
  }>;
}

export interface PlatformData {
  platform: string;
  url: string;
  metrics: PlatformMetrics;
}

export interface PlatformMetrics {
  rating?: number;
  reviewCount?: number;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

export type { 
  ChartData, 
  ChartDataset, 
  CompetitorBase, 
  DashboardCompetitor, 
  DashboardData, 
  DashboardPlatformData,
  DashboardPlatformMetrics,
  DashboardProduct,
} from './dashboard'; 