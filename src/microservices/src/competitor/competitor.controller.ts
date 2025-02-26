import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CompetitorService } from './competitor.service';
import type { DiscoveryResult } from './interfaces/discovery-result.interface';
import type { AnalysisResult } from './interfaces/analysis-result.interface';

@Controller()
export class CompetitorController {
  constructor(private readonly competitorService: CompetitorService) {}

  @MessagePattern('discover_competitors')
  async discoverCompetitors(data: {
    domain: string;
    userId: string;
    businessType: string;
    knownCompetitors?: string[];
    productCatalogUrl: string;
  }): Promise<DiscoveryResult> {
    return this.competitorService.discoverCompetitors(
      data.domain,
      data.userId,
      data.businessType,
      data.knownCompetitors,
      data.productCatalogUrl,
    );
  }

  @MessagePattern('analyze_competitor')
  async analyzeCompetitor(data: {
    competitorDomain: string;
    businessContext: AnalysisResult;
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
  }) {
    return this.competitorService.analyzeCompetitor(
      data.competitorDomain,
      data.businessContext,
      data.serpMetadata,
    );
  }
}
