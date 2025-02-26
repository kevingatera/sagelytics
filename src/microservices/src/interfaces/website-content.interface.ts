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
  }>;
  services: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    url?: string;
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
  };
}
