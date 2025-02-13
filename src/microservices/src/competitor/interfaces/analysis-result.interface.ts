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