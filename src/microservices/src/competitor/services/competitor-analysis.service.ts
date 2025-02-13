import { Injectable } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { AnalysisResult } from '../interfaces/analysis-result.interface';
import type { ProductMatch } from '../interfaces/product-match.interface';
import { JsonUtils } from '@shared/utils';

@Injectable()
export class CompetitorAnalysisService {
  constructor(private readonly modelManager: ModelManagerService) {}

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
    competitorDomain: string,
    businessContext: AnalysisResult,
  ): Promise<CompetitorInsight> {
    const prompt = `Analyze ${competitorDomain} as a potential competitor.

    Business Context:
    ${JSON.stringify(businessContext, null, 2)}

    Return ONLY a JSON object with this structure:
    {
      "domain": "${competitorDomain}",
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

    return this.parseJsonResponse<CompetitorInsight>(result.content.toString());
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
    websiteContent: any
  ): Promise<AnalysisResult> {
    const prompt = `Analyze ${domain} as a ${businessType} business.
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
        "businessCategory": "category"
      }
    }

    Guidelines:
    1. For hotels, accommodations, and hospitality businesses:
      - Use searchType: "maps"
      - Include full location details
      - Set radius to 25 for local area
    2. For e-commerce and retail:
      - Use searchType: "shopping"
      - Focus on product categories
    3. For local services:
      - Use searchType: "local"
      - Include service area radius
    4. For online/digital services:
      - Use searchType: "organic"
      - Focus on market positioning

    The searchType MUST be one of: "maps", "shopping", "local", "organic"`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    let strategy = this.parseJsonResponse<AnalysisResult>(result.content.toString());
    
    // Handle nested response if present
    if ('analysisResult' in strategy) {
      console.warn('Received nested response, extracting inner object');
      strategy = (strategy as any).analysisResult;
    }
    
    // Intelligently classify and validate search type
    const classifiedType = this.intelligentlyClassifyBusiness(websiteContent, businessType);
    if (strategy.searchType !== classifiedType) {
      console.log(`Overriding LLM search type "${strategy.searchType}" with classified type "${classifiedType}"`);
      strategy.searchType = classifiedType;
    }

    // Ensure required fields exist
    if (!strategy.locationContext) {
      strategy.locationContext = {
        location: {
          address: websiteContent.metadata?.contactInfo?.address || '',
          country: 'United States',
          region: '',
          city: '',
          latitude: 0,
          longitude: 0,
          formattedAddress: '',
          postalCode: ''
        },
        radius: strategy.searchType === 'maps' ? 25 : 50
      };
    }

    if (!strategy.businessAttributes) {
      strategy.businessAttributes = {
        size: 'small',
        focus: [],
        businessCategory: businessType,
        onlinePresence: 'moderate',
        serviceType: 'hybrid',
        uniqueFeatures: []
      };
    }

    return strategy;
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