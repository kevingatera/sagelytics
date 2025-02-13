import { Injectable } from '@nestjs/common';
import { CompetitorAnalysisService } from './services/competitor-analysis.service';
import { CompetitorDiscoveryService } from './services/competitor-discovery.service';
import type { DiscoveryResult } from './interfaces/discovery-result.interface';
import type { AnalysisResult } from './interfaces/analysis-result.interface';
import type { CompetitorInsight } from './interfaces/competitor-insight.interface';

@Injectable()
export class CompetitorService {
  constructor(
    private readonly analysisService: CompetitorAnalysisService,
    private readonly discoveryService: CompetitorDiscoveryService,
  ) {}

  async discoverCompetitors(
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    return this.discoveryService.discoverCompetitors(
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
  ): Promise<CompetitorInsight> {
    return this.analysisService.analyzeCompetitor(competitorDomain, businessContext);
  }
} 