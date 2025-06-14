import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import type {
  DiscoveryResult,
  BusinessContext,
  CompetitorInsight,
} from '@shared/types';
import { CompetitorService } from './competitor.service';

@Controller()
export class CompetitorController {
  private readonly logger = new Logger(CompetitorController.name);

  constructor(private readonly competitorService: CompetitorService) {}

  @MessagePattern('discover_competitors')
  async discoverCompetitors(data: {
    domain: string;
    userId: string;
    businessType: string;
    knownCompetitors?: string[];
    productCatalogUrl: string;
  }): Promise<DiscoveryResult> {
    this.logger.debug(
      `Received 'discover_competitors' message for domain: ${data.domain}`,
    );
    this.logger.debug({
      userId: data.userId,
      businessType: data.businessType,
      knownCompetitorsCount: data.knownCompetitors?.length || 0,
      productCatalogUrl: data.productCatalogUrl,
    });

    try {
      const result = await this.competitorService.discoverCompetitors(
        data.domain,
        data.userId,
        data.businessType,
        data.knownCompetitors,
        data.productCatalogUrl,
      );

      this.logger.debug(
        `Completed 'discover_competitors' for ${data.domain}, found ${result.competitors.length} competitors`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing 'discover_competitors' for ${data.domain}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @MessagePattern('analyze_competitor')
  async analyzeCompetitor(data: {
    competitorDomain: string;
    businessContext: BusinessContext;
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
    };
  }): Promise<CompetitorInsight> {
    this.logger.debug(
      `Received 'analyze_competitor' message for ${data.competitorDomain}`,
    );
    this.logger.debug({
      businessType: data.businessContext.businessType,
      productsCount: data.businessContext.products?.length || 0,
      hasSerpMetadata: !!data.serpMetadata,
    });
    this.logger.debug('Business context details:', {
      domain: data.businessContext.domain,
      businessType: data.businessContext.businessType,
      products: data.businessContext.products || [],
      productsPreview: data.businessContext.products?.slice(0, 3) || [],
    });

    try {
      const result = await this.competitorService.analyzeCompetitor(
        data.competitorDomain,
        data.businessContext,
        data.serpMetadata,
      );

      this.logger.debug(
        `Completed 'analyze_competitor' for ${data.competitorDomain}, found ${result.products?.length || 0} products`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing 'analyze_competitor' for ${data.competitorDomain}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
