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
  }>;
  categories: string[];
  keywords: string[];
  mainContent: string;
  metadata?: {
    structuredData?: any[];
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    prices?: Array<{
      price: number;
      currency: string;
      timestamp: Date;
      source: string;
    }>;
  };
} 