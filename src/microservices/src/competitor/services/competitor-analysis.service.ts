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
import { Env } from '../../env';
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

interface SearchStrategy {
  searchType: 'maps' | 'shopping' | 'local' | 'organic';
  searchQuery: string;
  locationContext: {
    location: {
      address: string;
      country: string;
      region: string;
      city: string;
    };
    serviceArea: string;
    isLocationBased: boolean;
  };
  targetMarket: string[];
  businessModel: string;
  searchPriority: 'primary' | 'secondary' | 'tertiary';
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

      Website Content:
      Title: ${content.title}
      Description: ${content.description}
      Products: ${JSON.stringify(content.products?.slice(0, 10) || [], null, 2)}
      Services: ${JSON.stringify(content.services?.slice(0, 10) || [], null, 2)}
      Main Content: ${content.mainContent?.slice(0, 1000) || ''}

      Business Context:
      ${JSON.stringify(strategy, null, 2)}

      SERP Metadata:
      ${serpData ? JSON.stringify(serpData, null, 2) : 'No SERP data available'}

      Extract the business name from the website title, content, or metadata. Look for company names, brand names, or business titles.

      Return ONLY a JSON object with this structure:
      {
        "domain": "${domain}",
        "businessName": "Extracted business/company name from website",
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
            "url": "Product URL (full URL to specific product page)",
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
        ],
        "monitoringData": {
          "productUrls": [
            {
              "id": "unique-product-id",
              "name": "Product Name",
              "url": "Full URL to product page for monitoring",
              "price": number or null,
              "currency": "USD",
              "category": "product category"
            }
          ],
          "lastUpdated": "current ISO date",
          "extractionMethod": "perplexity"
        }
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

  private async determineSearchStrategy(
    domain: string,
    businessType: string,
    websiteContent: WebsiteContent,
  ): Promise<SearchStrategy> {
    const prompt = `Analyze this business to determine the optimal competitor search strategy.

    Business Domain: ${domain}
    Business Type: ${businessType}
    Website Content Summary:
    ${JSON.stringify(websiteContent, null, 2)}
    
    Based on the business type and content, determine:
    1. Best search type for finding competitors
    2. Optimal search query phrasing
    3. Geographic context if applicable
    4. Target market and customer base
    
    Return ONLY a JSON object with this structure:
    {
      "searchType": "maps" | "shopping" | "local" | "organic",
      "searchQuery": "optimized search query for finding competitors",
      "locationContext": {
        "location": {
          "address": "full address if found",
          "country": "country name",
          "region": "region/state",
          "city": "city name"
        },
        "serviceArea": "geographic area served",
        "isLocationBased": true | false
      },
      "targetMarket": ["primary customer segments"],
      "businessModel": "how the business operates and makes money",
      "searchPriority": "primary" | "secondary" | "tertiary"
    }

    Guidelines:
    - Use "maps" for location-based services (restaurants, hotels, local services)
    - Use "shopping" for product-focused businesses
    - Use "local" for service businesses with geographic focus
    - Use "organic" for software, digital services, or broad market businesses
    - Extract location data from content when available
    - Consider business model and target market for query optimization`;

    try {
      const result = await this.modelManager.withBatchProcessing(
        async (llm) => llm.invoke(prompt),
        prompt,
      );

      const resultText = JsonUtils.safeStringify(result.content);
      const jsonStr = JsonUtils.extractJSON(resultText, 'object');
      const parsed = JSON.parse(jsonStr) as {
        searchType?: string;
        searchQuery?: string;
        locationContext?: {
          location?: {
            address?: string;
            country?: string;
            region?: string;
            city?: string;
          };
          serviceArea?: string;
          isLocationBased?: boolean;
        };
        targetMarket?: string[];
        businessModel?: string;
        searchPriority?: string;
      };

      return {
        searchType: ['maps', 'shopping', 'local', 'organic'].includes(
          parsed.searchType || '',
        )
          ? (parsed.searchType as 'maps' | 'shopping' | 'local' | 'organic')
          : 'local',
        searchQuery:
          typeof parsed.searchQuery === 'string'
            ? parsed.searchQuery
            : `${businessType} competitors`,
        locationContext: {
          location: {
            address: parsed.locationContext?.location?.address || '',
            country: parsed.locationContext?.location?.country || '',
            region: parsed.locationContext?.location?.region || '',
            city: parsed.locationContext?.location?.city || '',
          },
          serviceArea: parsed.locationContext?.serviceArea || '',
          isLocationBased: parsed.locationContext?.isLocationBased || false,
        },
        targetMarket: Array.isArray(parsed.targetMarket)
          ? parsed.targetMarket
          : [],
        businessModel:
          typeof parsed.businessModel === 'string' ? parsed.businessModel : '',
        searchPriority: ['primary', 'secondary', 'tertiary'].includes(
          parsed.searchPriority || '',
        )
          ? (parsed.searchPriority as 'primary' | 'secondary' | 'tertiary')
          : 'primary',
      };
    } catch (error) {
      console.error('Failed to determine search strategy:', error);

      // Intelligent fallback based on business type
      const fallbackSearchType = this.getFallbackSearchType(
        businessType,
        websiteContent,
      );

      return {
        searchType: fallbackSearchType,
        searchQuery: `${businessType} competitors near ${domain}`,
        locationContext: {
          location: { address: '', country: '', region: '', city: '' },
          serviceArea: '',
          isLocationBased:
            fallbackSearchType === 'maps' || fallbackSearchType === 'local',
        },
        targetMarket: [],
        businessModel: '',
        searchPriority: 'primary',
      };
    }
  }

  private getFallbackSearchType(
    businessType: string,
    websiteContent: WebsiteContent,
  ): 'maps' | 'shopping' | 'local' | 'organic' {
    const content = (
      websiteContent.title +
      ' ' +
      websiteContent.description +
      ' ' +
      websiteContent.mainContent
    ).toLowerCase();

    // Location-based services
    if (
      businessType === 'hospitality' ||
      businessType === 'restaurant' ||
      content.includes('location') ||
      content.includes('address') ||
      content.includes('visit') ||
      content.includes('near')
    ) {
      return 'maps';
    }

    // Product-focused businesses
    if (
      businessType === 'ecommerce' ||
      businessType === 'retail' ||
      content.includes('shop') ||
      content.includes('buy') ||
      content.includes('product') ||
      content.includes('store')
    ) {
      return 'shopping';
    }

    // Service businesses with geographic focus
    if (
      businessType === 'professional_service' ||
      businessType === 'healthcare' ||
      businessType === 'construction' ||
      businessType === 'automotive'
    ) {
      return 'local';
    }

    // Default to organic for digital/software businesses
    return 'organic';
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
