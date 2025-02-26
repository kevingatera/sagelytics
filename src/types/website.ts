export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    url: string | null;
    price: number | null;
    currency: string;
    description: string | null;
    category: string | null;
  }>;
  services: Array<{
    name: string;
    url: string | null;
    price: number | null;
    currency: string;
    description: string | null;
    category: string | null;
  }>;
  metadata: {
    businessType?: string;
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    socialMedia?: Record<string, string>;
    structuredData?: Record<string, unknown>[];
    prices?: Array<{
      price: number;
      currency: string;
      timestamp: string;
      source: string;
    }>;
    extractedData?: Record<string, unknown>;
  };
}
