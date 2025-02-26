import { Injectable, Logger } from '@nestjs/common';
import { Spider } from '@spider-cloud/spider-client';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { JsonUtils } from '@shared/utils';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import type { DiscoveryResult } from '../interfaces/discovery-result.interface';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { AnalysisResult } from '../interfaces/analysis-result.interface';
import { CompetitorAnalysisService } from './competitor-analysis.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../env';
import type { RobotsData } from '../../interfaces/robots-data.interface';
import type { WebsiteContent } from '../../interfaces/website-content.interface';
import { SmartCrawlerService } from '../../website/services/smart-crawler.service';
import type { ValueserpResponse } from '../interfaces/valueserp-response.interface';

// Define interfaces for better type safety
interface SerpMetadata {
  title?: string;
  snippet?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  url?: string;
  reviews?: number;
}

interface SerpResult {
  url: string;
  metadata?: SerpMetadata;
}

@Injectable()
export class CompetitorDiscoveryService {
  private spider: Spider;
  private readonly logger = new Logger(CompetitorDiscoveryService.name);

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly analysisService: CompetitorAnalysisService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.spider = new Spider({
      apiKey: this.configService.get('SPIDER_API_KEY'),
    });
  }

  async discoverCompetitors(
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    try {
      console.info(
        { domain, userId, productCatalogUrl },
        'Starting competitor discovery',
      );

      // First discover our own website content
      console.log('Discovering website content');
      const websiteContent =
        await this.websiteDiscovery.discoverWebsiteContent(domain);

      // Analyze product catalog URL (required)
      console.log('Analyzing product catalog URL');
      try {
        const catalogContent =
          await this.websiteDiscovery.discoverWebsiteContent(productCatalogUrl);
        websiteContent.products = [
          ...websiteContent.products,
          ...catalogContent.products,
        ];
      } catch (error) {
        console.error('Failed to analyze product catalog:', error);
        throw new Error(
          'Product catalog analysis failed. Please ensure the URL is valid and accessible.',
        );
      }

      console.log({ websiteContent }, 'Website content discovered');

      console.log('Determining search strategy');
      const strategy = await this.analysisService.determineSearchStrategy(
        domain,
        businessType,
        websiteContent,
      );
      console.log({ strategy }, 'Search strategy determined');

      // Get competitors from multiple sources
      const [serpResults, llmCompetitors] = await Promise.all([
        this.fetchValueSerpResults(domain, strategy),
        this.getLLMCompetitors(
          domain,
          businessType,
          knownCompetitors,
          websiteContent,
        ),
      ]);

      console.log(
        { serpCount: serpResults.length, llmCount: llmCompetitors.length },
        'Received competitor sources',
      );

      // Extract URLs from SERP results
      const serpUrls = serpResults.map((r) => r.url);
      const results = [...serpUrls];

      // Combine all discovered domains
      const discoveredDomains = [
        ...new Set([
          ...results,
          ...llmCompetitors.map((s) => s.trim().toLowerCase()),
          ...knownCompetitors.map((s) => s.trim().toLowerCase()),
        ]),
      ].filter((s) => s.length > 0 && s !== domain.toLowerCase());

      console.log({ discoveredDomains }, 'Processing discovered domains');

      console.log(
        `Starting competitor analysis for ${discoveredDomains.length} domains`,
      );
      let failedAnalyses = 0;

      // Get competitor insights with error handling and deep crawling when needed
      const competitorInsights = await Promise.all(
        discoveredDomains.map(async (competitorDomain) => {
          try {
            // Find SERP metadata for this domain if available
            const serpData = serpResults.find(
              (r) => r.url === competitorDomain,
            )?.metadata;
            let insight = await this.analysisService.analyzeCompetitor(
              competitorDomain,
              strategy,
              serpData,
            );

            // If no products found but high match score, try deep crawling
            if (insight.products.length === 0 && insight.matchScore > 0.7) {
              console.log(
                `No products found for ${competitorDomain} but high match score. Starting deep crawl...`,
              );

              // Get robots.txt data
              const robotsData =
                await this.websiteDiscovery.fetchRobotsTxt(competitorDomain);

              // Perform deep crawl
              const deepCrawlContent = await this.deepCrawlCompetitor(
                competitorDomain,
                robotsData,
              );

              // Re-analyze with additional content
              insight = await this.analysisService.analyzeCompetitor(
                competitorDomain,
                strategy,
                serpData,
                deepCrawlContent,
              );

              console.log(
                `Deep crawl completed for ${competitorDomain}. Found ${insight.products.length} products.`,
              );
            }

            console.info(
              `Analysis completed for ${competitorDomain}:`,
              insight,
            );
            return insight;
          } catch (error) {
            console.error(
              `Failed to analyze competitor ${competitorDomain}:`,
              error,
            );
            failedAnalyses++;
            return null;
          }
        }),
      );

      // Filter and sort competitors by match score
      const rankedCompetitors = competitorInsights
        .filter((insight): insight is CompetitorInsight => insight !== null)
        .sort((a, b) => b.matchScore - a.matchScore);

      console.info(
        { rankedCount: rankedCompetitors.length },
        'Competitor ranking completed',
      );

      // Get recommended data sources with error handling
      let recommendedSources: string[] = [];
      try {
        recommendedSources =
          await this.analysisService.suggestDataSources(strategy);
        console.log('Recommended data sources:', recommendedSources);
      } catch (error) {
        console.error('Failed to get recommended sources:', error);
        recommendedSources = [];
      }

      const finalStats = {
        totalDiscovered: discoveredDomains.length,
        newCompetitors: 0,
        existingCompetitors: 0,
        failedAnalyses,
      };

      console.info('Discovery process completed with stats:', finalStats);

      return {
        competitors: rankedCompetitors,
        recommendedSources,
        searchStrategy: strategy,
        stats: finalStats,
      };
    } catch (error) {
      console.error('Failed to discover competitors:', error);
      throw new Error(
        'Failed to discover competitors. Please try again later.',
      );
    }
  }

  private async getLLMCompetitors(
    domain: string,
    businessType: string,
    knownCompetitors: string[],
    websiteContent: WebsiteContent,
  ): Promise<string[]> {
    const prompt = `Analyze ${domain} as a ${businessType} business.
    Known competitors: ${knownCompetitors.join(', ')}
    
    Website Content Analysis:
    Title: ${websiteContent.title}
    Description: ${websiteContent.description}
    Products: ${JSON.stringify(websiteContent.products)}
    Services: ${JSON.stringify(websiteContent.services)}
    
    Consider these business-specific aspects for competitor discovery:
    
    1. For hospitality/lodging:
      - Similar location/destination type
      - Comparable experience offerings
      - Price range and luxury level
      - Target tourist demographic
    
    2. For SaaS/Tech:
      - Similar product feature set
      - Target market segment
      - Pricing model alignment
      - Technology stack/platform
    
    3. For marketplaces:
      - Similar market niche
      - Geographic coverage
      - Commission/pricing models
      - Seller/buyer demographics
    
    4. For e-commerce:
      - Product category overlap
      - Price positioning
      - Market reach
      - Fulfillment capabilities
    
    5. For service businesses:
      - Service category match
      - Geographic coverage
      - Expertise/specialization
      - Client segment
    
    Based on the actual products/services discovered from their website, suggest 3-5 direct competitors 
    that most closely match their specific offerings and target market.
    Consider both direct and indirect competitors based on service/product substitutability.
    
    Return ONLY a JSON array of domain names. Example:
    ["competitor1.com", "competitor2.com"]`;

    try {
      const result = await this.modelManager.withBatchProcessing(
        async (llm) => {
          return await llm.invoke(prompt);
        },
        prompt,
      );

      // Fix toString() issue by explicitly checking the type
      let content = '';
      if (typeof result.content === 'string') {
        content = result.content;
      } else if (
        result.content &&
        typeof result.content.toString === 'function'
      ) {
        // Use JSON.stringify instead of toString to avoid [object Object]
        content = JSON.stringify(result.content);
      } else {
        content = JSON.stringify(result.content);
      }

      const jsonStr = JsonUtils.extractJSON(content, 'array');
      return JSON.parse(jsonStr) as string[];
    } catch (error) {
      console.error('Failed to parse LLM competitor response:', error);
      return [];
    }
  }

  private extractUrlsFromResponse(
    data: ValueserpResponse,
    searchType: string,
  ): SerpResult[] {
    const results: SerpResult[] = [];

    // Extract knowledge graph data if available
    if (data.knowledge_graph) {
      const kg = data.knowledge_graph;
      if (kg.website) {
        results.push({
          url: new URL(kg.website).hostname,
          metadata: {
            title: kg.title,
            rating: kg.rating as number | undefined,
            reviewCount: kg.reviews as number | undefined,
            snippet: kg.description as string | undefined,
            priceRange: kg.price_range
              ? {
                  min: parseFloat(kg.price_range as string) || 0,
                  max: parseFloat(kg.price_range as string) || 0,
                  currency: 'USD',
                }
              : undefined,
          },
        });
      }
    }

    // Process organic results
    const processResult = (result: {
      link?: string;
      title?: string;
      snippet?: string;
      rich_snippet?: {
        top?: {
          detected_extensions?: {
            price?: string;
            currency?: {
              code?: string;
              symbol?: string;
            };
          };
          extensions?: string[];
        };
      };
    }) => {
      if (!result.link) return;

      const url = new URL(result.link).hostname;
      const metadata: SerpMetadata = {
        title: result.title,
        snippet: result.snippet,
      };

      // Extract rich snippet data
      if (result.rich_snippet?.top?.detected_extensions) {
        const ext = result.rich_snippet.top.detected_extensions;
        if (ext.price && ext.currency) {
          metadata.priceRange = {
            min: parseFloat(ext.price || '0'),
            max: parseFloat(ext.price || '0'),
            currency: ext.currency.code || ext.currency.symbol || 'USD',
          };
        }

        // Extract rating and review count
        const ratingMatch =
          result.rich_snippet.top.extensions?.[0]?.match?.(
            /(\d+\.?\d*)\((\d+)\)/,
          );
        if (ratingMatch) {
          metadata.rating = parseFloat(ratingMatch[1] || '0');
          metadata.reviewCount = parseInt(ratingMatch[2] || '0', 10);
        }
      }

      results.push({ url, metadata });
    };

    switch (searchType) {
      case 'maps':
        (data.local_results || []).forEach((r) => {
          if (r.website) {
            results.push({
              url: new URL(r.website).hostname,
              metadata: {
                title: r.title,
                rating: r.rating,
                reviewCount: r.reviews,
                snippet: r.snippet,
              },
            });
          }
        });
        break;

      case 'shopping':
        (data.shopping_results || []).forEach((r) => {
          if (r.link) processResult(r);
        });
        break;

      case 'local':
      case 'organic':
        (data.organic_results || []).forEach((r) => {
          processResult(r);
        });
        break;
    }

    // Process related questions for additional context
    if (data.related_questions) {
      data.related_questions.forEach((q) => {
        if (q.source?.link) {
          results.push({
            url: new URL(q.source.link).hostname,
            metadata: {
              title: q.source.title,
              snippet: q.answer,
            },
          });
        }
      });
    }

    return results;
  }

  private async fetchValueSerpResults(
    domain: string,
    strategy: AnalysisResult,
  ): Promise<SerpResult[]> {
    const baseParams: Record<string, string | number> = {
      api_key: this.configService.get('VALUESERP_API_KEY'),
      google_domain: 'google.com',
      gl: 'us',
      hl: 'en',
      location: strategy.locationContext?.location?.country || 'United States',
    };

    const results: SerpResult[] = [];

    // Fetch additional results based on search type
    const endpointMap: Record<
      AnalysisResult['searchType'],
      {
        path: string;
        params: Record<string, string | number>;
      }
    > = {
      maps: {
        path: '/search',
        params: {
          q: strategy.searchQuery,
          tbm: 'lcl',
          num: 20,
          radius: strategy.locationContext?.radius || 25,
        },
      },
      shopping: {
        path: '/shopping',
        params: {
          q: strategy.searchQuery,
          tbm: 'shop',
          num: 15,
        },
      },
      local: {
        path: '/search',
        params: {
          q: strategy.searchQuery,
          tbm: 'lcl',
          num: 15,
          radius: strategy.locationContext?.radius || 50,
        },
      },
      organic: {
        path: '/search',
        params: {
          q: strategy.searchQuery,
          num: 20,
        },
      },
    };

    const config = endpointMap[strategy.searchType] || endpointMap.organic;

    const params = new URLSearchParams({
      ...baseParams,
      ...config.params,
      q: strategy.searchQuery,
    });

    try {
      const response = await fetch(
        `https://api.valueserp.com${config.path}?${params}`,
      );
      if (response.ok) {
        const data = (await response.json()) as ValueserpResponse;
        const extractedResults = this.extractUrlsFromResponse(
          data,
          strategy.searchType,
        );
        results.push(...extractedResults);
      }
    } catch (error) {
      console.error(`ValueSerp ${strategy.searchType} fetch failed:`, error);
    }

    // Deduplicate results
    const uniqueResults: SerpResult[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      const key = JSON.stringify(result);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  private async deepCrawlCompetitor(
    domain: string,
    robotsData: RobotsData | null,
  ): Promise<WebsiteContent> {
    this.logger.log(`Starting deep crawl for ${domain}`);

    // Get sitemap data
    const sitemapData = await this.websiteDiscovery.discoverSitemaps(domain);

    // Use smart crawler for deep crawling
    const smartCrawler = new SmartCrawlerService(
      this.modelManager,
      this.websiteDiscovery,
    );

    return smartCrawler.smartCrawl(domain, robotsData, sitemapData);
  }
}
