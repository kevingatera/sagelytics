import type { CompetitorInsight } from './competitor-insight.interface';
import type { AnalysisResult } from './analysis-result.interface';

export interface DiscoveryResult {
  competitors: CompetitorInsight[];
  recommendedSources: string[];
  searchStrategy: AnalysisResult;
  stats: {
    totalDiscovered: number;
    newCompetitors: number;
    existingCompetitors: number;
    failedAnalyses: number;
  };
}
