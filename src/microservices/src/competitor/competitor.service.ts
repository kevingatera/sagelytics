import { Injectable, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import type {
  DiscoveryResult,
  CompetitorInsight,
  BusinessContext,
  WebsiteContent,
  Product,
} from '@shared/types';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CompetitorModule } from './competitor.module';
import { WebsiteDiscoveryService } from '../website/services/website-discovery.service';
import { PerplexityService } from '../llm-tools/perplexity.service';
import { compareTwoStrings } from 'string-similarity';
import { Redis } from 'ioredis';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { JsonUtils } from '@shared/utils';
import { parseListedPrice } from '../shared/utils/price-parser';
import { createHash } from 'crypto';
import type { RedisOptions } from 'ioredis';

type CompetitorResearch = Awaited<
  ReturnType<PerplexityService['researchCompetitor']>
>;

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);
  private readonly usePerplexity: boolean;
  private readonly redis: Redis;
  private readonly cacheEnabled: boolean;
  private redisOperational = true;
  private readonly enableMatchEnhancement: boolean;

  // Minimum score after which we consider two products a match
  private static readonly MIN_MATCH_SCORE = 30;
  private static readonly DISCOVERY_CACHE_TTL_SECONDS = 6 * 60 * 60;
  private static readonly RESEARCH_CACHE_TTL_SECONDS = 24 * 60 * 60;
  private static readonly DEFAULT_MAX_COMPETITORS_TO_ENRICH = 3;
  private static readonly MAX_COMPETITORS_TO_ENRICH_CAP = 6;
  private static readonly DEFAULT_MAX_KNOWN_COMPETITORS_TO_ENRICH = 2;
  private static readonly MAX_KNOWN_COMPETITORS_TO_ENRICH_CAP = 5;
  private readonly competitorResearchTimeoutMs: number;
  private readonly matchEnhancementTimeoutMs: number;

  constructor(
    private readonly agent: IntelligentAgentService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly perplexityService: PerplexityService,
    private readonly configService: ConfigService,
    private readonly modelManager: ModelManagerService,
  ) {
    // Check if Perplexity API key is available
    this.usePerplexity = !!this.configService.get('PERPLEXITY_API_KEY');
    this.logger.log(
      `Perplexity integration: ${this.usePerplexity ? 'enabled' : 'disabled'}`,
    );
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const cacheToggle =
      this.configService.get<string>('ENABLE_COMPETITOR_CACHE', 'true') !==
      'false';
    this.cacheEnabled = nodeEnv !== 'test' && cacheToggle;

    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisDb = this.configService.get<number>('REDIS_DB', 0);
    const baseOptions: RedisOptions = {
      db: redisDb,
      enableReadyCheck: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    };

    if (redisUrl) {
      this.redis = new Redis(redisUrl, baseOptions);
    } else {
      const redisPassword = this.configService.get<string | undefined>(
        'REDIS_PASSWORD',
      );
      const redisUsername = this.configService.get<string | undefined>(
        'REDIS_USERNAME',
      );

      this.redis = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        ...(redisPassword ? { password: redisPassword } : {}),
        ...(redisUsername ? { username: redisUsername } : {}),
        ...baseOptions,
      });
    }

    this.competitorResearchTimeoutMs = this.resolveTimeoutMs(
      'COMPETITOR_RESEARCH_TIMEOUT_MS',
      30000,
      10000,
      120000,
    );
    this.matchEnhancementTimeoutMs = this.resolveTimeoutMs(
      'MATCH_ENHANCEMENT_TIMEOUT_MS',
      12000,
      5000,
      60000,
    );
    this.enableMatchEnhancement =
      this.configService.get<string>('ENABLE_MATCH_ENHANCEMENT', 'false') ===
      'true';

    this.redis.on('error', (error) => {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed. Progress updates and cache are disabled.',
        );
        return;
      }

      if (this.redisOperational) {
        this.logger.warn(
          `[CompetitorService] Redis error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  private resolveTimeoutMs(
    key: string,
    defaultMs: number,
    minMs: number,
    maxMs: number,
  ): number {
    const configuredRaw = this.configService.get<string>(key);
    const configured = Number(configuredRaw);
    if (!Number.isFinite(configured) || configured <= 0) {
      return defaultMs;
    }

    return Math.min(Math.max(Math.floor(configured), minMs), maxMs);
  }

  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    context: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
      return (await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(
              new Error(
                `${context} timed out after ${Math.round(timeoutMs / 1000)} seconds`,
              ),
            );
          }, timeoutMs);
        }),
      ])) as T;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  static getOptions(configService: ConfigService): MicroserviceOptions {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL');
    const url = new URL(redisUrl);

    // Add logging of Redis config
    const logger = new Logger('CompetitorService');
    logger.debug(`Configuring Redis connection: ${url.hostname}:${url.port}`);

    return {
      transport: Transport.REDIS,
      options: {
        host: url.hostname,
        port: Number(url.port),
        retryAttempts: 5,
        retryDelay: 3000,
      },
    };
  }

  async discoverCompetitors(
    userDomain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
    sessionId?: string | null,
  ): Promise<DiscoveryResult> {
    this.logger.log(
      `[CompetitorService] Starting competitor discovery for ${userDomain}`,
    );

    // Ensure knownCompetitors is always an array
    const safeKnownCompetitors = Array.isArray(knownCompetitors)
      ? knownCompetitors
      : [];
    const discoveryCacheKey = this.buildDiscoveryCacheKey(
      userDomain,
      businessType,
      safeKnownCompetitors,
      productCatalogUrl,
    );

    this.logger.log(`[CompetitorService] Discovery parameters:`, {
      userDomain,
      userId,
      businessType,
      knownCompetitorsCount: safeKnownCompetitors.length,
      knownCompetitors: safeKnownCompetitors,
      productCatalogUrl,
      timestamp: new Date().toISOString(),
    });

    try {
      const cachedResult =
        await this.getCachedJson<DiscoveryResult>(discoveryCacheKey);
      if (cachedResult) {
        this.logger.log(
          `[CompetitorService] Using cached discovery result for ${userDomain}`,
          {
            competitors: cachedResult.competitors.length,
            userProducts: cachedResult.userProducts?.length ?? 0,
          },
        );
        await this.updateProgress(
          sessionId,
          'processing_results',
          95,
          'Using recent competitor analysis results...',
          5,
        );
        return cachedResult;
      }

      // Get website content first to understand user products
      this.logger.log(
        `[CompetitorService] Fetching website content for user domain: ${userDomain}`,
      );
      await this.updateProgress(
        sessionId,
        'analyzing_domain',
        40,
        `Analyzing your domain: ${userDomain}...`,
        120,
      );

      let websiteContent: WebsiteContent;
      try {
        websiteContent =
          await this.websiteDiscovery.discoverWebsiteContent(userDomain);
        this.logger.log(
          `[CompetitorService] Website content fetched for ${userDomain}:`,
          {
            productCount: websiteContent.products?.length || 0,
            domain: userDomain,
          },
        );
      } catch (error) {
        this.logger.warn(
          `[CompetitorService] Failed to fetch website content for ${userDomain}:`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Continue with empty website content
        websiteContent = {
          url: userDomain,
          title: '',
          description: '',
          products: [],
          services: [],
          categories: [],
          keywords: [],
          mainContent: '',
          metadata: {},
        };
      }

      // Default empty catalog content
      const catalogContent: Partial<WebsiteContent> = {
        products: [],
      };

      // Get products from catalog if provided
      if (productCatalogUrl) {
        this.logger.log(
          `[CompetitorService] Fetching product catalog from ${productCatalogUrl}`,
        );
        await this.updateProgress(
          sessionId,
          'analyzing_products',
          45,
          'Analyzing product catalog and extracting information...',
          110,
        );

        try {
          const catalogData: WebsiteContent =
            await this.websiteDiscovery.discoverWebsiteContent(
              productCatalogUrl,
            );
          this.logger.log(`[CompetitorService] Catalog data fetched:`, {
            url: productCatalogUrl,
            productCount: catalogData.products?.length || 0,
          });

          catalogContent.products = Array.isArray(catalogData.products)
            ? catalogData.products
            : [];
        } catch (err) {
          this.logger.warn(
            `❌ [CompetitorService] Failed to fetch product catalog:`,
            {
              url: productCatalogUrl,
              error: err instanceof Error ? err.message : String(err),
            },
          );
        }
      }

      // Combine products from both sources, ensuring arrays exist and types match
      const userProducts: Product[] = this.sanitizeProducts(
        [
          ...(websiteContent.products ?? []),
          ...(catalogContent.products ?? []),
        ].map((p) => {
          const derivedPrice =
            p?.price ??
            this.extractPriceFromText(
              `${p?.name ?? ''} ${p?.description ?? ''}`,
            );
          return {
            name: p?.name ?? 'Unknown Product',
            description: p?.description ?? '',
            url: p?.url ?? undefined,
            price: derivedPrice,
            currency: p?.currency ?? (derivedPrice ? 'USD' : undefined),
          };
        }),
      );

      this.logger.log(`[CompetitorService] Combined products from sources:`, {
        totalProducts: userProducts.length,
        websiteProducts: websiteContent.products?.length ?? 0,
        catalogProducts: catalogContent.products?.length ?? 0,
        sampleProducts: userProducts.slice(0, 3).map((p) => p.name),
      });

      // If no products found from website/catalog, try using Perplexity as fallback
      if (userProducts.length === 0 && this.usePerplexity) {
        this.logger.log(
          `[CompetitorService] No products found, using Perplexity fallback for: ${userDomain}`,
        );
        await this.updateProgress(
          sessionId,
          'analyzing_products',
          50,
          'Discovering additional products with AI...',
          100,
        );
        try {
          const userProductResearch = await this.withTimeout(
            this.researchCompetitorWithCache(
              userDomain,
              businessType,
              'accommodation rooms and services offered',
            ),
            this.competitorResearchTimeoutMs,
            `User product research for ${userDomain}`,
          );

          if (
            userProductResearch.products &&
            userProductResearch.products.length > 0
          ) {
            const perplexityUserProducts: Product[] =
              userProductResearch.products.map((p) => ({
                name: p.name,
                description: p.description || '',
                url: p.url || undefined,
                price: p.price,
                currency: p.currency || 'USD',
              }));

            userProducts.push(...perplexityUserProducts);
            const normalizedProducts = this.sanitizeProducts(userProducts);
            userProducts.length = 0;
            userProducts.push(...normalizedProducts);
            this.logger.log(
              `[CompetitorService] Perplexity found user products:`,
              {
                count: perplexityUserProducts.length,
                products: perplexityUserProducts.slice(0, 3).map((p) => p.name),
                hasMore: perplexityUserProducts.length > 3,
              },
            );
          }
        } catch (error) {
          this.logger.warn(
            `❌ [CompetitorService] Perplexity user product discovery failed:`,
            {
              domain: userDomain,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      if (userProducts.length > 0) {
        this.logger.debug(
          `First few products: ${userProducts
            .slice(0, 3)
            .map((p) => p.name)
            .join(', ')}${userProducts.length > 3 ? '...' : ''}`,
        );
      }

      // Try to use Perplexity for competitor discovery first if available
      let discoveredCompetitors: CompetitorInsight[] = [];

      if (this.usePerplexity) {
        try {
          this.logger.log(
            `[CompetitorService] Using Perplexity to discover competitors for: ${userDomain}`,
          );
          await this.updateProgress(
            sessionId,
            'discovering_competitors',
            55,
            'Discovering competitors with AI...',
            90,
          );

          // Extract region from website content for better competitor discovery
          let region: string | undefined;
          const contentText = `${websiteContent.title} ${websiteContent.description} ${websiteContent.mainContent}`;
          const lowercaseContentText = contentText.toLowerCase();

          // Try to extract location from metadata first
          if (websiteContent.metadata?.contactInfo?.address) {
            region = websiteContent.metadata.contactInfo.address;
          } else {
            // Use a more generic location extraction pattern
            const locationPatterns = [
              /(?:located in|based in|situated in|headquartered in|serving)\s+([^,.\n]+(?:,\s*[^,.\n]+)?)/i,
              /(?:in|at|near)\s+([a-z][a-z\s]+(?:,\s*[a-z][a-z\s]+)?)/i,
              /([a-z][a-z\s]+(?:,\s*[a-z][a-z\s]+)?)\s+(?:location|office|branch|store)/i,
            ];

            for (const pattern of locationPatterns) {
              const match =
                contentText.match(pattern) ??
                lowercaseContentText.match(pattern);
              if (match && match[1]) {
                region = match[1].trim();
                break;
              }
            }
          }

          this.logger.log(
            `[CompetitorService] Inferred region for competitor search: ${region || 'not detected'}`,
          );

          // Add timeout wrapper around Perplexity call
          const perplexityPromise = this.perplexityService.discoverCompetitors(
            userDomain,
            businessType,
            region,
          );

          const perplexityResults = (await Promise.race([
            perplexityPromise,
            new Promise((_, reject) => {
              setTimeout(() => {
                reject(
                  new Error(
                    'Perplexity competitor discovery timed out after 60 seconds',
                  ),
                );
              }, 60000);
            }),
          ])) as {
            competitors: Array<{
              domain: string;
              name: string;
              description?: string;
            }>;
          };

          if (
            perplexityResults.competitors &&
            perplexityResults.competitors.length > 0
          ) {
            const dedupedCandidates = this.dedupeCompetitorCandidates(
              perplexityResults.competitors,
            );
            const maxCompetitorsToAnalyze =
              this.resolveMaxCompetitorsToAnalyze();
            const competitorsToAnalyze = dedupedCandidates.slice(
              0,
              maxCompetitorsToAnalyze,
            );

            this.logger.log(
              `[CompetitorService] Perplexity discovery completed:`,
              {
                competitorCount: competitorsToAnalyze.length,
                droppedCompetitors:
                  dedupedCandidates.length - competitorsToAnalyze.length,
                competitors: competitorsToAnalyze.map((c) => ({
                  domain: c.domain,
                  name: c.name,
                })),
              },
            );

            await this.updateProgress(
              sessionId,
              'analyzing_competitors',
              60,
              `Analyzing ${competitorsToAnalyze.length} discovered competitors...`,
              80,
            );

            // Convert Perplexity results to CompetitorInsight format
            const totalCompetitors = competitorsToAnalyze.length;
            let processedCompetitors = 0;

            discoveredCompetitors = await Promise.all(
              competitorsToAnalyze.map(async (competitor) => {
                // Clean and validate domain before processing
                const cleanedDomain = this.cleanDomain(competitor.domain);
                // If the original competitor entry contains a deeper path (e.g. /tax/)
                // keep that for focused scraping, otherwise just domain
                const researchTarget =
                  competitor.domain.includes('/') &&
                  !competitor.domain.endsWith(cleanedDomain)
                    ? competitor.domain
                    : cleanedDomain;

                if (!this.validateCompetitorDomain(cleanedDomain)) {
                  this.logger.warn(
                    `[CompetitorService] Skipping invalid competitor: ${competitor.domain}`,
                  );
                  return null; // Will be filtered out later
                }

                // For each competitor found by Perplexity, enrich with details using our service
                try {
                  // Update progress for each competitor
                  processedCompetitors++;
                  const progressPercentage =
                    60 +
                    Math.floor((processedCompetitors / totalCompetitors) * 15);
                  await this.updateProgress(
                    sessionId,
                    'analyzing_competitors',
                    progressPercentage,
                    `Analyzing competitor ${processedCompetitors}/${totalCompetitors}: ${cleanedDomain}...`,
                    80 -
                      Math.floor(
                        (processedCompetitors / totalCompetitors) * 30,
                      ),
                  );

                  // Research competitor products and details
                  const competitorDetails = await this.withTimeout(
                    this.researchCompetitorWithCache(
                      researchTarget,
                      businessType,
                    ),
                    this.competitorResearchTimeoutMs,
                    `Competitor research for ${cleanedDomain}`,
                  );

                  // Calculate product matches and overall match score
                  const productsWithMatches = competitorDetails.products.map(
                    (p) => {
                      const matchedProducts = this.matchProducts(
                        p,
                        userProducts,
                      );
                      return {
                        name: p.name,
                        url: p.url || null,
                        price: p.price || null,
                        currency: p.currency || 'USD',
                        matchedProducts,
                        lastUpdated: new Date().toISOString(),
                      };
                    },
                  );

                  // Optional LLM-powered enhancement when initial matching found few/none
                  if (this.usePerplexity && this.enableMatchEnhancement) {
                    const candidatePairs: Array<{
                      userProductName: string;
                      competitorProductName: string;
                      currentScore: number;
                    }> = [];

                    productsWithMatches.forEach((prod) => {
                      if (prod.matchedProducts.length === 0) {
                        userProducts.forEach((u) => {
                          const score = this.calculateProductMatchScore(
                            u.name,
                            prod.name,
                          );
                          // Only consider pairs with reasonable similarity (>10) for enhancement
                          if (
                            score > 10 &&
                            score < CompetitorService.MIN_MATCH_SCORE
                          ) {
                            candidatePairs.push({
                              userProductName: u.name,
                              competitorProductName: prod.name,
                              currentScore: score,
                            });
                          }
                        });
                      }
                    });

                    const shouldEnhanceMatches =
                      candidatePairs.length > 0 &&
                      userProducts.length <= 10 &&
                      productsWithMatches.length <= 12;

                    if (shouldEnhanceMatches) {
                      const enhanced = await this.withTimeout(
                        this.batchEnhanceProductMatches(candidatePairs),
                        this.matchEnhancementTimeoutMs,
                        `Product match enhancement for ${cleanedDomain}`,
                      );
                      enhanced.forEach((res) => {
                        if (
                          res.enhancedScore >= CompetitorService.MIN_MATCH_SCORE
                        ) {
                          const prod = productsWithMatches.find(
                            (p) => p.name === res.competitorProductName,
                          );
                          const up = userProducts.find(
                            (u) => u.name === res.userProductName,
                          );
                          if (prod && up) {
                            prod.matchedProducts.push({
                              name: up.name,
                              url: up.url || '',
                              matchScore: res.enhancedScore,
                              priceDiff: null,
                            });
                          }
                        }
                      });
                    } else if (candidatePairs.length > 0) {
                      this.logger.debug(
                        `[CompetitorService] Skipping Gemini enhancement for ${cleanedDomain}; candidatePairs=${candidatePairs.length}, userProducts=${userProducts.length}, competitorProducts=${productsWithMatches.length}`,
                      );
                    }
                  }

                  const productMatchCount = productsWithMatches.filter(
                    (p) => p.matchedProducts.length > 0,
                  ).length;

                  let matchScoreCalc = 60; // Base score
                  if (businessType) {
                    matchScoreCalc += 15; // Same business type assumed
                  }
                  // Up to 25 points for product overlaps (5 pts each)
                  matchScoreCalc += Math.min(25, productMatchCount * 5);
                  matchScoreCalc = Math.min(100, matchScoreCalc);

                  return {
                    domain: cleanedDomain, // Use cleaned domain
                    businessName:
                      competitorDetails.businessName || competitor.name,
                    matchScore: matchScoreCalc,
                    matchReasons: [],
                    suggestedApproach: competitorDetails.insights || '',
                    dataGaps: [],
                    listingPlatforms: [],
                    products: productsWithMatches,
                    monitoringData: {
                      productUrls: competitorDetails.products
                        .filter((p) => p.url && p.name)
                        .map((p, index) => ({
                          id: `${cleanedDomain}-${index}`,
                          name: p.name,
                          url: p.url!,
                          price: p.price,
                          currency: p.currency || 'USD',
                          category: businessType,
                        })),
                      lastUpdated: new Date().toISOString(),
                      extractionMethod: 'perplexity' as const,
                    },
                  } as CompetitorInsight;
                } catch (error) {
                  this.logger.warn(
                    `Failed to get competitor details for ${cleanedDomain} via Perplexity:`,
                    error instanceof Error ? error.message : String(error),
                  );

                  // Return minimal competitor info if detail fetching fails
                  return {
                    domain: cleanedDomain, // Use cleaned domain
                    businessName: competitor.name,
                    matchScore: 0,
                    matchReasons: [],
                    suggestedApproach: competitor.description || '',
                    dataGaps: ['Failed to fetch detailed product information'],
                    listingPlatforms: [],
                    products: [],
                    monitoringData: {
                      productUrls: [],
                      lastUpdated: new Date().toISOString(),
                      extractionMethod: 'perplexity' as const,
                    },
                  } as CompetitorInsight;
                }
              }),
            ).then((results) =>
              results.filter((c): c is CompetitorInsight => c !== null),
            );
          }
        } catch (error) {
          this.logger.warn(
            `Perplexity competitor discovery failed, falling back to agent:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // Fall back to original agent-based discovery if Perplexity failed or found no results
      if (discoveredCompetitors.length === 0) {
        this.logger.log(
          `[CompetitorService] Fallback to agent-based discovery:`,
          {
            domain: userDomain,
            businessType,
            reason: 'No competitors found via Perplexity',
          },
        );
        const agentResults = await this.agent.discoverCompetitors(
          userDomain,
          businessType,
          userProducts,
        );

        // Ensure discoveredCompetitors is an array
        discoveredCompetitors = Array.isArray(agentResults) ? agentResults : [];

        this.logger.log(`[CompetitorService] Agent discovery completed:`, {
          competitorCount: discoveredCompetitors.length,
          method: 'agent',
        });
      }

      if (discoveredCompetitors.length > 0) {
        this.logger.log(`[CompetitorService] Discovery summary:`, {
          totalDiscovered: discoveredCompetitors.length,
          domains: discoveredCompetitors.map((c) => c.domain),
        });

        // Log details about each discovered competitor
        discoveredCompetitors.forEach((competitor, index) => {
          this.logger.log(
            `[CompetitorService] Competitor ${index + 1}: ${competitor.domain}`,
            {
              businessName: competitor.businessName,
              matchScore: competitor.matchScore,
              productCount: competitor.products?.length || 0,
              sampleProducts:
                competitor.products
                  ?.slice(0, 3)
                  .map((p) => ({ name: p.name, price: p.price })) || [],
              platformCount: competitor.listingPlatforms?.length || 0,
              dataGaps: competitor.dataGaps?.length || 0,
            },
          );
        });
      }

      // Combine with known competitors if provided
      let allCompetitors: CompetitorInsight[] = [...discoveredCompetitors];

      // Add known competitors if they're not already in the list
      if (safeKnownCompetitors.length > 0) {
        this.logger.log(
          `👥 [CompetitorService] Processing known competitors:`,
          {
            total: safeKnownCompetitors.length,
            competitors: safeKnownCompetitors,
          },
        );

        const knownDomains = new Set(
          allCompetitors
            .map((c) => this.cleanDomain(c?.domain ?? ''))
            .filter(Boolean),
        );
        const uniqueKnownCompetitors = safeKnownCompetitors.filter(
          (competitorDomain) =>
            !knownDomains.has(this.cleanDomain(competitorDomain)),
        );
        const maxKnownCompetitorsToAnalyze =
          this.resolveMaxKnownCompetitorsToAnalyze();
        const filteredCompetitors = uniqueKnownCompetitors.slice(
          0,
          maxKnownCompetitorsToAnalyze,
        );

        this.logger.log(`[CompetitorService] Known competitor analysis:`, {
          existingCount: allCompetitors.length,
          newToAnalyze: filteredCompetitors.length,
          duplicatesSkipped:
            safeKnownCompetitors.length - uniqueKnownCompetitors.length,
          droppedForCost:
            uniqueKnownCompetitors.length - filteredCompetitors.length,
        });

        if (filteredCompetitors.length > 0) {
          await this.updateProgress(
            sessionId,
            'analyzing_competitors',
            80,
            `Analyzing ${filteredCompetitors.length} additional known competitors...`,
            40,
          );
        }

        const additionalCompetitors: CompetitorInsight[] = (
          await Promise.all(
            filteredCompetitors.map(async (competitorDomain) => {
              try {
                // Clean and validate domain before processing
                const cleanedDomain = this.cleanDomain(competitorDomain);

                if (!this.validateCompetitorDomain(cleanedDomain)) {
                  this.logger.warn(
                    `[CompetitorService] Skipping invalid known competitor: ${competitorDomain}`,
                  );
                  return null;
                }

                this.logger.debug(
                  `Analyzing known competitor: ${cleanedDomain}`,
                );

                const competitorContext: BusinessContext = {
                  domain: cleanedDomain,
                  businessType,
                  products: userProducts,
                };

                // Try using Perplexity for known competitor analysis if available
                if (this.usePerplexity) {
                  try {
                    const perplexityDetails = await this.withTimeout(
                      this.researchCompetitorWithCache(
                        competitorDomain.includes('/') &&
                          !competitorDomain.endsWith(cleanedDomain)
                          ? competitorDomain
                          : cleanedDomain,
                        businessType,
                        userProducts?.[0]?.name || '', // focus product
                      ),
                      this.competitorResearchTimeoutMs,
                      `Known competitor research for ${cleanedDomain}`,
                    );

                    return {
                      domain: cleanedDomain, // Use cleaned domain
                      name: this.extractDomainName(cleanedDomain),
                      description: perplexityDetails.insights || '',
                      products: perplexityDetails.products.map((p) => ({
                        name: p.name,
                        description: p.description || '',
                        price: p.price,
                        currency: p.currency || 'USD',
                        features: p.features || [],
                        url: '',
                        matchedProducts: this.matchProducts(p, userProducts),
                        lastUpdated: new Date().toISOString(),
                      })),
                      productCount: perplexityDetails.products.length,
                      priceRange: this.calculatePriceRange(
                        perplexityDetails.products,
                      ),
                      sources: perplexityDetails.sources || [],
                      matchScore: (() => {
                        const matches = perplexityDetails.products.filter(
                          (p) => this.matchProducts(p, userProducts).length > 0,
                        ).length;
                        let score = 60;
                        if (businessType) score += 15;
                        score += Math.min(25, matches * 5);
                        return Math.min(100, score);
                      })(),
                      matchReasons: [],
                      suggestedApproach: '',
                      dataGaps: [],
                      listingPlatforms: [],
                    } as CompetitorInsight;
                  } catch (error) {
                    this.logger.warn(
                      `Perplexity analysis failed for ${cleanedDomain}, falling back to agent:`,
                      error instanceof Error ? error.message : String(error),
                    );
                    // Fall back to agent if Perplexity fails
                  }
                }

                // Use the original agent-based analysis if Perplexity wasn't available or failed
                const analysisResult = await this.agent.analyzeCompetitor(
                  cleanedDomain,
                  competitorContext,
                );

                this.logger.debug(
                  `Analysis complete for ${cleanedDomain}, found ${analysisResult.products?.length || 0} products`,
                );
                return analysisResult;
              } catch (error) {
                this.logger.warn(
                  `Failed to analyze known competitor ${competitorDomain}:`,
                  error instanceof Error ? error.message : String(error),
                );
                return null;
              }
            }),
          )
        ).filter((c): c is CompetitorInsight => c !== null);

        this.logger.debug(
          `Successfully analyzed ${additionalCompetitors.length} known competitors`,
        );

        // Add valid analyzed competitors to the results using type guard filter
        allCompetitors = [...allCompetitors, ...additionalCompetitors];
      }

      this.logger.log(
        `[CompetitorService] Final competitor count: ${allCompetitors.length}`,
      );

      await this.updateProgress(
        sessionId,
        'processing_results',
        90,
        `Processing ${allCompetitors.length} competitors and finalizing results...`,
        20,
      );

      const result: DiscoveryResult = {
        competitors: allCompetitors,
        recommendedSources: [],
        userProducts: userProducts,
        searchStrategy: {
          searchType: 'organic',
          searchQuery: '',
          locationContext: {
            location: {
              address: '',
              country: 'United States',
              region: '',
              city: '',
              latitude: 0,
              longitude: 0,
              formattedAddress: '',
              postalCode: '',
            },
            radius: 50,
          },
          businessAttributes: {
            size: 'small',
            focus: [],
            businessCategory: businessType,
            onlinePresence: 'moderate',
            serviceType: 'product',
            uniqueFeatures: [],
            targetMarket: [],
            competitiveAdvantages: [],
          },
        },
        stats: {
          totalDiscovered: allCompetitors.length,
          newCompetitors: discoveredCompetitors.length,
          existingCompetitors: safeKnownCompetitors.length,
          failedAnalyses: 0,
        },
      };

      this.logger.log(`[CompetitorService] Discovery completed successfully`, {
        totalCompetitors: result.competitors.length,
        newDiscovered: result.stats.newCompetitors,
        knownAnalyzed: result.stats.existingCompetitors,
        userProducts: result.userProducts?.length ?? 0,
        competitorDomains: result.competitors.map((c) => c.domain),
        timestamp: new Date().toISOString(),
      });

      await this.setCachedJson(
        discoveryCacheKey,
        result,
        CompetitorService.DISCOVERY_CACHE_TTL_SECONDS,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[CompetitorService] Discovery failed for ${userDomain}:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userDomain,
          userId,
          businessType,
          knownCompetitorCount: safeKnownCompetitors.length,
          timestamp: new Date().toISOString(),
        },
      );
      throw error;
    }
  }

  async analyzeCompetitor(
    competitorDomain: string,
    businessContext: BusinessContext,
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
    this.logger.debug(`Starting competitor analysis for ${competitorDomain}`);
    this.logger.debug({
      competitorDomain,
      businessType: businessContext.businessType,
      productsCount: businessContext.products?.length || 0,
      hasSerpMetadata: !!serpMetadata,
    });

    try {
      // Ensure we have user products to match against
      let userProducts = businessContext.products || [];

      // If no user products provided, try to discover them using Perplexity
      if (
        userProducts.length === 0 &&
        this.usePerplexity &&
        businessContext.domain
      ) {
        this.logger.debug(
          `No user products provided, using Perplexity to discover products for ${businessContext.domain}`,
        );
        try {
          const userProductResearch = await this.withTimeout(
            this.researchCompetitorWithCache(
              businessContext.domain,
              businessContext.businessType || 'hospitality',
              'accommodation rooms and services offered',
            ),
            this.competitorResearchTimeoutMs,
            `User product research for ${businessContext.domain}`,
          );

          if (
            userProductResearch.products &&
            userProductResearch.products.length > 0
          ) {
            userProducts = userProductResearch.products.map((p) => ({
              name: p.name,
              description: p.description || '',
              url: undefined,
              price: p.price,
              currency: p.currency || 'USD',
            }));
            userProducts = this.sanitizeProducts(userProducts);

            this.logger.debug(
              `Perplexity found ${userProducts.length} user products for matching`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to discover user products via Perplexity:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // Try using Perplexity for competitor analysis if available
      if (this.usePerplexity) {
        try {
          this.logger.debug(
            `Using Perplexity to analyze competitor: ${competitorDomain}`,
          );

          const cleanedDomain = this.cleanDomain(competitorDomain);
          // If the original competitor entry contains a deeper path (e.g. /tax/)
          // keep that for focused scraping, otherwise just domain
          const researchTarget =
            competitorDomain.includes('/') &&
            !competitorDomain.endsWith(cleanedDomain)
              ? competitorDomain
              : cleanedDomain;

          const perplexityDetails = await this.withTimeout(
            this.researchCompetitorWithCache(
              researchTarget,
              businessContext.businessType ?? '',
              userProducts[0]?.name || '', // Use first product as a focus if available, default to empty string
            ),
            this.competitorResearchTimeoutMs,
            `Competitor analysis research for ${cleanedDomain}`,
          );

          if (
            perplexityDetails.products.length > 0 ||
            perplexityDetails.insights
          ) {
            this.logger.debug(
              `Perplexity analysis successful for ${competitorDomain}, found ${perplexityDetails.products.length} products`,
            );

            // Construct a CompetitorInsight from Perplexity results
            return {
              domain: cleanedDomain,
              name: this.extractDomainName(competitorDomain),
              description: perplexityDetails.insights || '',
              products: perplexityDetails.products.map((p) => ({
                name: p.name,
                description: p.description || '',
                price: p.price,
                currency: p.currency || 'USD',
                features: p.features || [],
                url: '',
                matchedProducts: this.matchProducts(p, userProducts),
                lastUpdated: new Date().toISOString(),
              })),
              productCount: perplexityDetails.products.length,
              priceRange: this.calculatePriceRange(perplexityDetails.products),
              sources: perplexityDetails.sources || [],
              matchScore: (() => {
                const matches = perplexityDetails.products.filter(
                  (p) => this.matchProducts(p, userProducts).length > 0,
                ).length;
                let score = 60;
                if (businessContext.businessType) score += 15;
                score += Math.min(25, matches * 5);
                return Math.min(100, score);
              })(),
              matchReasons: [],
              suggestedApproach: '',
              dataGaps: [],
              listingPlatforms: [],
            } as CompetitorInsight;
          }
        } catch (error) {
          this.logger.warn(
            `Perplexity analysis failed for ${competitorDomain}, falling back to agent:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // Fall back to agent-based analysis if Perplexity failed or wasn't available
      this.logger.debug(
        `Using agent to analyze competitor: ${competitorDomain}`,
      );

      // Update business context with discovered user products
      const updatedBusinessContext = {
        ...businessContext,
        products: userProducts,
      };

      const result = await this.agent.analyzeCompetitor(
        competitorDomain,
        updatedBusinessContext,
        serpMetadata,
      );

      this.logger.debug(
        `Analysis complete for ${competitorDomain}, found ${result.products?.length || 0} products`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to analyze competitor ${competitorDomain}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // Helper methods
  private buildDiscoveryCacheKey(
    userDomain: string,
    businessType: string,
    knownCompetitors: string[],
    productCatalogUrl: string,
  ): string {
    const payload = {
      version: 2,
      userDomain: this.cleanDomain(userDomain),
      businessType: businessType.toLowerCase().trim(),
      knownCompetitors: [...knownCompetitors]
        .map((domain) => this.cleanDomain(domain))
        .sort(),
      productCatalogUrl: this.normalizeUrlForCache(productCatalogUrl),
    };

    const hash = createHash('sha1')
      .update(JSON.stringify(payload))
      .digest('hex');
    return `competitor:discovery:${hash}`;
  }

  private buildResearchCacheKey(
    domain: string,
    businessType: string,
    productQuery?: string,
  ): string {
    const payload = {
      version: 1,
      domain: this.cleanDomain(domain),
      businessType: businessType.toLowerCase().trim(),
      productQuery: (productQuery ?? '').toLowerCase().trim(),
    };

    const hash = createHash('sha1')
      .update(JSON.stringify(payload))
      .digest('hex');
    return `competitor:research:${hash}`;
  }

  private resolveMaxCompetitorsToAnalyze(): number {
    const configuredRaw = this.configService.get<string>(
      'COMPETITOR_DISCOVERY_LIMIT',
    );
    const configured = Number(configuredRaw);

    if (!Number.isFinite(configured) || configured <= 0) {
      return CompetitorService.DEFAULT_MAX_COMPETITORS_TO_ENRICH;
    }

    return Math.min(
      Math.floor(configured),
      CompetitorService.MAX_COMPETITORS_TO_ENRICH_CAP,
    );
  }

  private resolveMaxKnownCompetitorsToAnalyze(): number {
    const configuredRaw = this.configService.get<string>(
      'COMPETITOR_KNOWN_LIMIT',
    );
    const configured = Number(configuredRaw);

    if (!Number.isFinite(configured) || configured <= 0) {
      return CompetitorService.DEFAULT_MAX_KNOWN_COMPETITORS_TO_ENRICH;
    }

    return Math.min(
      Math.floor(configured),
      CompetitorService.MAX_KNOWN_COMPETITORS_TO_ENRICH_CAP,
    );
  }

  private dedupeCompetitorCandidates(
    competitors: Array<{
      domain: string;
      name: string;
      description?: string;
    }>,
  ): Array<{
    domain: string;
    name: string;
    description?: string;
  }> {
    const seen = new Set<string>();
    const deduped: Array<{
      domain: string;
      name: string;
      description?: string;
    }> = [];

    for (const competitor of competitors) {
      const cleanedDomain = this.cleanDomain(competitor.domain);
      if (!cleanedDomain || seen.has(cleanedDomain)) {
        continue;
      }
      seen.add(cleanedDomain);
      deduped.push({
        ...competitor,
        domain: cleanedDomain,
      });
    }

    return deduped;
  }

  private async getCachedJson<T>(key: string): Promise<T | null> {
    if (!this.cacheEnabled || !this.redisOperational) {
      return null;
    }

    try {
      const raw = await this.redis.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while reading cache. Continuing without cache.',
        );
      }
      this.logger.warn(`[CompetitorService] Failed reading cache key ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async setCachedJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.cacheEnabled || !this.redisOperational) {
      return;
    }

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while writing cache. Continuing without cache.',
        );
      }
      this.logger.warn(`[CompetitorService] Failed writing cache key ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async researchCompetitorWithCache(
    domain: string,
    businessType: string,
    productQuery?: string,
  ): Promise<CompetitorResearch> {
    const cacheKey = this.buildResearchCacheKey(
      domain,
      businessType,
      productQuery,
    );

    const cached = await this.getCachedJson<CompetitorResearch>(cacheKey);
    if (cached) {
      this.logger.debug(
        `[CompetitorService] Using cached research for ${this.cleanDomain(domain)}`,
      );
      return cached;
    }

    const fresh = await this.perplexityService.researchCompetitor(
      domain,
      businessType,
      productQuery,
    );
    await this.setCachedJson(
      cacheKey,
      fresh,
      CompetitorService.RESEARCH_CACHE_TTL_SECONDS,
    );

    return fresh;
  }

  private sanitizeProducts(products: Product[]): Product[] {
    const ignoreNames = new Set([
      'products',
      'services',
      'our products',
      'our services',
      'room types',
      'all rooms',
      'rooms',
    ]);
    const deduped = new Map<string, Product>();

    for (const product of products) {
      const name = (product.name ?? '').trim();
      if (!name) {
        continue;
      }
      if (ignoreNames.has(name.toLowerCase())) {
        continue;
      }

      const key = name.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, {
          ...product,
          name,
          description: product.description?.trim() ?? '',
        });
      }
    }

    return [...deduped.values()];
  }

  private normalizeUrlForCache(url: string): string {
    if (!url) return '';

    try {
      const normalized = new URL(
        url.startsWith('http://') || url.startsWith('https://')
          ? url
          : `https://${url}`,
      );
      normalized.hash = '';
      normalized.search = '';
      return normalized.toString().toLowerCase();
    } catch {
      return url.trim().toLowerCase();
    }
  }

  private extractDomainName(url: string): string {
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`)
        .hostname;
      return domain.replace(/^www\./, '');
    } catch {
      return url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
    }
  }

  private calculatePriceRange(
    products: Array<{ price?: number; currency?: string }>,
  ): {
    min: number;
    max: number;
    currency: string;
  } | null {
    const prices = products
      .filter((p) => typeof p.price === 'number' && !isNaN(p.price))
      .map((p) => p.price as number);

    if (prices.length === 0) {
      return null;
    }

    // Find the most common currency, defaulting to USD
    const currencyCounts = products
      .filter((p) => p.currency)
      .reduce(
        (acc, p) => {
          acc[p.currency as string] = (acc[p.currency as string] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

    const mostCommonCurrency =
      Object.keys(currencyCounts).length > 0
        ? Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0][0]
        : 'USD';

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: mostCommonCurrency,
    };
  }

  private matchProducts(
    competitorProduct: { name?: string; price?: number },
    userProducts: Product[],
  ): Array<{
    name: string;
    url: string;
    matchScore: number;
    priceDiff: number | null;
  }> {
    if (!userProducts || userProducts.length === 0) {
      return [];
    }

    const matches: Array<{
      name: string;
      url: string;
      matchScore: number;
      priceDiff: number | null;
    }> = [];

    for (const userProduct of userProducts) {
      const matchScore = this.calculateProductMatchScore(
        userProduct.name,
        competitorProduct.name || '',
      );

      if (matchScore >= CompetitorService.MIN_MATCH_SCORE) {
        // Only include matches with reasonable confidence
        const priceDiff =
          userProduct.price && competitorProduct.price
            ? ((competitorProduct.price - userProduct.price) /
                userProduct.price) *
              100
            : null;

        matches.push({
          name: userProduct.name,
          url: userProduct.url || '',
          matchScore: Math.round(matchScore),
          priceDiff,
        });
      }
    }

    return matches;
  }

  private calculateProductMatchScore(
    userProductName: string,
    competitorProductName: string,
  ): number {
    const user = userProductName.toLowerCase().trim();
    const competitor = competitorProductName.toLowerCase().trim();

    if (!user || !competitor) {
      return 0;
    }

    // 1. Exact match
    if (user === competitor) {
      return 100;
    }

    // 2. Fuzzy similarity using string-similarity (60% weight)
    const similarity = compareTwoStrings(user, competitor); // 0-1
    let score = similarity * 60;

    // 3. Token overlap (25% weight)
    const userTerms = this.extractKeyTerms(user);
    const competitorTerms = this.extractKeyTerms(competitor);
    const totalTerms = Math.max(userTerms.length, competitorTerms.length);
    const overlap = userTerms.filter((t) => competitorTerms.includes(t)).length;
    if (totalTerms > 0) {
      score += (overlap / totalTerms) * 25;
    }

    // 4. Generic modifier keywords boost (15 % weight)
    // Avoids domain-specific terms (e.g. "tax", "hotel", etc.)
    const keywords = [
      'basic',
      'standard',
      'plus',
      'pro',
      'premium',
      'advanced',
      'enterprise',
      'family',
      'individual',
      'online',
      'desktop',
      'service',
      'software',
      'subscription',
      'bundle',
      'license',
    ];
    if (keywords.some((kw) => user.includes(kw) && competitor.includes(kw))) {
      score += 15;
    }

    return Math.min(Math.round(score), 100);
  }

  private extractKeyTerms(productName: string): string[] {
    // Split on punctuation, whitespace, and camelCase boundaries then filter
    const rawTokens = productName
      .replace(/[_()[\],]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .flatMap((token) => {
        // split camelCase and numerics into separate tokens
        return token.match(/[A-Z]?[a-z]+|[0-9]+/g) || [];
      });

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

    return rawTokens
      .map((t) => t.toLowerCase())
      .filter((term) => term.length > 2 && !stopWords.includes(term));
  }

  private extractPriceFromText(text: string): number | undefined {
    return parseListedPrice(text) ?? undefined;
  }

  /**
   * Batch enhance product matches using LLM for better semantic understanding
   * This is a separate method to give users control over when to use expensive LLM calls
   *
   * @param productPairs Array of product pairs to enhance matching for
   * @returns Enhanced match scores
   */
  async batchEnhanceProductMatches(
    productPairs: Array<{
      userProductName: string;
      competitorProductName: string;
      currentScore: number;
    }>,
  ): Promise<
    Array<{
      userProductName: string;
      competitorProductName: string;
      enhancedScore: number;
      confidence: 'high' | 'medium' | 'low';
    }>
  > {
    const MAX_ENHANCE_PAIRS = 20; // Lower cap to cut down on external calls

    this.logger.debug(
      `[CompetitorService] Batch enhancing product matches. Total candidate pairs: ${productPairs.length}. Limiting to top ${MAX_ENHANCE_PAIRS}.`,
    );

    // 1) Pre-filter pairs to those that actually need enhancement (below MIN_MATCH_SCORE)
    const pairsNeedingHelp = productPairs.filter(
      (p) => p.currentScore < CompetitorService.MIN_MATCH_SCORE,
    );

    // 2) Sort so we prioritise the pairs that *almost* match – they are easier for the LLM to confirm
    pairsNeedingHelp.sort((a, b) => b.currentScore - a.currentScore);

    // 3) Respect hard cap so we don't blow the budget on a single request cycle
    const selectedPairs = pairsNeedingHelp.slice(0, MAX_ENHANCE_PAIRS);

    // Nothing to enhance – return heuristic scores as-is
    if (selectedPairs.length === 0) {
      return productPairs.map((pair) => ({
        userProductName: pair.userProductName,
        competitorProductName: pair.competitorProductName,
        enhancedScore: pair.currentScore,
        confidence:
          pair.currentScore >= 70
            ? 'high'
            : pair.currentScore >= 50
              ? 'medium'
              : 'low',
      }));
    }
    this.logger.debug(
      `[CompetitorService] Gemini enhancement on ${selectedPairs.length} pairs (max ${MAX_ENHANCE_PAIRS}).`,
    );

    try {
      const promptPairs = selectedPairs.map((p) => ({
        userProductName: p.userProductName,
        competitorProductName: p.competitorProductName,
      }));

      const prompt = `Evaluate the similarity between each pair of product names and assign a score from 0-100 (100 means they clearly refer to the exact same product/service).\nReturn ONLY a JSON array where each item has: {"userProductName": string, "competitorProductName": string, "score": number}.\nPairs:\n${JSON.stringify(promptPairs, null, 2)}`;

      const llmResponse = await this.modelManager.withBatchProcessing(
        async (llm) => llm.invoke(prompt),
        prompt,
        'gemini-2.5-flash',
      );

      let parsed: Array<{
        userProductName: string;
        competitorProductName: string;
        score: number;
      }> = [];

      try {
        const raw =
          typeof llmResponse.content === 'string'
            ? llmResponse.content
            : JSON.stringify(llmResponse.content);

        const jsonStr = JsonUtils.extractJSON(raw, 'array');
        parsed = JSON.parse(jsonStr);
      } catch (err) {
        this.logger.warn('Failed to parse Gemini response, falling back.', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      const scoreLookup = new Map<string, number>();
      parsed.forEach((item) => {
        const key = `${item.userProductName}:::${item.competitorProductName}`;
        scoreLookup.set(key, Math.round(item.score));
      });

      return productPairs.map((pair) => {
        const key = `${pair.userProductName}:::${pair.competitorProductName}`;
        const geminiScore = scoreLookup.get(key);
        const enhanced = Math.max(
          pair.currentScore,
          typeof geminiScore === 'number' ? geminiScore : 0,
        );
        return {
          userProductName: pair.userProductName,
          competitorProductName: pair.competitorProductName,
          enhancedScore: enhanced,
          confidence:
            enhanced >= 70 ? 'high' : enhanced >= 50 ? 'medium' : 'low',
        };
      });
    } catch (error) {
      this.logger.error(
        `Gemini enhancement failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return productPairs.map((pair) => ({
        userProductName: pair.userProductName,
        competitorProductName: pair.competitorProductName,
        enhancedScore: pair.currentScore,
        confidence:
          pair.currentScore >= 70
            ? 'high'
            : pair.currentScore >= 50
              ? 'medium'
              : 'low',
      }));
    }
  }

  private cleanDomain(domain: string): string {
    try {
      // Handle full URLs by extracting just the domain
      let cleanDomain = domain;

      // Remove protocol if present
      if (domain.includes('://')) {
        cleanDomain = new URL(domain).hostname;
      }

      // Remove www prefix
      cleanDomain = cleanDomain.replace(/^www\./, '');

      // Remove any remaining path components
      cleanDomain = cleanDomain.split('/')[0];

      this.logger.debug(
        `[CompetitorService] Domain cleaned: ${domain} → ${cleanDomain}`,
      );
      return cleanDomain;
    } catch (error) {
      this.logger.warn(
        `[CompetitorService] Failed to clean domain ${domain}:`,
        error,
      );
      return domain;
    }
  }

  private validateCompetitorDomain(domain: string): boolean {
    const cleanDomain = this.cleanDomain(domain);

    // Known problematic domain mappings to avoid confusion
    const problematicDomains = {
      'andbeyond.com': 'bedbathandbeyond.com', // andbeyond.com redirects to bed bath & beyond
    };

    if (problematicDomains[cleanDomain as keyof typeof problematicDomains]) {
      this.logger.warn(
        `[CompetitorService] Skipping problematic domain: ${cleanDomain} (redirects to ${problematicDomains[cleanDomain as keyof typeof problematicDomains]})`,
      );
      return false;
    }

    // Additional validation can be added here based on business type
    return true;
  }

  private async updateProgress(
    sessionId: string | null | undefined,
    step: string,
    percentage: number,
    message: string,
    estimatedTimeRemaining?: number,
  ): Promise<void> {
    if (!sessionId || !this.redisOperational) return;

    const progress = {
      sessionId,
      step,
      percentage: Math.min(100, Math.max(0, percentage)),
      message,
      timestamp: new Date(),
      estimatedTimeRemaining,
    };

    const key = `onboarding:progress:${sessionId}`;
    try {
      await this.redis.setex(key, 600, JSON.stringify(progress));

      // Also publish to channel for real-time updates
      await this.redis.publish(`progress:${sessionId}`, JSON.stringify(progress));

      this.logger.debug(
        `[CompetitorService] Progress update sent: ${step} (${percentage}%) - ${message}`,
      );
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while publishing progress updates.',
        );
      } else {
        this.logger.warn(
          `[CompetitorService] Failed to publish progress update: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private isRedisAuthError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    return /WRONGPASS|NOAUTH|invalid username-password/i.test(message);
  }

  private disableRedis(reason: string): void {
    if (!this.redisOperational) {
      return;
    }

    this.redisOperational = false;
    this.logger.warn(`[CompetitorService] Redis disabled: ${reason}`);
    try {
      this.redis.disconnect();
    } catch {
      // noop
    }
  }
}

// Bootstrap the microservice if running standalone
if (require.main === module) {
  async function bootstrap(): Promise<void> {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      CompetitorModule,
      CompetitorService.getOptions(new ConfigService()),
    );
    await app.listen();
  }
  void bootstrap();
}
