import { Injectable, Logger, Inject } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type {
  CompetitorInsight,
  BusinessContext,
  Product,
} from '@shared/types';

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

export type UserProduct = Product;

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
      console.log('User products for matching:', {
        count: businessContext.products?.length || 0,
        products: businessContext.products?.slice(0, 3) || [],
      });
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
      console.log('Starting product matching process...');
      const userProductsArray = Array.isArray(businessContext?.products)
        ? businessContext.products
        : [];
      console.log('User products for matching:', userProductsArray.length);
      console.log('Competitor offerings found:', uniqueOfferings.length);

      const products = uniqueOfferings.map((offering) => {
        // Find best matching user product using improved algorithm
        let bestMatch: Product | null = null;
        let bestMatchScore = 0;

        for (const userProduct of userProductsArray) {
          const score = this.calculateProductMatchScore(
            userProduct.name,
            offering.name,
          );
          if (score > bestMatchScore && score > 30) {
            bestMatch = userProduct;
            bestMatchScore = score;
          }
        }

        console.log(`Match result for "${offering.name}":`, {
          foundMatch: !!bestMatch,
          matchedProductName: bestMatch?.name,
          matchScore: bestMatchScore,
        });

        return {
          name: offering.name || offering.category,
          url: offering.sourceUrl || domain,
          price: offering.pricing?.value ?? null,
          currency: offering.pricing?.currency ?? 'USD',
          matchedProducts: bestMatch
            ? [
                {
                  name: bestMatch.name,
                  url: offering.sourceUrl ?? '',
                  matchScore: bestMatchScore,
                  priceDiff:
                    bestMatch.price && offering.pricing?.value
                      ? offering.pricing.value - bestMatch.price
                      : null,
                },
              ]
            : [],
          lastUpdated: new Date().toISOString(),
        };
      });

      // Generate listing platforms based on structured data
      const listingPlatforms = this.extractListingPlatforms(
        Array.isArray(structuredData) ? structuredData : [],
      );

      // Calculate match score based on business context
      let matchScore = 60; // Default score

      if (businessContext) {
        // Increase score if business types match (ensure types are strings)
        if (
          businessContext.businessType &&
          typeof businessContext.businessType === 'string' &&
          typeof businessTypeInfo.businessType === 'string' &&
          businessContext.businessType.toLowerCase() ===
            businessTypeInfo.businessType.toLowerCase()
        ) {
          matchScore += 15;
        }

        // Increase score if product matches found
        const productMatchCount = products.filter(
          (p) => (p.matchedProducts?.[0]?.matchScore ?? 0) > 0,
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
      // Ensure insight.dataGaps is an array before pushing
      insight.dataGaps = insight.dataGaps ?? [];
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

              // Ensure platforms array exists before pushing
              platforms.push({
                platform: platform.name,
                url,
                rating: aggregateRating?.ratingValue ?? null,
                reviewCount: aggregateRating?.reviewCount ?? null,
                priceRange: null,
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

  private normalizeUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    return `https://${url}`;
  }

  private safeCreateUrl(url: string): URL | null {
    try {
      return new URL(this.normalizeUrl(url));
    } catch {
      return null;
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
      const searchPrompt = `Generate competitor search queries based on the user's business:
      Business Type: ${businessType}
      Domain: ${mainUrl}
      Key Products/Services examples: ${JSON.stringify(
        userProducts.slice(0, 5).map((p) => p.name),
      )} ${userProducts.length > 5 ? '...' : ''}
      Key Features/Keywords: ${JSON.stringify(businessFeatures.slice(0, 10))}

      Create queries aimed at finding SIMILAR BUSINESSES, focusing on:
      1. Business type and location/area (if implied by domain or products).
      2. Core services or products offered (use broader terms if specific names are too niche).
      3. Key differentiating features or keywords.

      Return ONLY a JSON array of 2-4 diverse search queries suitable for organic, local, or maps search.`;

      let searchQueries: string[] = [];
      try {
        const result = await this.modelManager.withBatchProcessing(
          async (llm) => llm.invoke(searchPrompt),
          searchPrompt,
        );

        const responseContent =
          typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content);

        try {
          let jsonString: string | null = null;
          // Attempt 1: Extract JSON array within markdown fences
          const fencedJsonMatch = responseContent.match(
            /```(?:json)?\n?(\[.*?\])[\s\S]*```/s,
          );
          if (fencedJsonMatch && fencedJsonMatch[1]) {
            jsonString = fencedJsonMatch[1];
          } else {
            // Attempt 2: Find the first JSON array pattern in the string
            const arrayMatch = responseContent.match(/(\[.*?\].*)/s);
            if (arrayMatch && arrayMatch[1]) {
              // Try to find the first valid JSON array within the match
              const firstBracket = arrayMatch[1].indexOf('[');
              const lastBracket = arrayMatch[1].lastIndexOf(']');
              if (firstBracket !== -1 && lastBracket > firstBracket) {
                const potentialJson = arrayMatch[1].substring(
                  firstBracket,
                  lastBracket + 1,
                );
                try {
                  JSON.parse(potentialJson); // Test if it's valid JSON
                  jsonString = potentialJson;
                } catch {
                  // Ignore if parsing fails, proceed to log warning
                }
              }
            }
          }

          if (jsonString) {
            const parsedQueries: unknown = JSON.parse(jsonString);
            // Ensure each query is a string and filter empty ones
            searchQueries = Array.isArray(parsedQueries)
              ? parsedQueries
                  .map((q: unknown) =>
                    typeof q === 'string' ? q.trim() : JSON.stringify(q),
                  )
                  .filter(
                    (q): q is string => typeof q === 'string' && q.length > 0,
                  )
              : [];
          } else {
            this.logger.warn(
              `Could not extract JSON array from LLM response. Response: ${responseContent.substring(
                0,
                200,
              )}...`,
            );
            searchQueries = []; // Set to empty if no JSON found
          }
        } catch (parseError) {
          this.logger.warn(
            `Failed to parse LLM search query response: ${(parseError as Error).message}, Response: ${responseContent.substring(0, 100)}...`,
          );
          searchQueries = []; // Set to empty on parse error
        }

        // Fallback if LLM fails or returns empty/invalid queries
        if (searchQueries.length === 0) {
          this.logger.warn(
            `LLM query generation failed or yielded no results, using fallback queries.`,
          );
          searchQueries = [
            `${businessType} near ${this.extractDomainName(domain)} area`,
            `similar services to ${this.extractDomainName(domain)}`,
          ];
          // Add a product-based query if possible
          if (userProducts.length > 0 && userProducts[0]?.name) {
            searchQueries.push(`${userProducts[0].name} ${businessType}`);
          }
        }
      } catch (error) {
        this.logger.error(
          `Error generating search queries: ${(error as Error).message}`,
        );
        // Simplified fallback in case of unexpected error during generation
        searchQueries = [
          `${businessType} competitors`,
          `businesses like ${this.extractDomainName(domain)}`,
        ];
      }

      this.logger.debug(
        `Using search queries: ${JSON.stringify(searchQueries)}`,
      );

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
        this.logger.debug(
          `Processing search result item: ${JSON.stringify(result)}`,
        );

        if (Array.isArray(result)) {
          result.forEach((item) => {
            this.logger.debug(`  Processing item: ${JSON.stringify(item)}`);
            if (
              item?.url &&
              typeof item.url === 'string' &&
              item.url !== domain
            ) {
              const parsedUrl = this.safeCreateUrl(item.url);
              if (parsedUrl && !AGGREGATOR_DENYLIST.has(parsedUrl.hostname)) {
                competitors.add(item.url);
              }
            }
          });
        } else if (result?.url && typeof result.url === 'string') {
          // Handle cases where the result itself is the item with a URL
          this.logger.debug(
            `  Processing single item: ${JSON.stringify(result)}`,
          );
          if (result.url !== domain) {
            const parsedUrl = this.safeCreateUrl(result.url);
            if (parsedUrl && !AGGREGATOR_DENYLIST.has(parsedUrl.hostname)) {
              competitors.add(result.url);
            }
          }
        }
      });

      this.logger.debug(
        `Found ${competitors.size} potential competitor domains after filtering: ${JSON.stringify(
          Array.from(competitors),
        )}`,
      );

      // Step 5: Analyze each competitor
      const insights: CompetitorInsight[] = (
        await Promise.all(
          Array.from(competitors).map(async (competitorDomain: string) => {
            const competitorBusinessContext: BusinessContext = {
              domain: competitorDomain,
              ...(businessType && { businessType }),
              products: userProducts,
            };

            try {
              return await this.analyzeCompetitor(
                competitorDomain,
                competitorBusinessContext,
              );
            } catch (error) {
              this.logger.warn(`Failed to analyze ${competitorDomain}:`, error);
              return null;
            }
          }),
        )
      ).filter((insight): insight is CompetitorInsight => insight !== null);

      return insights;
    } catch (error) {
      this.logger.error(`Failed to discover competitors for ${domain}:`, error);
      throw error;
    }
  }

  private calculateProductMatchScore(
    userProductName: string,
    competitorProductName: string,
  ): number {
    const user = userProductName.toLowerCase().trim();
    const competitor = competitorProductName.toLowerCase().trim();

    // Exact match
    if (user === competitor) return 100;

    // Direct substring match
    if (user.includes(competitor) || competitor.includes(user)) return 90;

    // Extract key terms for semantic matching
    const userTerms = this.extractKeyTerms(user);
    const competitorTerms = this.extractKeyTerms(competitor);

    // Calculate overlap score
    const commonTerms = userTerms.filter((term) =>
      competitorTerms.some(
        (cTerm) =>
          term === cTerm || term.includes(cTerm) || cTerm.includes(term),
      ),
    );

    if (commonTerms.length === 0) return 0;

    // Score based on term overlap
    const totalTerms = Math.max(userTerms.length, competitorTerms.length);
    const score = (commonTerms.length / totalTerms) * 100;
    return Math.min(Math.round(score), 95); // Cap at 95 to reserve 100 for exact matches
  }

  private extractKeyTerms(productName: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = [
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'per',
      'night',
      'person',
      'occupancy',
    ];

    return productName
      .toLowerCase()
      .replace(/[()[\],]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter((term) => term.length > 2 && !stopWords.includes(term))
      .map((term) => term.trim())
      .filter((term) => term.length > 0);
  }
}
