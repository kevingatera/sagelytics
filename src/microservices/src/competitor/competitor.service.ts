import { Injectable } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import type { DiscoveryResult } from './interfaces/discovery-result.interface';
import type { CompetitorInsight } from './interfaces/competitor-insight.interface';
import type { ConfigService } from '@nestjs/config';

@Injectable()
export class CompetitorService {
  constructor(
    private readonly agent: IntelligentAgentService
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
    // Mock user products for now - in real app this would come from database
    const userProducts = [
      {
        name: "Sample Product",
        description: "A sample product description",
        price: 99.99,
        currency: "USD"
      }
    ];

    const competitors = await this.agent.discoverCompetitors(
      domain,
      businessType,
      userProducts
    );

    return {
      competitors,
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
            postalCode: ''
          },
          radius: 50
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
            currency: 'USD'
          },
          targetMarket: [],
          competitiveAdvantages: []
        }
      },
      stats: {
        totalDiscovered: competitors.length,
        newCompetitors: competitors.length,
        existingCompetitors: 0,
        failedAnalyses: 0
      }
    };
  }

  async analyzeCompetitor(
    competitorDomain: string,
    businessContext: any,
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
    }
  ): Promise<CompetitorInsight> {
    // Extract user products from businessContext if available
    const userProducts = businessContext?.userProducts || [
      {
        name: "Sample Product",
        description: "A sample product description",
        price: 99.99,
        currency: "USD"
      }
    ];

    return this.agent.analyzeCompetitor(competitorDomain, businessContext, serpMetadata);
  }
}

// Bootstrap the microservice if running standalone
if (require.main === module) {
  const { NestFactory } = require('@nestjs/core');
  const { CompetitorModule } = require('./competitor.module');
  const { ConfigService } = require('@nestjs/config');

  async function bootstrap() {
    const app = await NestFactory.createMicroservice(
      CompetitorModule,
      CompetitorService.getOptions(new ConfigService()),
    );
    await app.listen();
  }
  bootstrap();
} 