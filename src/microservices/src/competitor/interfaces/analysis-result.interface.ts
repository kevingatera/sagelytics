export interface AnalysisResult {
  searchType: 'organic' | 'local' | 'maps' | 'shopping';
  searchQuery: string;
  locationContext: {
    location: {
      address: string;
      country: string;
      region: string;
      city: string;
      latitude: number;
      longitude: number;
      formattedAddress: string;
      postalCode: string;
    };
    radius: number;
  };
  businessAttributes: {
    size: 'small' | 'medium' | 'large';
    focus: string[];
    businessCategory: string;
    onlinePresence: 'low' | 'moderate' | 'high';
    serviceType: 'product' | 'service' | 'hybrid';
    uniqueFeatures: string[];
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
    targetMarket: string[];
    competitiveAdvantages: string[];
  };
}
