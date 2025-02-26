import { Injectable } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import type { DiscoveryResult } from './interfaces/discovery-result.interface';
import type { CompetitorInsight } from './interfaces/competitor-insight.interface';
import { ConfigService } from '@nestjs/config';
import type { BusinessContext } from './interfaces/business-context.interface';
import { NestFactory } from '@nestjs/core';
import { CompetitorModule } from './competitor.module';
import { WebsiteDiscoveryService } from '../website/services/website-discovery.service';
import { Logger } from '@nestjs/common';

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
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    this.logger.log(`Starting competitor discovery for ${domain}`);
    this.logger.debug({
      domain,
      userId,
      businessType,
      knownCompetitorsCount: knownCompetitors.length,
      productCatalogUrl,
    });

    try {
      // Get user products from the domain and product catalog URL
      const websiteContent =
        await this.websiteDiscovery.discoverWebsiteContent(domain);

      // Process product catalog URL if provided
      if (productCatalogUrl) {
        try {
          const catalogContent =
            await this.websiteDiscovery.discoverWebsiteContent(
              productCatalogUrl,
            );

          websiteContent.products = [
            ...websiteContent.products,
            ...catalogContent.products,
          ];

          this.logger.debug(
            `Added ${catalogContent.products.length} products from catalog URL`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to analyze product catalog at ${productCatalogUrl}:`,
            error,
          );

          throw new Error(
            `Failed to analyze product catalog. Please ensure the URL is valid and accessible: ${error.message}`,
          );
        }
      }

      // Transform the products into the format expected by the intelligent agent
      const userProducts = websiteContent.products.map((product) => ({
        name: product.name,
        description: product.description || 'No description available',
        price: product.price || 0,
        currency: product.currency || 'USD',
      }));

      if (userProducts.length === 0) {
        this.logger.warn('No products found in the website or catalog URL');
      }

      // Discover competitors using the intelligent agent
      const discoveredCompetitors = await this.agent.discoverCompetitors(
        domain,
        businessType,
        userProducts,
      );

      // Combine with known competitors if provided
      let allCompetitors = [...discoveredCompetitors];

      // Add known competitors if they're not already in the list
      if (knownCompetitors.length > 0) {
        this.logger.log(
          `Processing ${knownCompetitors.length} known competitors`,
        );

        const knownDomains = new Set(
          discoveredCompetitors.map((c) => c.domain),
        );

        const additionalCompetitors = await Promise.all(
          knownCompetitors
            .filter((competitorDomain) => !knownDomains.has(competitorDomain))
            .map(async (competitorDomain) => {
              try {
                const businessContext: BusinessContext = {
                  businessType,
                  userProducts,
                };

                return await this.agent.analyzeCompetitor(
                  competitorDomain,
                  businessContext,
                );
              } catch (error) {
                this.logger.warn(
                  `Failed to analyze known competitor ${competitorDomain}:`,
                  error,
                );
                return null;
              }
            }),
        );

        // Add valid analyzed competitors to the results
        allCompetitors = [
          ...allCompetitors,
          ...additionalCompetitors.filter(
            (c): c is CompetitorInsight => c !== null,
          ),
        ];
      }

      return {
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
            priceRange: {
              min: 0,
              max: 0,
              currency: 'USD',
            },
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
    } catch (error) {
      this.logger.error(`Failed to discover competitors for ${domain}:`, error);
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
    return this.agent.analyzeCompetitor(
      competitorDomain,
      businessContext,
      serpMetadata,
    );
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
