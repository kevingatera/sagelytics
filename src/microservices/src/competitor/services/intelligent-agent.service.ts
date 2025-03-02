import { Injectable, Logger, Inject } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { BusinessContext } from '../interfaces/business-context.interface';

// Define an Offering interface to improve code readability
interface Offering {
  type: string;
  category: string;
  features: string[];
  name: string;
  pricing: {
    value: number | null;
    currency: string;
    unit: string;
  };
  sourceUrl: string;
}

// Define a UserProduct interface for type safety
interface UserProduct {
  name: string;
  description: string;
  price: number;
  currency: string;
}

// Define interfaces for the business type detection
interface BusinessTypeInfo {
  businessType: string;
  specificType: string;
  extractionStrategy: {
    offeringNomenclature: string;
  };
}

// Define interfaces for the tools service
interface ToolsAnalysis {
  detectBusinessType(text: string, domain: string): Promise<BusinessTypeInfo>;
  extractPricesForBusinessType(
    html: string,
    businessType: string,
  ): Array<{
    value: number;
    currency: string;
    unit: string;
    context: string;
    source: string;
  }>;
  categorizeOffering(
    text: string,
    context: {
      businessType: string;
      offeringNomenclature: string;
    },
  ): Promise<Offering>;
  extractFeatures(text: string): Promise<string[]>;
}

interface ToolsNavigation {
  findRelevantPages(domain: string, html: string): Promise<string[]>;
  checkRobotsRules(url: string): Promise<boolean>;
}

interface ToolsWeb {
  fetchContent(url: string): Promise<string>;
  extractText(html: string): string;
  extractMetaTags(html: string): {
    description?: string;
    [key: string]: string | undefined;
  };
  extractStructuredData(html: string): Record<string, unknown>[];
}

interface ToolsSearch {
  serpSearch(
    query: string,
    type: 'shopping' | 'maps' | 'local' | 'organic',
  ): Promise<Array<{ url: string }>>;
}

@Injectable()
export class IntelligentAgentService {
  private readonly logger = new Logger(IntelligentAgentService.name);

  constructor(
    private readonly modelManager: ModelManagerService,
    @Inject('AGENT_TOOLS')
    private readonly tools: {
      analysis: ToolsAnalysis;
      navigation: ToolsNavigation;
      web: ToolsWeb;
      search: ToolsSearch;
    },
  ) {}

  async analyzeCompetitor(
    domain: string,
    businessContext?: BusinessContext,
    serpMetadata?: {
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    },
  ): Promise<CompetitorInsight> {
    console.log(`Starting analysis for domain: ${domain}`);

    // Ensure domain has the correct format
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }

    // Log business context if provided
    if (businessContext) {
      console.log(
        `Business context provided: ${JSON.stringify(businessContext)}`,
      );
    }

    try {
      // First, fetch and analyze the website content
      const html = await this.tools.web.fetchContent(domain);
      const websiteText = this.tools.web.extractText(html);
      const metaTags = this.tools.web.extractMetaTags(html);
      const structuredData = this.tools.web.extractStructuredData(html);

      // Detect business type
      console.log(`Detecting business type for ${domain}`);
      const businessTypeInfo = await this.tools.analysis.detectBusinessType(
        websiteText,
        domain,
      );

      // If business context provided, use that business type instead
      if (businessContext?.businessType) {
        businessTypeInfo.businessType = businessContext.businessType;
        console.log(
          `Using provided business type: ${businessTypeInfo.businessType}`,
        );
      }

      console.log(
        `Detected business type: ${businessTypeInfo.businessType}, ${businessTypeInfo.specificType}`,
      );

      // Extract pricing using business-specific approach
      const pricing = this.tools.analysis.extractPricesForBusinessType(
        html,
        businessTypeInfo.businessType,
      );
      console.log(`Extracted ${pricing.length} price points for ${domain}`);

      // Use SERP metadata for additional pricing if available
      if (serpMetadata?.priceRange) {
        console.log(
          `Using SERP pricing data: ${JSON.stringify(serpMetadata.priceRange)}`,
        );
        if (pricing.length === 0) {
          pricing.push({
            value:
              (serpMetadata.priceRange.min + serpMetadata.priceRange.max) / 2,
            currency: serpMetadata.priceRange.currency,
            unit: 'per item',
            context: 'From search results',
            source: 'serp',
          });
        }
      }

      // Find relevant pages to explore
      const relevantPages = await this.tools.navigation.findRelevantPages(
        domain,
        html,
      );
      console.log(`Found ${relevantPages.length} relevant pages to explore`);

      // Extract and analyze offerings from all relevant pages
      const offerings: Offering[] = [];
      const visitedUrls = new Set([domain]);

      for (const pageUrl of relevantPages) {
        // Avoid visiting the same URL twice
        if (visitedUrls.has(pageUrl)) continue;
        visitedUrls.add(pageUrl);

        // Check robots.txt rules
        const isAllowed = await this.tools.navigation.checkRobotsRules(pageUrl);
        if (!isAllowed) {
          console.log(`Skipping disallowed URL: ${pageUrl}`);
          continue;
        }

        try {
          console.log(`Analyzing page: ${pageUrl}`);
          const pageHtml = await this.tools.web.fetchContent(pageUrl);
          const pageText = this.tools.web.extractText(pageHtml);

          // Split text into chunks for analysis
          const chunks = this.splitTextIntoChunks(pageText, 500);

          for (const chunk of chunks) {
            // Skip very short chunks
            if (chunk.length < 50) continue;

            // Categorize the offering with business context
            const categorized = await this.tools.analysis.categorizeOffering(
              chunk,
              {
                businessType: businessTypeInfo.businessType,
                offeringNomenclature:
                  businessTypeInfo.extractionStrategy.offeringNomenclature,
              },
            );

            // Add to offerings if it has a name or category
            if (
              categorized.name !== 'unknown' ||
              categorized.category !== 'unknown'
            ) {
              offerings.push({
                ...categorized,
                sourceUrl: pageUrl,
              });
            }
          }
        } catch (error) {
          console.error(`Error analyzing page ${pageUrl}:`, error);
        }
      }

      console.log(`Extracted ${offerings.length} offerings from ${domain}`);

      // Merge similar offerings and deduplicate
      const uniqueOfferings = this.deduplicateOfferings(offerings);
      console.log(
        `After deduplication: ${uniqueOfferings.length} unique offerings`,
      );

      // Format offerings into CompetitorInsight products format
      const products = uniqueOfferings.map((offering) => {
        const matchedProduct = businessContext?.userProducts?.find(
          (p: UserProduct) =>
            p.name.toLowerCase().includes(offering.name.toLowerCase()) ||
            offering.name.toLowerCase().includes(p.name.toLowerCase()),
        );

        return {
          name: offering.name || offering.category,
          url: offering.sourceUrl || domain,
          price: offering.pricing?.value ?? null,
          currency: offering.pricing?.currency ?? 'USD',
          matchedProducts: [
            {
              name: matchedProduct?.name ?? offering.name ?? offering.category,
              url: offering.sourceUrl ?? '',
              matchScore: matchedProduct ? 80 : 0, // Higher score if matched with user product
              priceDiff: matchedProduct?.price
                ? (offering.pricing?.value ?? 0) - matchedProduct.price
                : null,
            },
          ],
          lastUpdated: new Date().toISOString(),
        };
      });

      // Generate listing platforms based on structured data
      const listingPlatforms = this.extractListingPlatforms(structuredData);

      // Calculate match score based on business context
      let matchScore = 60; // Default score

      if (businessContext) {
        // Increase score if business types match
        if (
          businessContext.businessType &&
          businessContext.businessType.toLowerCase() ===
            businessTypeInfo.businessType.toLowerCase()
        ) {
          matchScore += 15;
        }

        // Increase score if product matches found
        const productMatchCount = products.filter(
          (p) => p.matchedProducts[0].matchScore > 0,
        ).length;
        if (productMatchCount > 0) {
          matchScore += Math.min(25, productMatchCount * 5); // Up to 25 points for product matches
        }
      }

      // Prepare the final competitor insight
      const insight: CompetitorInsight = {
        domain: this.extractDomainName(domain),
        matchScore: Math.min(100, matchScore), // Cap at 100
        matchReasons: [
          `${businessTypeInfo.businessType} business`,
          `offering ${businessTypeInfo.specificType || 'products/services'}`,
        ],
        suggestedApproach: 'Analyze pricing strategy and unique selling points',
        dataGaps: [],
        listingPlatforms,
        products,
      };

      // Identify data gaps
      if (!metaTags.description)
        insight.dataGaps.push('missing meta description');
      if (structuredData.length === 0)
        insight.dataGaps.push('lack of structured data');
      if (pricing.length === 0)
        insight.dataGaps.push('missing pricing information');
      if (products.length === 0)
        insight.dataGaps.push('no clearly identified products/services');

      console.log(`Completed analysis for ${domain}`);
      return insight;
    } catch (error) {
      console.error(`Failed to analyze competitor ${domain}:`, error);
      throw error;
    }
  }

  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];

    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  private deduplicateOfferings(offerings: Offering[]): Offering[] {
    const result: Offering[] = [];
    const nameMap = new Map<string, number>();

    for (const offering of offerings) {
      const key = offering.name.toLowerCase();

      if (nameMap.has(key)) {
        // Merge with existing offering
        const existingIndex = nameMap.get(key)!;
        const existing = result[existingIndex];

        // Keep the offering with more details
        if (offering.pricing?.value && !existing.pricing?.value) {
          existing.pricing = offering.pricing;
        }

        // Merge features
        if (Array.isArray(offering.features) && offering.features.length > 0) {
          existing.features = [
            ...new Set([...existing.features, ...offering.features]),
          ];
        }
      } else {
        // Add as new offering
        nameMap.set(key, result.length);
        result.push(offering);
      }
    }

    return result;
  }

  private extractListingPlatforms(
    structuredData: Record<string, unknown>[],
  ): CompetitorInsight['listingPlatforms'] {
    const platforms: CompetitorInsight['listingPlatforms'] = [];

    // Common platforms to check for
    const commonPlatforms = [
      { name: 'Booking.com', pattern: 'booking.com' },
      { name: 'Expedia', pattern: 'expedia' },
      { name: 'TripAdvisor', pattern: 'tripadvisor' },
      { name: 'Hotels.com', pattern: 'hotels.com' },
      { name: 'Airbnb', pattern: 'airbnb' },
      { name: 'Agoda', pattern: 'agoda' },
      { name: 'Yelp', pattern: 'yelp' },
      { name: 'Google', pattern: 'google.com/travel' },
    ];

    // Extract from structured data
    for (const data of structuredData) {
      if (data.sameAs && Array.isArray(data.sameAs)) {
        for (const url of data.sameAs as string[]) {
          for (const platform of commonPlatforms) {
            if (url.includes(platform.pattern)) {
              const aggregateRating = data.aggregateRating as
                | {
                    ratingValue?: number;
                    reviewCount?: number;
                  }
                | undefined;

              platforms.push({
                platform: platform.name,
                url,
                rating: aggregateRating?.ratingValue ?? null,
                reviewCount: aggregateRating?.reviewCount ?? null,
                priceRange: undefined,
              });
              break;
            }
          }
        }
      }
    }

    return platforms;
  }

  private extractDomainName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^www\./, '').split('/')[0];
    }
  }

  async discoverCompetitors(
    domain: string,
    businessType: string,
    userProducts: UserProduct[],
  ): Promise<CompetitorInsight[]> {
    this.logger.log(`Starting competitor discovery for ${domain}`);

    try {
      // Step 1: Analyze the user's business
      // Ensure domain has proper format
      const mainUrl =
        domain.startsWith('http://') || domain.startsWith('https://')
          ? domain
          : `https://${domain}`;

      const html = await this.tools.web.fetchContent(mainUrl);
      const businessText = this.tools.web.extractText(html);
      const businessFeatures =
        await this.tools.analysis.extractFeatures(businessText);

      // Step 2: Generate search queries
      const searchPrompt = `Generate specific competitor search queries based on ACTUAL PRODUCTS and features:
      Business Type: ${businessType}
      Key Products:  ${JSON.stringify(userProducts)}
      Product Features: ${JSON.stringify(businessFeatures)}
      
      Create queries that:
      1. Focus on exact product matches first
      2. Include specific product features
      3. Combine product + location context
      4. Avoid generic terms
      
      Return ONLY a JSON array of 1-3 search queries optimized for the appropriate search types (shopping, local, organic).`;

      const result = await this.modelManager.withBatchProcessing(
        async (llm) => llm.invoke(searchPrompt),
        searchPrompt,
      );

      let searchQueries: string[];
      try {
        // Try to parse the response directly
        const responseContent =
          typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content);

        try {
          const parsedQueries: unknown = JSON.parse(responseContent);
          // Ensure each query is a string
          searchQueries = Array.isArray(parsedQueries)
            ? parsedQueries
                .map((q: unknown) =>
                  typeof q === 'string' ? q : JSON.stringify(q),
                )
                .filter(Boolean)
            : [`competitors for ${businessType}`, domain];
        } catch (parseError) {
          // If direct parsing fails, try to extract JSON array using regex
          const jsonMatch = /\[[\s\S]*\]/.exec(responseContent);
          if (!jsonMatch) {
            this.logger.warn(
              `Failed to extract search queries from LLM response: ${(parseError as Error).message}`,
            );
            searchQueries = [
              `${businessType} ${userProducts[0]?.name}`,
              domain,
            ];
          } else {
            try {
              const extractedQueries: unknown = JSON.parse(jsonMatch[0]);
              searchQueries = Array.isArray(extractedQueries)
                ? extractedQueries
                    .map((q: unknown) =>
                      typeof q === 'string' ? q : JSON.stringify(q),
                    )
                    .filter(Boolean)
                : [`${businessType} ${userProducts[0]?.name}`, domain];
            } catch (secondParseError) {
              this.logger.warn(
                `Failed to parse extracted JSON array: ${(secondParseError as Error).message}`,
              );
              searchQueries = [
                `${businessType} ${userProducts[0]?.name}`,
                domain,
              ];
            }
          }
        }

        // Ensure we have a valid array with non-empty strings
        if (
          !Array.isArray(searchQueries) ||
          searchQueries.length === 0 ||
          !searchQueries.every((q) => typeof q === 'string' && q.length > 0)
        ) {
          searchQueries = [`${businessType} ${userProducts[0]?.name}`, domain];
        }
      } catch (error) {
        this.logger.error(
          `Error processing search queries: ${(error as Error).message}`,
        );
        searchQueries = [`${businessType} ${userProducts[0]?.name}`, domain];
      }

      // Step 3: Execute searches with different strategies
      const searchTypes: Array<'shopping' | 'maps' | 'local' | 'organic'> = [
        'shopping',
        'organic',
        businessType.includes('local') ? 'local' : 'maps',
      ];

      const searchResults = await Promise.all(
        searchQueries.flatMap((query) =>
          searchTypes.map((type) =>
            this.tools.search.serpSearch(query, type).catch((error) => {
              console.warn(
                `Search failed for query "${query}" with type "${type}":`,
                error,
              );
              return [];
            }),
          ),
        ),
      );

      // Step 4: Extract unique competitor domains
      const competitors = new Set<string>();
      const AGGREGATOR_DENYLIST = new Set([
        'tripadvisor.com',
        'expedia.com',
        'booking.com',
        'hotels.com',
        'agoda.com',
        'kayak.com',
      ]);

      searchResults.flat().forEach((result) => {
        if (Array.isArray(result)) {
          result.forEach((item) => {
            if (
              item?.url &&
              typeof item.url === 'string' &&
              item.url !== domain &&
              !AGGREGATOR_DENYLIST.has(new URL(item.url as string).hostname)
            ) {
              competitors.add(item.url as string);
            }
          });
        }
      });

      // Step 5: Analyze each competitor
      const insights = await Promise.all(
        Array.from(competitors).map((competitorDomain) => {
          const competitorBusinessContext = {
            ...(businessType && { businessType }),
            userProducts,
          };

          return this.analyzeCompetitor(
            competitorDomain,
            competitorBusinessContext,
          ).catch((error) => {
            this.logger.warn(`Failed to analyze ${competitorDomain}:`, error);
            return null;
          });
        }),
      );

      return insights.filter(
        (insight): insight is CompetitorInsight => insight !== null,
      );
    } catch (error) {
      this.logger.error(`Failed to discover competitors for ${domain}:`, error);
      throw error;
    }
  }
}
