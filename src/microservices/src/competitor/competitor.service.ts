import { Injectable } from '@nestjs/common';
import { CompetitorDiscoveryService } from './services/competitor-discovery.service';
import { CompetitorAnalysisService } from './services/competitor-analysis.service';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import type { DiscoveryResult } from './interfaces/discovery-result.interface';
import type { AnalysisResult } from './interfaces/analysis-result.interface';
import type { CompetitorInsight } from './interfaces/competitor-insight.interface';

@Injectable()
export class CompetitorService {
  constructor(
    private readonly competitorDiscovery: CompetitorDiscoveryService,
    private readonly competitorAnalysis: CompetitorAnalysisService,
    private readonly configService: ConfigService,
  ) {}

  static getOptions(configService: ConfigService) {
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

  async onModuleInit() {
    // Initialize microservice-specific setup
  }

  async discoverCompetitors(
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    return this.competitorDiscovery.discoverCompetitors(
      domain,
      userId,
      businessType,
      knownCompetitors,
      productCatalogUrl,
    );
  }

  async analyzeCompetitor(
    competitorDomain: string,
    businessContext: AnalysisResult,
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
    return this.competitorAnalysis.analyzeCompetitor(competitorDomain, businessContext, serpMetadata);
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