import { Injectable } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type {
  CompetitorInsight,
  AnalysisResult,
  ProductMatch,
  WebsiteContent,
  EnhancedWebsiteContent,
  PriceData,
} from '@shared/types';
import { JsonUtils } from '@shared/utils';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/env';
import type {
  ValueserpResponse,
  SerpResultItem,
} from '../interfaces/valueserp-response.interface';

// Define custom type for SERP API response with price property
interface SerpResultItemWithPrice extends SerpResultItem {
  price?: string;
}

// Define a specific type for serialized response data
interface SerializedSerpData {
  rating?: number | null;
  reviewCount?: number | null;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  } | null;
}

@Injectable()
export class CompetitorAnalysisService {
  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  private parseJsonResponse<T>(
    content: string,
    type: 'object' | 'array' = 'object',
  ): T {
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
    serpData?: SerializedSerpData,
    additionalContent?: WebsiteContent,
  ): Promise<CompetitorInsight> {
    try {
      console.log(`Analyzing competitor ${domain}`);

      // Discover website content
      let content: WebsiteContent =
        await this.websiteDiscovery.discoverWebsiteContent(domain);

      // Merge with additional content if provided
      if (additionalContent) {
        const mergedContent: WebsiteContent = {
          ...content,
          products: [
            ...(content.products ?? []),
            ...(additionalContent.products ?? []),
          ],
          services: [
            ...(content.services ?? []),
            ...(additionalContent.services ?? []),
          ],
          categories: [
            ...new Set([
              ...(content.categories ?? []),
              ...(additionalContent.categories ?? []),
            ]),
          ],
          keywords: [
            ...new Set([
              ...(content.keywords ?? []),
              ...(additionalContent.keywords ?? []),
            ]),
          ],
          mainContent: `${content.mainContent ?? ''}\n${additionalContent.mainContent ?? ''}`,
          metadata: {
            ...(content.metadata ?? {}),
            ...(additionalContent.metadata ?? {}),
            contactInfo: {
              ...(content.metadata?.contactInfo ?? {}),
              ...(additionalContent.metadata?.contactInfo ?? {}),
            },
            socialMedia: {
              ...(content.metadata?.socialMedia ?? {}),
              ...(additionalContent.metadata?.socialMedia ?? {}),
            },
            structuredData: [
              ...(content.metadata?.structuredData ?? []),
              ...(additionalContent.metadata?.structuredData ?? []),
            ],
            prices: [
              ...(content.metadata?.prices ?? []),
              ...(additionalContent.metadata?.prices ?? []),
            ],
          },
        };
        content = mergedContent;
      }

      // Fallback: if pricing info is missing, perform a SERP search for pricing data
      if (!content.metadata?.prices || content.metadata.prices.length === 0) {
        console.log(
          `No pricing info found for ${domain}, performing SERP search for pricing data`,
        );
        const serpPricing = await this.searchForPricing(domain, [
          ...content.products,
          ...content.services,
        ]);
        // if (!serpPricing.length) {
        //   serpPricing = await this.searchForPricing(domain, 'organic');
        // }
        content.metadata = { ...content.metadata, prices: serpPricing };
      }

      // Call the new integration function to match offerings to prices
      await this.integrateOfferingPriceMatches(content);

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

      const result = await this.modelManager.withBatchProcessing(
        async (llm) => {
          return await llm.invoke(prompt);
        },
        prompt,
      );

      const insight = this.parseJsonResponse<CompetitorInsight>(
        JsonUtils.safeStringify(result.content),
      );

      // Enhance insight with SERP metadata if available
      if (serpData) {
        if (serpData.rating || serpData.reviewCount) {
          insight.listingPlatforms.push({
            platform: 'Google',
            url: `https://www.google.com/search?q=${encodeURIComponent(domain)}`,
            rating: serpData.rating ?? null,
            reviewCount: serpData.reviewCount ?? null,
            priceRange: serpData.priceRange ?? null,
          });
        }
      }

      return insight;
    } catch (error) {
      console.error(`Failed to analyze competitor ${domain}:`, error);
      throw error;
    }
  }

  private async searchForPricing(
    domain: string,
    offerings?: Array<{ name: string }>,
  ): Promise<PriceData[]> {
    const queries = this.generatePricingQueries(domain, offerings);
    const results: PriceData[] = [];
    const apiKey = this.configService.get<string>('VALUESERP_API_KEY');

    for (const query of queries) {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        location: 'United States',
        google_domain: 'google.com',
        gl: 'us',
        hl: 'en',
        page: '1',
      });
      const url = `https://api.valueserp.com/search?${params.toString()}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `ValueSERP Error [${response.status}]:`,
            errorBody.slice(0, 200),
          );
          continue;
        }
        const data = (await response.json()) as ValueserpResponse;
        const priceData = this.extractPriceDataFromSerpResults(data);
        results.push(...priceData);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`Request timed out for query: "${query}"`);
        } else {
          console.error(`Failed to fetch for "${query}":`, error.message);
        }
      }
    }
    return results;
  }

  private extractPriceDataFromSerpResults(
    data: ValueserpResponse,
  ): PriceData[] {
    const results: PriceData[] = [];

    // Handle shopping results
    if (Array.isArray(data.shopping_results)) {
      for (const item of data.shopping_results) {
        // Type assertion to use the extended interface with price
        const itemWithPrice = item as SerpResultItemWithPrice;
        if (itemWithPrice.price) {
          const price = parseFloat(
            String(itemWithPrice.price).replace(/[^0-9.]/g, ''),
          );

          if (!isNaN(price)) {
            results.push({
              price,
              currency:
                /[A-Z]{3}/.exec(String(itemWithPrice.price))?.[0] ?? 'USD',
              source: item.link ?? '',
            });
          }
        }
      }
    }

    // Fallback to organic results if no shopping results
    if (results.length === 0 && Array.isArray(data.organic_results)) {
      for (const item of data.organic_results) {
        // Type assertion to use the extended interface with price
        const itemWithPrice = item as SerpResultItemWithPrice;
        const priceStr =
          itemWithPrice.price ??
          (item.snippet
            ? /\$\d+(?:\.\d{2})?/.exec(item.snippet)?.[0]
            : undefined);

        if (priceStr) {
          const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
          if (!isNaN(price)) {
            results.push({
              price,
              currency: /[A-Z]{3}/.exec(priceStr)?.[0] ?? 'USD',
              source: item.link ?? '',
            });
          }
        }
      }
    }

    // Handle empty results case
    if (results.length === 0 && data.search_information?.total_results === 0) {
      console.warn(
        'SERP API returned 0 results for query:',
        data.search_parameters?.q,
      );
    }

    return results;
  }

  private generatePricingQueries(
    domain: string,
    offerings?: Array<{ name: string }>,
  ): string[] {
    const queries = new Set<string>();
    if (offerings && offerings.length > 0) {
      offerings.forEach((offering) => {
        queries.add(`${domain} ${offering.name} price`);
        queries.add(`${offering.name} pricing`);
      });
    }
    queries.add(`${domain} pricing`);
    queries.add(`${domain} cost`);
    queries.add(`${domain} rates`);
    queries.add(`how much does ${domain} cost`);
    queries.add(`${domain} price comparison`);
    queries.add(`${domain} alternatives price`);
    queries.add(`${domain} vs * price`);
    queries.add(`${domain} monthly fee`);
    queries.add(`${domain} annual subscription`);

    return Array.from(queries);
  }

  async analyzeProductMatches(
    ourProducts: Array<{ name: string; url: string; price: number }>,
    competitorProducts: Array<{
      name: string;
      url: string;
      price: number | null;
    }>,
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

    return this.parseJsonResponse<ProductMatch[]>(
      JsonUtils.safeStringify(result.content),
      'array',
    );
  }

  private mapBusinessTypeToSearchType(
    businessType: string,
    searchType: string,
  ): 'maps' | 'shopping' | 'local' | 'organic' {
    // First check if the provided searchType is already valid
    if (['maps', 'shopping', 'local', 'organic'].includes(searchType)) {
      return searchType as 'maps' | 'shopping' | 'local' | 'organic';
    }

    // Map common business types to search types
    const businessTypeMap: Record<
      string,
      'maps' | 'shopping' | 'local' | 'organic'
    > = {
      hotel: 'maps',
      lodge: 'maps',
      resort: 'maps',
      accommodation: 'maps',
      restaurant: 'maps',
      cafe: 'maps',
      store: 'shopping',
      shop: 'shopping',
      retail: 'shopping',
      ecommerce: 'shopping',
      service: 'local',
      local: 'local',
      business: 'local',
      online: 'organic',
      digital: 'organic',
      saas: 'organic',
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

  private analyzeBusinessSignals(websiteContent: EnhancedWebsiteContent): {
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
      serviceScore: 0,
    };

    // Check metadata and structured data
    if (websiteContent.metadata?.contactInfo?.address) {
      signals.hasPhysicalLocation = true;
      signals.locationScore += 30;
    }

    // Analyze products
    if (
      Array.isArray(websiteContent.products) &&
      websiteContent.products.length > 0
    ) {
      signals.hasEcommerce = true;
      signals.ecommerceScore += Math.min(
        websiteContent.products.length * 10,
        40,
      );

      // Check for physical products vs digital
      const digitalKeywords = [
        'download',
        'digital',
        'software',
        'subscription',
        'license',
      ];
      const physicalKeywords = [
        'shipping',
        'delivery',
        'weight',
        'size',
        'dimensions',
      ];

      let digitalCount = 0;
      let physicalCount = 0;

      websiteContent.products.forEach((product) => {
        const description = (
          (product.description as string) || ''
        ).toLowerCase();
        if (digitalKeywords.some((kw) => description.includes(kw))) {
          digitalCount++;
        }
        if (physicalKeywords.some((kw) => description.includes(kw))) {
          physicalCount++;
        }
      });

      if (digitalCount > physicalCount) {
        signals.ecommerceScore += 20;
      }
    }

    // Analyze services
    if (
      Array.isArray(websiteContent.services) &&
      websiteContent.services.length > 0
    ) {
      signals.hasServices = true;
      signals.serviceScore += Math.min(websiteContent.services.length * 10, 40);

      // Check for booking/reservation related services
      const bookingKeywords = [
        'booking',
        'reservation',
        'appointment',
        'schedule',
        'book now',
      ];
      websiteContent.services.forEach((service) => {
        const description = (
          (service.description as string) || ''
        ).toLowerCase();
        if (bookingKeywords.some((kw) => description.includes(kw))) {
          signals.hasBooking = true;
          signals.serviceScore += 10;
        }
      });
    }

    // Analyze prices
    if (
      Array.isArray(websiteContent.metadata?.prices) &&
      websiteContent.metadata.prices.length > 0
    ) {
      if (websiteContent.metadata.prices.some((p) => p.price > 1000)) {
        signals.serviceScore += 10; // High prices often indicate services
      }
    }

    // Check for location indicators in content
    const locationKeywords = [
      'visit us',
      'our location',
      'directions',
      'find us',
      'our address',
    ];
    const content = websiteContent.description?.toLowerCase() || '';
    if (locationKeywords.some((kw) => content.includes(kw))) {
      signals.locationScore += 20;
    }

    return signals;
  }

  private intelligentlyClassifyBusiness(
    websiteContent: EnhancedWebsiteContent,
    businessType: string,
  ): 'maps' | 'shopping' | 'local' | 'organic' {
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

    if (
      signals.hasPhysicalLocation &&
      signals.serviceScore > signals.ecommerceScore
    ) {
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
      organic: signals.serviceScore + (signals.hasPhysicalLocation ? -20 : 20),
    };

    const bestMatch = Object.entries(scores).sort(
      ([, a], [, b]) => b - a,
    )[0][0] as 'maps' | 'shopping' | 'local' | 'organic';

    console.log('Business classification scores:', scores);
    return bestMatch;
  }

  async determineSearchStrategy(
    domain: string,
    businessType: string,
    websiteContent: EnhancedWebsiteContent,
  ): Promise<AnalysisResult> {
    console.log(`Determining search strategy for ${domain}...`);

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

    let strategy = this.parseJsonResponse<AnalysisResult>(
      JsonUtils.safeStringify(result.content),
    );

    if ('analysisResult' in strategy) {
      console.warn('Received nested response, extracting inner object');
      const typedStrategy = strategy as { analysisResult: AnalysisResult };
      strategy = typedStrategy.analysisResult;
    }

    // Generate multiple search queries
    const searchQueries = this.enhanceCompetitorSearchQuery(
      strategy.searchQuery,
      websiteContent,
    );
    strategy.searchQuery = searchQueries[0]; // Keep original interface compatibility

    // Ensure required fields exist with competitor-focused defaults
    if (!strategy.locationContext) {
      strategy.locationContext = {
        location: {
          address: websiteContent.metadata?.contactInfo?.address ?? '',
          country:
            websiteContent.metadata?.contactInfo?.country ?? 'United States',
          region: websiteContent.metadata?.contactInfo?.region ?? '',
          city: websiteContent.metadata?.contactInfo?.city ?? '',
          latitude: websiteContent.metadata?.contactInfo?.latitude ?? 0,
          longitude: websiteContent.metadata?.contactInfo?.longitude ?? 0,
          formattedAddress:
            websiteContent.metadata?.contactInfo?.formattedAddress ?? '',
          postalCode: websiteContent.metadata?.contactInfo?.postalCode ?? '',
        },
        radius: this.determineSearchRadius(
          strategy.searchType,
          businessType,
          websiteContent,
        ),
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
        competitiveAdvantages:
          this.extractCompetitiveAdvantages(websiteContent),
      };
    }

    return strategy;
  }

  private enhanceCompetitorSearchQuery(
    baseQuery: string,
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const queries: string[] = [];

    // Base competitor query
    queries.push(baseQuery);

    // Product/service focused query
    if (websiteContent.categories?.length > 0) {
      queries.push(
        `top ${websiteContent.categories[0]} companies like ${websiteContent.url}`,
      );
    }

    // Price range focused query
    if (websiteContent.metadata?.priceRange) {
      // Format the price range object into a meaningful string
      const priceRangeStr = `price range ${websiteContent.metadata.priceRange.currency}${websiteContent.metadata.priceRange.min}-${websiteContent.metadata.priceRange.max}`;
      queries.push(`${priceRangeStr} ${baseQuery}`);
    }

    // Location focused query
    if (websiteContent.metadata?.contactInfo?.city) {
      const location = [
        websiteContent.metadata.contactInfo.city,
        websiteContent.metadata.contactInfo.region,
        websiteContent.metadata.contactInfo.country,
      ]
        .filter(Boolean)
        .join(', ');
      queries.push(`${baseQuery} in ${location}`);
    }

    // Market position focused query
    if (websiteContent.metadata?.marketPosition) {
      queries.push(
        `${websiteContent.metadata.marketPosition} alternatives to ${websiteContent.url}`,
      );
    }

    // Feature focused query
    if (websiteContent.metadata?.uniqueFeatures?.length) {
      const features = websiteContent.metadata.uniqueFeatures
        .slice(0, 2)
        .join(' ');
      queries.push(`companies with ${features} like ${websiteContent.url}`);
    }

    return queries.filter((q, i, arr) => arr.indexOf(q) === i); // Remove duplicates
  }

  private determineSearchRadius(
    searchType: string,
    businessType: string,
    websiteContent: EnhancedWebsiteContent,
  ): number {
    switch (searchType) {
      case 'maps':
        return businessType.toLowerCase().includes('hotel') ? 25 : 50;
      case 'local':
        return websiteContent.metadata?.serviceRadius ?? 50;
      case 'shopping':
        return websiteContent.metadata?.deliveryRadius ?? 100;
      default:
        return 50;
    }
  }

  private determineBusinessSize(
    websiteContent: EnhancedWebsiteContent,
  ): 'small' | 'medium' | 'large' {
    const indicators = {
      employees: websiteContent.metadata?.employeeCount ?? 0,
      products: websiteContent.products?.length ?? 0,
      services: websiteContent.services?.length ?? 0,
      locations: websiteContent.metadata?.locationCount ?? 1,
    };

    if (
      indicators.employees > 200 ||
      indicators.products > 1000 ||
      indicators.locations > 10
    ) {
      return 'large';
    } else if (
      indicators.employees > 50 ||
      indicators.products > 100 ||
      indicators.locations > 3
    ) {
      return 'medium';
    }
    return 'small';
  }

  private extractBusinessFocus(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const focus = new Set<string>();

    // Add main categories
    if (websiteContent.categories?.length > 0) {
      websiteContent.categories
        .slice(0, 3)
        .forEach((category) => focus.add(category));
    }

    // Add service types
    if (websiteContent.services?.length > 0) {
      websiteContent.services.slice(0, 3).forEach((service) =>
        // Only use service.category, ensure it's a string before adding
        focus.add(
          typeof service?.category === 'string'
            ? service.category
            : 'General Service',
        ),
      );
    }

    return Array.from(focus);
  }

  private determineOnlinePresence(
    websiteContent: EnhancedWebsiteContent,
  ): 'weak' | 'moderate' | 'strong' {
    const indicators = {
      hasSocialMedia:
        Object.keys(websiteContent.metadata?.socialMedia ?? {}).length > 0,
      hasEcommerce: websiteContent.products?.length > 0,
      hasOnlineBooking: websiteContent.metadata?.hasOnlineBooking ?? false,
      hasApp: websiteContent.metadata?.hasApp ?? false,
      socialMediaCount: Object.keys(websiteContent.metadata?.socialMedia ?? {})
        .length,
    };

    const score =
      (indicators.hasSocialMedia ? 1 : 0) +
      (indicators.hasEcommerce ? 1 : 0) +
      (indicators.hasOnlineBooking ? 1 : 0) +
      (indicators.hasApp ? 1 : 0) +
      (Number(indicators.socialMediaCount) > 3 ? 1 : 0);

    if (score >= 7) return 'strong';
    if (score >= 4) return 'moderate';
    return 'weak';
  }

  private determineServiceType(
    websiteContent: EnhancedWebsiteContent,
  ): 'service' | 'product' | 'hybrid' {
    const hasPhysicalIndicators =
      (websiteContent.metadata?.hasPhysicalLocation ?? false) ||
      (websiteContent.products?.some((p) => p.type === 'physical') ?? false);
    const hasServiceIndicators =
      (websiteContent.metadata?.hasOnlineServices ?? false) ||
      (websiteContent.services?.length ?? 0) > 0;
    const hasProductIndicators = (websiteContent.products?.length ?? 0) > 0;

    if (hasPhysicalIndicators && hasServiceIndicators && hasProductIndicators)
      return 'hybrid';
    if (hasServiceIndicators) return 'service';
    if (hasProductIndicators) return 'product';
    return 'service';
  }

  private extractUniqueFeatures(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const focus = new Set<string>();

    // Process Products
    (websiteContent.products ?? []).forEach((product) => {
      if (product && typeof product.name === 'string') {
        focus.add(product.category ?? 'General Product');
        if (product.type === 'physical') {
          focus.add('Physical Products');
        } else if (product.type === 'digital') {
          focus.add('Digital Products');
        } else if (product.type === 'service') {
          focus.add('Service Products'); // If products can also be services
        }
      }
    });

    // Process Services
    (websiteContent.services ?? []).forEach((service) => {
      if (service && typeof service.name === 'string') {
        focus.add(service.category ?? 'General Service');
        // No 'type' property expected for services based on interface
      }
    });

    // Add focus based on metadata if needed
    // Example: if (websiteContent.metadata?.specialties) { ... }

    return Array.from(focus);
  }

  private extractPriceRange(websiteContent: EnhancedWebsiteContent): {
    min: number;
    max: number;
    currency: string;
  } {
    const prices =
      websiteContent.products
        ?.map((p) => p.price)
        .filter((p): p is number => p !== undefined) ?? [];

    return {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      currency: websiteContent.metadata?.prices?.[0]?.currency ?? 'USD',
    };
  }

  private extractTargetMarket(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const markets = new Set<string>();
    if (websiteContent.metadata?.targetDemographics) {
      websiteContent.metadata.targetDemographics.forEach((demo) =>
        markets.add(demo),
      );
    }
    // Add logic to infer from mainContent if needed
    return Array.from(markets);
  }

  private extractCompetitiveAdvantages(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const advantages = new Set<string>();
    if (websiteContent.metadata?.usp) {
      websiteContent.metadata.usp.forEach((u) => advantages.add(u));
    }
    if (websiteContent.metadata?.strengths) {
      websiteContent.metadata.strengths.forEach((s) => advantages.add(s));
    }
    // Infer from content if needed
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

    return this.parseJsonResponse<string[]>(
      JsonUtils.safeStringify(result.content),
      'array',
    );
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
    return Math.round(100 * (1 - finalCost / longer.length));
  }

  private getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      console.warn('Failed to parse URL:', url);
      return url.replace(/^www\./, '');
    }
  }

  // LLM-based matching using product and service offerings
  async matchPricesToOfferings(
    offerings: Array<{ name: string; description?: string; url?: string }>,
    prices: PriceData[],
  ): Promise<{ offering: string; matchedPrice: PriceData }[]> {
    const prompt = `Given the following product and service offerings and competitor pricing data, match each offering to the most relevant price entry.
Offerings: ${JSON.stringify(offerings, null, 2)}
Pricing Data: ${JSON.stringify(prices, null, 2)}
Return a JSON array with objects of the form:
{
  "offering": "Offering Name",
  "matchedPrice": {
    "price": number,
    "currency": "USD",
    "source": "URL"
  }
}
Only return valid JSON.`;
    const result = await this.modelManager.withBatchProcessing(
      async (llm) => llm.invoke(prompt),
      prompt,
    );
    return this.parseJsonResponse<
      { offering: string; matchedPrice: PriceData }[]
    >(JsonUtils.safeStringify(result.content), 'array');
  }

  // Alternatively, a heuristic approach using string similarity between offering names and price source URLs
  private heuristicMatchOfferingsToPrices(
    offerings: Array<{ name: string }>,
    prices: PriceData[],
  ): { offering: string; matchedPrice: PriceData; score: number }[] {
    return offerings
      .map((offering) => {
        let bestScore = 0;
        let bestPrice: PriceData;
        for (const priceData of prices) {
          const score = this.calculateStringSimilarity(
            offering.name.toLowerCase(),
            priceData.source?.toLowerCase() ?? '',
          );
          if (score > bestScore) {
            bestScore = score;
            bestPrice = priceData;
          }
        }
        return {
          offering: offering.name,
          matchedPrice: bestPrice!,
          score: bestScore,
        };
      })
      .filter((result) => result.score > 50);
  }

  private async integrateOfferingPriceMatches(
    websiteContent: WebsiteContent,
  ): Promise<void> {
    const offerings = [
      ...websiteContent.products.map((product) => ({
        name: product.name,
        url: product.url,
        description: product.description ?? '',
      })),
      ...websiteContent.services.map((service) => ({
        name: service.name,
        url: service.url,
        description: service.description ?? '',
      })),
    ];
    if (offerings.length && websiteContent.metadata?.prices?.length) {
      const llmMatches = await this.matchPricesToOfferings(
        offerings.map((offering) => ({
          ...offering,
          url: offering.url ?? undefined, // Convert null to undefined
        })),
        websiteContent.metadata.prices,
      );
      const heuristicMatches = this.heuristicMatchOfferingsToPrices(
        offerings,
        websiteContent.metadata.prices,
      );
      console.log('LLM-Based Offering Matches:', llmMatches);
      console.log('Heuristic Offering Matches:', heuristicMatches);
    }
  }
}
