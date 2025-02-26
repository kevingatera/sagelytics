export interface AgentTools {
  search: {
    serpSearch: (query: string, type: 'shopping' | 'maps' | 'local' | 'organic') => Promise<{
      url: string;
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    }[]>;
  };
  web: {
    fetchContent: (url: string) => Promise<string>;
    extractText: (html: string) => string;
    extractStructuredData: (html: string) => any[];
    extractPricing: (html: string) => {
      price: number;
      currency: string;
      source: string;
    }[];
    extractMetaTags: (html: string) => {
      title: string;
      description: string;
      keywords: string[];
    };
  };
  analysis: {
    compareProducts: (a: string, b: string) => Promise<number>;
    extractFeatures: (text: string) => Promise<string[]>;
    categorizeOffering: (
      text: string,
      businessContext?: { 
        businessType: string;
        offeringNomenclature?: string;
      }
    ) => Promise<{
      type: string;
      category: string;
      features: string[];
      name: string;
      pricing: {
        value: number | null;
        currency: string;
        unit: string;
      };
    }>;
    detectBusinessType: (text: string, url: string) => Promise<{
      businessType: string;
      specificType: string;
      mainOfferings: string[];
      extractionStrategy: {
        keyPages: string[];
        offeringNomenclature: string;
        pricingTerms: string[];
      };
    }>;
    extractPricesForBusinessType: (html: string, businessType: string) => Promise<{
      value: number;
      currency: string;
      unit: string;
      context: string;
      source: string;
    }[]>;
  };
  navigation: {
    findRelevantPages: (baseUrl: string, html: string) => Promise<string[]>;
    checkRobotsRules: (url: string) => Promise<boolean>;
  };
} 