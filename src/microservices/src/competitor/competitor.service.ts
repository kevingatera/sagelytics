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

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);

  constructor(
    private readonly agent: IntelligentAgentService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
  ) {}

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
    this.logger.debug({
      userDomain,
      userId,
      businessType,
      knownCompetitorsCount: knownCompetitors.length,
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

      // Discover competitors - Assuming agent returns CompetitorInsight[] | null
      this.logger.debug(
        `Discovering competitors for ${userDomain} with business type: ${businessType}`,
      );
      const discoveredCompetitorsResult = await this.agent.discoverCompetitors(
        userDomain,
        businessType,
        userProducts,
      );

      // Ensure discoveredCompetitors is an array
      const discoveredCompetitors: CompetitorInsight[] = Array.isArray(
        discoveredCompetitorsResult,
      )
        ? discoveredCompetitorsResult
        : [];

      this.logger.debug(
        `Discovered ${discoveredCompetitors.length} competitors via agent`,
      );
      if (discoveredCompetitors.length > 0) {
        this.logger.debug(
          `Discovered competitor domains: ${discoveredCompetitors.map((c) => c.domain).join(', ')}`,
        );
      }

      // Combine with known competitors if provided
      let allCompetitors: CompetitorInsight[] = [...discoveredCompetitors];

      // Add known competitors if they're not already in the list
      if (knownCompetitors.length > 0) {
        this.logger.log(
          `Processing ${knownCompetitors.length} known competitors: ${knownCompetitors.join(', ')}`,
        );

        const knownDomains = new Set(allCompetitors.map((c) => c?.domain));
        this.logger.debug(
          `Existing competitor domains: ${Array.from(knownDomains).join(', ')}`,
        );

        const filteredCompetitors = knownCompetitors.filter(
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
                  error,
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
          existingCompetitors: knownCompetitors.length,
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
