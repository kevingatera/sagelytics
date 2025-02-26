export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    url?: string;
    price?: number;
    currency?: string;
    description?: string;
    category?: string;
    lastUpdated?: string;
    type?: 'physical' | 'digital';
  }>;
  services: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    category?: string;
    type?: string;
  }>;
  categories: string[];
  keywords: string[];
  mainContent: string;
  metadata?: {
    structuredData?: Record<string, unknown>[];
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
    };
    prices?: Array<{
      price: number;
      currency: string;
      timestamp: Date;
      source: string;
    }>;
    hasPhysicalLocation?: boolean;
    hasOnlineServices?: boolean;
    hasOnlineBooking?: boolean;
    socialMedia?: string[];
    hasApp?: boolean;
    employeeCount?: number;
    locationCount?: number;
    priceRange?: string;
    qualityIndicators?: string[];
    marketPosition?: string;
    serviceRadius?: number;
    deliveryRadius?: number;
    uniqueFeatures?: string[];
    capabilities?: string[];
    targetDemographics?: string[];
    marketSegments?: string[];
    usp?: string[];
    strengths?: string[];
  };
}
