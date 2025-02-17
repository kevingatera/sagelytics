import { Injectable } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { AnalysisResult } from '../interfaces/analysis-result.interface';
import type { ProductMatch } from '../interfaces/product-match.interface';
import type { EnhancedWebsiteContent } from '../interfaces/enhanced-website-content.interface';
import { JsonUtils } from '@shared/utils';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import type { WebsiteContent } from '../../interfaces/website-content.interface';

@Injectable()
export class CompetitorAnalysisService {
  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService
  ) {}

  private parseJsonResponse<T>(content: string, type: 'object' | 'array' = 'object'): T {
    try {
      const jsonStr = JsonUtils.extractJSON(content, type);
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Failed to parse structured output from LLM');
    }
  }

  async analyzeCompetitor(
    domain: string, 
    strategy: AnalysisResult, 
    serpData?: any,
    additionalContent?: WebsiteContent
  ): Promise<CompetitorInsight> {
    try {
      console.log(`Analyzing competitor ${domain}`);
      
      // Discover website content
      let content = await this.websiteDiscovery.discoverWebsiteContent(domain);
      
      // Merge with additional content if provided
      if (additionalContent) {
        content = {
          ...content,
          products: [...content.products, ...additionalContent.products],
          services: [...content.services, ...additionalContent.services],
          categories: [...new Set([...content.categories, ...additionalContent.categories])],
          keywords: [...new Set([...content.keywords, ...additionalContent.keywords])],
          mainContent: `${content.mainContent}\n${additionalContent.mainContent}`
        };
      }

      const prompt = `Analyze ${domain} as a potential competitor.

      Business Context:
      ${JSON.stringify(strategy, null, 2)}

      SERP Metadata:
      ${serpData ? JSON.stringify(serpData, null, 2) : 'No SERP data available'}

      Return ONLY a JSON object with this structure:
      {
        "domain": "${domain}",
        "matchScore": number between 0-100,
        "matchReasons": ["reason1", "reason2"],
        "suggestedApproach": "detailed strategy",
        "dataGaps": ["gap1", "gap2"],
        "listingPlatforms": [
          {
            "platform": "platform name",
            "url": "platform url",
            "rating": number or null,
            "reviewCount": number or null,
            "priceRange": {
              "min": number,
              "max": number,
              "currency": "USD"
            }
          }
        ],
        "products": [
          {
            "name": "Product Name",
            "url": "Product URL",
            "price": number or null,
            "currency": "USD",
            "matchedProducts": [
              {
                "name": "Matched Product Name",
                "url": "Matched Product URL",
                "matchScore": number between 0-100,
                "priceDiff": number or null
              }
            ],
            "lastUpdated": "current ISO date"
          }
        ]
      }`;

      const result = await this.modelManager.withBatchProcessing(async (llm) => {
        return await llm.invoke(prompt);
      }, prompt);

      const insight = this.parseJsonResponse<CompetitorInsight>(result.content.toString());

      // Enhance insight with SERP metadata if available
      if (serpData) {
        if (serpData.rating || serpData.reviewCount) {
          insight.listingPlatforms.push({
            platform: 'Google',
            url: `https://www.google.com/search?q=${encodeURIComponent(domain)}`,
            rating: serpData.rating || null,
            reviewCount: serpData.reviewCount || null,
            priceRange: serpData.priceRange || null
          });
        }
      }

      return insight;
    } catch (error) {
      console.error(`Failed to analyze competitor ${domain}:`, error);
      throw error;
    }
  }

  async analyzeProductMatches(
    ourProducts: Array<{ name: string; url: string; price: number }>,
    competitorProducts: Array<{ name: string; url: string; price: number | null }>,
  ): Promise<ProductMatch[]> {
    const prompt = `Compare these products and find matches:
    Our Products: ${JSON.stringify(ourProducts, null, 2)}
    Competitor Products: ${JSON.stringify(competitorProducts, null, 2)}
    
    Return ONLY a JSON array of product matches with these fields:
    [
      {
        "name": "Product Name",
        "url": "Product URL",
        "price": number or null,
        "currency": "USD",
        "matchedProducts": [
          {
            "name": "Matched Product Name",
            "url": "Matched Product URL",
            "matchScore": number between 0-100,
            "priceDiff": number or null
          }
        ],
        "lastUpdated": "current ISO date"
      }
    ]`;
    
    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    return this.parseJsonResponse<ProductMatch[]>(result.content.toString(), 'array');
  }

  private mapBusinessTypeToSearchType(businessType: string, searchType: string): 'maps' | 'shopping' | 'local' | 'organic' {
    // First check if the provided searchType is already valid
    if (['maps', 'shopping', 'local', 'organic'].includes(searchType)) {
      return searchType as 'maps' | 'shopping' | 'local' | 'organic';
    }

    // Map common business types to search types
    const businessTypeMap: Record<string, 'maps' | 'shopping' | 'local' | 'organic'> = {
      'hotel': 'maps',
      'lodge': 'maps',
      'resort': 'maps',
      'accommodation': 'maps',
      'restaurant': 'maps',
      'cafe': 'maps',
      'store': 'shopping',
      'shop': 'shopping',
      'retail': 'shopping',
      'ecommerce': 'shopping',
      'service': 'local',
      'local': 'local',
      'business': 'local',
      'online': 'organic',
      'digital': 'organic',
      'saas': 'organic'
    };

    // Try to match business type
    const lowerType = businessType.toLowerCase();
    for (const [key, value] of Object.entries(businessTypeMap)) {
      if (lowerType.includes(key)) {
        return value;
      }
    }

    // Try to match search type
    const lowerSearchType = searchType.toLowerCase();
    for (const [key, value] of Object.entries(businessTypeMap)) {
      if (lowerSearchType.includes(key)) {
        return value;
      }
    }

    // Default to local if no match found
    return 'local';
  }

  private analyzeBusinessSignals(websiteContent: any): {
    hasPhysicalLocation: boolean;
    hasEcommerce: boolean;
    hasServices: boolean;
    hasBooking: boolean;
    locationScore: number;
    ecommerceScore: number;
    serviceScore: number;
  } {
    const signals = {
      hasPhysicalLocation: false,
      hasEcommerce: false,
      hasServices: false,
      hasBooking: false,
      locationScore: 0,
      ecommerceScore: 0,
      serviceScore: 0
    };

    // Check metadata and structured data
    if (websiteContent.metadata?.contactInfo?.address) {
      signals.hasPhysicalLocation = true;
      signals.locationScore += 30;
    }

    // Analyze products
    if (Array.isArray(websiteContent.products) && websiteContent.products.length > 0) {
      signals.hasEcommerce = true;
      signals.ecommerceScore += Math.min(websiteContent.products.length * 10, 40);
      
      // Check for physical products vs digital
      const digitalKeywords = ['download', 'digital', 'software', 'subscription', 'license'];
      const physicalKeywords = ['shipping', 'delivery', 'weight', 'size', 'dimensions'];
      
      let digitalCount = 0;
      let physicalCount = 0;
      
      websiteContent.products.forEach((product: any) => {
        const description = (product.description || '').toLowerCase();
        if (digitalKeywords.some(kw => description.includes(kw))) {
          digitalCount++;
        }
        if (physicalKeywords.some(kw => description.includes(kw))) {
          physicalCount++;
        }
      });
      
      if (digitalCount > physicalCount) {
        signals.ecommerceScore += 20;
      }
    }

    // Analyze services
    if (Array.isArray(websiteContent.services) && websiteContent.services.length > 0) {
      signals.hasServices = true;
      signals.serviceScore += Math.min(websiteContent.services.length * 10, 40);
      
      // Check for booking/reservation related services
      const bookingKeywords = ['booking', 'reservation', 'appointment', 'schedule', 'book now'];
      websiteContent.services.forEach((service: any) => {
        const description = (service.description || '').toLowerCase();
        if (bookingKeywords.some(kw => description.includes(kw))) {
          signals.hasBooking = true;
          signals.serviceScore += 10;
        }
      });
    }

    // Analyze prices
    if (Array.isArray(websiteContent.metadata?.prices) && websiteContent.metadata.prices.length > 0) {
      if (websiteContent.metadata.prices.some((p: any) => p.price > 1000)) {
        signals.serviceScore += 10; // High prices often indicate services
      }
    }

    // Check for location indicators in content
    const locationKeywords = ['visit us', 'our location', 'directions', 'find us', 'our address'];
    const content = websiteContent.description?.toLowerCase() || '';
    if (locationKeywords.some(kw => content.includes(kw))) {
      signals.locationScore += 20;
    }

    return signals;
  }

  private intelligentlyClassifyBusiness(websiteContent: any, businessType: string): 'maps' | 'shopping' | 'local' | 'organic' {
    // First try explicit mapping
    const explicitType = this.mapBusinessTypeToSearchType(businessType, '');
    if (explicitType !== 'local') {
      return explicitType;
    }

    // Analyze business signals
    const signals = this.analyzeBusinessSignals(websiteContent);
    
    // Decision matrix
    if (signals.hasPhysicalLocation && signals.locationScore > 40) {
      if (signals.hasBooking || businessType.toLowerCase().includes('hotel')) {
        return 'maps';
      }
    }

    if (signals.hasEcommerce && signals.ecommerceScore > signals.serviceScore) {
      return 'shopping';
    }

    if (signals.hasPhysicalLocation && signals.serviceScore > signals.ecommerceScore) {
      return 'local';
    }

    if (!signals.hasPhysicalLocation && signals.serviceScore > 30) {
      return 'organic';
    }

    // Default based on strongest signal
    const scores = {
      maps: signals.locationScore + (signals.hasBooking ? 30 : 0),
      shopping: signals.ecommerceScore,
      local: signals.locationScore + signals.serviceScore,
      organic: signals.serviceScore + (signals.hasPhysicalLocation ? -20 : 20)
    };

    const bestMatch = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0][0] as 'maps' | 'shopping' | 'local' | 'organic';

    console.log('Business classification scores:', scores);
    return bestMatch;
  }

  async determineSearchStrategy(
    domain: string,
    businessType: string,
    websiteContent: EnhancedWebsiteContent
  ): Promise<AnalysisResult> {
    const prompt = `Analyze ${domain} as a ${businessType} business to find direct competitors.
    Website Content:
    ${JSON.stringify(websiteContent, null, 2)}
    
    Return ONLY a JSON object with EXACTLY this structure, no additional nesting:
    {
      "searchType": "maps" | "shopping" | "local" | "organic",
      "searchQuery": "optimized search query",
      "locationContext": {
        "location": {
          "address": "full address",
          "country": "country name",
          "region": "region/state",
          "city": "city name"
        },
        "radius": number
      },
      "businessAttributes": {
        "size": "small" | "medium" | "large",
        "focus": ["focus1", "focus2"],
        "businessCategory": "category",
        "priceRange": {
          "min": number,
          "max": number,
          "currency": "USD"
        },
        "targetMarket": ["market1", "market2"],
        "competitiveAdvantages": ["advantage1", "advantage2"]
      }
    }

    Guidelines for Competitor Search:
    1. For hotels, accommodations, and hospitality businesses:
      - Use searchType: "maps"
      - Include full location details
      - Set radius based on destination type (25 for local, 100 for tourist areas)
      - Query format: "best hotels near [location] similar to [business features]"
    
    2. For e-commerce and retail:
      - Use searchType: "shopping"
      - Focus on specific product categories and price ranges
      - Query format: "top [product category] stores like [domain]"
      - Include brand positioning terms
    
    3. For local services:
      - Use searchType: "local"
      - Include service area radius
      - Query format: "[business category] companies similar to [domain] near [location]"
      - Consider service specializations
    
    4. For online/digital services:
      - Use searchType: "organic"
      - Focus on market positioning and feature set
      - Query format: "best alternatives to [domain] for [main service]"
      - Include industry-specific terms

    The searchType MUST be one of: "maps", "shopping", "local", "organic"
    Generate a search query that will effectively find similar businesses in terms of:
    - Service/product offering
    - Price point and quality level
    - Target market segment
    - Geographic reach
    - Business model`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    let strategy = this.parseJsonResponse<AnalysisResult>(result.content.toString());
    
    if ('analysisResult' in strategy) {
      console.warn('Received nested response, extracting inner object');
      strategy = (strategy as any).analysisResult;
    }

    // Generate multiple search queries
    const searchQueries = this.enhanceCompetitorSearchQuery(strategy.searchQuery, websiteContent);
    strategy.searchQuery = searchQueries[0]; // Keep original interface compatibility
    strategy.alternativeQueries = searchQueries.slice(1); // Store additional queries
    
    // Ensure required fields exist with competitor-focused defaults
    if (!strategy.locationContext) {
      strategy.locationContext = {
        location: {
          address: websiteContent.metadata?.contactInfo?.address || '',
          country: websiteContent.metadata?.contactInfo?.country || 'United States',
          region: websiteContent.metadata?.contactInfo?.region || '',
          city: websiteContent.metadata?.contactInfo?.city || '',
          latitude: websiteContent.metadata?.contactInfo?.latitude || 0,
          longitude: websiteContent.metadata?.contactInfo?.longitude || 0,
          formattedAddress: websiteContent.metadata?.contactInfo?.formattedAddress || '',
          postalCode: websiteContent.metadata?.contactInfo?.postalCode || ''
        },
        radius: this.determineSearchRadius(strategy.searchType, businessType, websiteContent)
      };
    }

    if (!strategy.businessAttributes) {
      strategy.businessAttributes = {
        size: this.determineBusinessSize(websiteContent),
        focus: this.extractBusinessFocus(websiteContent),
        businessCategory: businessType,
        onlinePresence: this.determineOnlinePresence(websiteContent),
        serviceType: this.determineServiceType(websiteContent),
        uniqueFeatures: this.extractUniqueFeatures(websiteContent),
        priceRange: this.extractPriceRange(websiteContent),
        targetMarket: this.extractTargetMarket(websiteContent),
        competitiveAdvantages: this.extractCompetitiveAdvantages(websiteContent)
      };
    }

    return strategy;
  }

  private enhanceCompetitorSearchQuery(baseQuery: string, websiteContent: EnhancedWebsiteContent): string[] {
    const queries: string[] = [];
    
    // Base competitor query
    queries.push(baseQuery);

    // Product/service focused query
    if (websiteContent.categories?.length > 0) {
      queries.push(`top ${websiteContent.categories[0]} companies like ${websiteContent.url}`);
    }

    // Price range focused query
    if (websiteContent.metadata?.priceRange) {
      queries.push(`${websiteContent.metadata.priceRange} ${baseQuery}`);
    }

    // Location focused query
    if (websiteContent.metadata?.contactInfo?.city) {
      const location = [
        websiteContent.metadata.contactInfo.city,
        websiteContent.metadata.contactInfo.region,
        websiteContent.metadata.contactInfo.country
      ].filter(Boolean).join(', ');
      queries.push(`${baseQuery} in ${location}`);
    }

    // Market position focused query
    if (websiteContent.metadata?.marketPosition) {
      queries.push(`${websiteContent.metadata.marketPosition} alternatives to ${websiteContent.url}`);
    }

    // Feature focused query
    if (websiteContent.metadata?.uniqueFeatures?.length) {
      const features = websiteContent.metadata.uniqueFeatures.slice(0, 2).join(' ');
      queries.push(`companies with ${features} like ${websiteContent.url}`);
    }

    return queries.filter((q, i, arr) => arr.indexOf(q) === i); // Remove duplicates
  }

  private determineSearchRadius(searchType: string, businessType: string, websiteContent: EnhancedWebsiteContent): number {
    switch (searchType) {
      case 'maps':
        return businessType.toLowerCase().includes('hotel') ? 25 : 50;
      case 'local':
        return websiteContent.metadata?.serviceRadius || 50;
      case 'shopping':
        return websiteContent.metadata?.deliveryRadius || 100;
      default:
        return 50;
    }
  }

  private determineBusinessSize(websiteContent: EnhancedWebsiteContent): 'small' | 'medium' | 'large' {
    const indicators = {
      employees: websiteContent.metadata?.employeeCount || 0,
      products: websiteContent.products?.length || 0,
      services: websiteContent.services?.length || 0,
      locations: websiteContent.metadata?.locationCount || 1
    };
    
    if (indicators.employees > 200 || indicators.products > 1000 || indicators.locations > 10) {
      return 'large';
    } else if (indicators.employees > 50 || indicators.products > 100 || indicators.locations > 3) {
      return 'medium';
    }
    return 'small';
  }

  private extractBusinessFocus(websiteContent: EnhancedWebsiteContent): string[] {
    const focus: Set<string> = new Set();
    
    // Add main categories
    if (websiteContent.categories?.length > 0) {
      websiteContent.categories.slice(0, 3).forEach(category => focus.add(category));
    }
    
    // Add service types
    if (websiteContent.services?.length > 0) {
      websiteContent.services.slice(0, 3).forEach(service => 
        focus.add(service.category || service.type || '')
      );
    }
    
    return Array.from(focus);
  }

  private determineOnlinePresence(websiteContent: EnhancedWebsiteContent): 'weak' | 'moderate' | 'strong' {
    const indicators = {
      hasEcommerce: websiteContent.products?.length > 0,
      hasOnlineBooking: websiteContent.metadata?.hasOnlineBooking || false,
      socialMediaCount: websiteContent.metadata?.socialMedia?.length || 0,
      hasApp: websiteContent.metadata?.hasApp || false
    };
    
    if (indicators.hasEcommerce && indicators.hasApp && indicators.socialMediaCount > 3) {
      return 'strong';
    } else if (indicators.hasEcommerce || indicators.hasOnlineBooking || indicators.socialMediaCount > 1) {
      return 'moderate';
    }
    return 'weak';
  }

  private determineServiceType(websiteContent: EnhancedWebsiteContent): 'service' | 'product' | 'hybrid' {
    const hasPhysicalIndicators = websiteContent.metadata?.hasPhysicalLocation || 
                                 websiteContent.metadata?.contactInfo?.address;
    const hasDigitalIndicators = websiteContent.metadata?.hasOnlineServices || 
                                websiteContent.products?.some(p => p.type === 'digital');
    
    if (hasPhysicalIndicators && hasDigitalIndicators) return 'hybrid';
    if (hasDigitalIndicators) return 'product';
    return 'service';
  }

  private extractUniqueFeatures(websiteContent: EnhancedWebsiteContent): string[] {
    const features: Set<string> = new Set();
    
    // Add unique service features
    if (websiteContent.metadata?.uniqueFeatures) {
      websiteContent.metadata.uniqueFeatures.forEach(feature => features.add(feature));
    }
    
    // Add special capabilities
    if (websiteContent.metadata?.capabilities) {
      websiteContent.metadata.capabilities.forEach(capability => features.add(capability));
    }
    
    return Array.from(features);
  }

  private extractPriceRange(websiteContent: EnhancedWebsiteContent): { min: number; max: number; currency: string } {
    const prices = websiteContent.products?.map(p => p.price).filter((p): p is number => p !== undefined) || [];
    
    return {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      currency: websiteContent.metadata?.prices?.[0]?.currency || 'USD'
    };
  }

  private extractTargetMarket(websiteContent: EnhancedWebsiteContent): string[] {
    const markets: Set<string> = new Set();
    
    // Add target demographics
    if (websiteContent.metadata?.targetDemographics) {
      websiteContent.metadata.targetDemographics.forEach(demographic => markets.add(demographic));
    }
    
    // Add market segments
    if (websiteContent.metadata?.marketSegments) {
      websiteContent.metadata.marketSegments.forEach(segment => markets.add(segment));
    }
    
    return Array.from(markets);
  }

  private extractCompetitiveAdvantages(websiteContent: EnhancedWebsiteContent): string[] {
    const advantages: Set<string> = new Set();
    
    // Add unique selling propositions
    if (websiteContent.metadata?.usp) {
      websiteContent.metadata.usp.forEach(proposition => advantages.add(proposition));
    }
    
    // Add competitive strengths
    if (websiteContent.metadata?.strengths) {
      websiteContent.metadata.strengths.forEach(strength => advantages.add(strength));
    }
    
    return Array.from(advantages);
  }

  async suggestDataSources(strategy: AnalysisResult): Promise<string[]> {
    const prompt = `Based on search strategy:
    ${JSON.stringify(strategy, null, 2)}
    
    Return ONLY a JSON array of recommended data source URLs that would be valuable for competitor analysis.
    Example: ["yelp.com", "tripadvisor.com"]`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    return this.parseJsonResponse<string[]>(result.content.toString(), 'array');
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const costs: number[] = Array.from({ length: shorter.length + 1 }, () => 0);
    
    for (let i = 0; i <= longer.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          const prevCost = costs[j - 1] ?? 0;
          const currentCost = costs[j] ?? 0;
          let newValue = prevCost;
          if (longer[i - 1] !== shorter[j - 1]) {
            newValue = Math.min(prevCost, lastValue, currentCost) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[shorter.length] = lastValue;
      }
    }
    
    const finalCost = costs[shorter.length] ?? 0;
    return Math.round(100 * (1 - (finalCost / longer.length)));
  }
} 