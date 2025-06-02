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

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);
  private readonly usePerplexity: boolean;

  constructor(
    private readonly agent: IntelligentAgentService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly perplexityService: PerplexityService,
    private readonly configService: ConfigService,
  ) {
    // Check if Perplexity API key is available
    this.usePerplexity = !!this.configService.get('PERPLEXITY_API_KEY');
    this.logger.log(
      `Perplexity integration: ${this.usePerplexity ? 'enabled' : 'disabled'}`,
    );
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
  ): Promise<DiscoveryResult> {
    this.logger.log(`Starting competitor discovery for ${userDomain}`);

    // Ensure knownCompetitors is always an array
    const safeKnownCompetitors = Array.isArray(knownCompetitors)
      ? knownCompetitors
      : [];

    this.logger.debug({
      userDomain,
      userId,
      businessType,
      knownCompetitorsCount: safeKnownCompetitors.length,
      productCatalogUrl,
    });

    try {
      // Get website content first to understand user products
      this.logger.debug(
        `Fetching website content for user domain: ${userDomain}`,
      );
      const websiteContent: WebsiteContent =
        await this.websiteDiscovery.discoverWebsiteContent(userDomain);
      this.logger.debug(
        `Website content fetched for ${userDomain}, found ${websiteContent.products?.length || 0} products`,
      );

      // Default empty catalog content
      const catalogContent: Partial<WebsiteContent> = {
        products: [],
      };

      // Get products from catalog if provided
      if (productCatalogUrl) {
        this.logger.debug(`Fetching product catalog from ${productCatalogUrl}`);
        try {
          const catalogData: WebsiteContent =
            await this.websiteDiscovery.discoverWebsiteContent(
              productCatalogUrl,
            );
          this.logger.debug(
            `Catalog data fetched from ${productCatalogUrl}, found ${catalogData.products?.length || 0} products`,
          );

          catalogContent.products = Array.isArray(catalogData.products)
            ? catalogData.products
            : [];
        } catch (err) {
          this.logger.warn(
            `Failed to fetch product catalog from ${productCatalogUrl}:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      // Combine products from both sources, ensuring arrays exist and types match
      const userProducts: Product[] = [
        ...(websiteContent.products ?? []),
        ...(catalogContent.products ?? []),
      ].map((p) => ({
        name: p?.name ?? 'Unknown Product',
        description: p?.description ?? '',
        url: p?.url ?? undefined,
        price: p?.price ?? undefined,
        currency: p?.currency ?? undefined,
      }));

      this.logger.debug(
        `Combined ${userProducts.length} products from website and catalog`,
      );

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
          this.logger.debug(
            `Using Perplexity to discover competitors for ${userDomain}`,
          );
          const perplexityResults =
            await this.perplexityService.discoverCompetitors(
              userDomain,
              businessType,
            );

          if (
            perplexityResults.competitors &&
            perplexityResults.competitors.length > 0
          ) {
            this.logger.debug(
              `Perplexity found ${perplexityResults.competitors.length} competitors`,
            );

            // Convert Perplexity results to CompetitorInsight format
            discoveredCompetitors = await Promise.all(
              perplexityResults.competitors.map(async (competitor) => {
                // For each competitor found by Perplexity, enrich with details using our service
                try {
                  // Research competitor products and details
                  const competitorDetails =
                    await this.perplexityService.researchCompetitor(
                      competitor.domain,
                      businessType,
                    );

                  return {
                    domain: competitor.domain,
                    name: competitor.name,
                    description:
                      competitor.description ||
                      competitorDetails.insights ||
                      '',
                    products: competitorDetails.products.map((p) => ({
                      name: p.name,
                      description: p.description || '',
                      price: p.price,
                      currency: p.currency || 'USD',
                      features: p.features || [],
                      url: '',
                      matchedProducts: [],
                      lastUpdated: new Date().toISOString(),
                    })),
                    productCount: competitorDetails.products.length,
                    priceRange: this.calculatePriceRange(
                      competitorDetails.products,
                    ),
                    sources: competitorDetails.sources || [],
                    matchScore: 0,
                    matchReasons: [],
                    suggestedApproach: '',
                    dataGaps: [],
                    listingPlatforms: [],
                  } as CompetitorInsight;
                } catch (error) {
                  this.logger.warn(
                    `Failed to get competitor details for ${competitor.domain} via Perplexity:`,
                    error instanceof Error ? error.message : String(error),
                  );

                  // Return minimal competitor info if detail fetching fails
                  return {
                    domain: competitor.domain,
                    name: competitor.name,
                    description: competitor.description || '',
                    products: [],
                    productCount: 0,
                    sources: [],
                    matchScore: 0,
                    matchReasons: [],
                    suggestedApproach: '',
                    dataGaps: [],
                    listingPlatforms: [],
                  } as CompetitorInsight;
                }
              }),
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
        this.logger.debug(
          `Discovering competitors for ${userDomain} with business type: ${businessType} using agent`,
        );
        const agentResults = await this.agent.discoverCompetitors(
          userDomain,
          businessType,
          userProducts,
        );

        // Ensure discoveredCompetitors is an array
        discoveredCompetitors = Array.isArray(agentResults) ? agentResults : [];

        this.logger.debug(
          `Discovered ${discoveredCompetitors.length} competitors via agent`,
        );
      }

      if (discoveredCompetitors.length > 0) {
        this.logger.debug(
          `Discovered competitor domains: ${discoveredCompetitors.map((c) => c.domain).join(', ')}`,
        );
      }

      // Combine with known competitors if provided
      let allCompetitors: CompetitorInsight[] = [...discoveredCompetitors];

      // Add known competitors if they're not already in the list
      if (safeKnownCompetitors.length > 0) {
        this.logger.log(
          `Processing ${safeKnownCompetitors.length} known competitors: ${safeKnownCompetitors.join(', ')}`,
        );

        const knownDomains = new Set(allCompetitors.map((c) => c?.domain));
        this.logger.debug(
          `Existing competitor domains: ${Array.from(knownDomains).join(', ')}`,
        );

        const filteredCompetitors = safeKnownCompetitors.filter(
          (competitorDomain) => !knownDomains.has(competitorDomain),
        );

        this.logger.debug(
          `Analyzing ${filteredCompetitors.length} unique known competitors`,
        );

        const additionalCompetitors: CompetitorInsight[] = (
          await Promise.all(
            filteredCompetitors.map(async (competitorDomain) => {
              try {
                this.logger.debug(
                  `Analyzing known competitor: ${competitorDomain}`,
                );

                const competitorContext: BusinessContext = {
                  domain: competitorDomain,
                  businessType,
                  products: userProducts,
                };

                // Try using Perplexity for known competitor analysis if available
                if (this.usePerplexity) {
                  try {
                    const perplexityDetails =
                      await this.perplexityService.researchCompetitor(
                        competitorDomain,
                        businessType,
                        userProducts?.[0]?.name || '', // Use first product as a focus if available, default to empty string
                      );

                    return {
                      domain: competitorDomain,
                      name: this.extractDomainName(competitorDomain),
                      description: perplexityDetails.insights || '',
                      products: perplexityDetails.products.map((p) => ({
                        name: p.name,
                        description: p.description || '',
                        price: p.price,
                        currency: p.currency || 'USD',
                        features: p.features || [],
                        url: '',
                        matchedProducts: [],
                        lastUpdated: new Date().toISOString(),
                      })),
                      productCount: perplexityDetails.products.length,
                      priceRange: this.calculatePriceRange(
                        perplexityDetails.products,
                      ),
                      sources: perplexityDetails.sources || [],
                      matchScore: 0,
                      matchReasons: [],
                      suggestedApproach: '',
                      dataGaps: [],
                      listingPlatforms: [],
                    } as CompetitorInsight;
                  } catch (error) {
                    this.logger.warn(
                      `Perplexity analysis failed for ${competitorDomain}, falling back to agent:`,
                      error instanceof Error ? error.message : String(error),
                    );
                    // Fall back to agent if Perplexity fails
                  }
                }

                // Use the original agent-based analysis if Perplexity wasn't available or failed
                const analysisResult = await this.agent.analyzeCompetitor(
                  competitorDomain,
                  competitorContext,
                );

                this.logger.debug(
                  `Analysis complete for ${competitorDomain}, found ${analysisResult.products?.length || 0} products`,
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

      this.logger.debug(`Final competitor count: ${allCompetitors.length}`);

      const result: DiscoveryResult = {
        competitors: allCompetitors,
        recommendedSources: [],
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

      this.logger.debug(
        `Returning discovery result with ${result.stats.totalDiscovered} total competitors`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to discover competitors for ${userDomain}:`,
        error instanceof Error ? error.stack : String(error),
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
      // Try using Perplexity for competitor analysis if available
      if (this.usePerplexity) {
        try {
          this.logger.debug(
            `Using Perplexity to analyze competitor: ${competitorDomain}`,
          );

          const perplexityDetails =
            await this.perplexityService.researchCompetitor(
              competitorDomain,
              businessContext.businessType ?? '',
              businessContext.products?.[0]?.name || '', // Use first product as a focus if available, default to empty string
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
              domain: competitorDomain,
              name: this.extractDomainName(competitorDomain),
              description: perplexityDetails.insights || '',
              products: perplexityDetails.products.map((p) => ({
                name: p.name,
                description: p.description || '',
                price: p.price,
                currency: p.currency || 'USD',
                features: p.features || [],
                url: '',
                matchedProducts: [],
                lastUpdated: new Date().toISOString(),
              })),
              productCount: perplexityDetails.products.length,
              priceRange: this.calculatePriceRange(perplexityDetails.products),
              sources: perplexityDetails.sources || [],
              matchScore: 0,
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
      const result = await this.agent.analyzeCompetitor(
        competitorDomain,
        businessContext,
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
  private extractDomainName(url: string): string {
    const domain = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    return (
      domain.split('.')[0].charAt(0).toUpperCase() +
      domain.split('.')[0].slice(1)
    );
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
