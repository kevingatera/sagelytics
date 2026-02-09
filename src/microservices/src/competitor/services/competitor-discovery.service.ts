import { Injectable, Logger } from '@nestjs/common';
import { Spider } from '@spider-cloud/spider-client';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { JsonUtils } from '@shared/utils';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { CompetitorAnalysisService } from './competitor-analysis.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../env';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import type {
  DiscoveryResult,
  CompetitorInsight,
  AnalysisResult,
  WebsiteContent,
} from '@shared/types';
import { Redis, type RedisOptions } from 'ioredis';
import * as crypto from 'crypto';
import { ValueserpResponse } from '../interfaces/valueserp-response.interface';

// Enhanced interfaces for the new funnel approach
interface GeographicContext {
  address?: string;
  city?: string;
  country?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  serviceRadius?: number; // km
}

interface BusinessProfile {
  domain: string;
  businessType: string;
  features: string[];
  priceRange?: { min: number; max: number; currency: string };
  starRating?: number;
  geography: GeographicContext;
  targetMarket: string[];
  revenueModel: string;
}

interface CandidateCompetitor {
  domain: string;
  title?: string;
  snippet?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: { min: number; max: number; currency: string };
  address?: string;
  coordinates?: { lat: number; lng: number };
  features?: string[];
  source: 'serp' | 'known' | 'llm';
  rawScore?: number;
}

interface ScoredCandidate extends CandidateCompetitor {
  scores: {
    geographic: number;
    feature: number;
    price: number;
    category: number;
    overall: number;
  };
  reasons: string[];
}

interface DiscoveryMetrics {
  queryParams: Record<string, unknown>;
  candidateCounts: {
    initial: number;
    afterHeuristics: number;
    afterGeographic: number;
    afterFeature: number;
    afterLLM: number;
    final: number;
  };
  timings: {
    heuristics: number;
    geographic: number;
    feature: number;
    llm: number;
    analysis: number;
    total: number;
  };
  cacheHits: {
    perplexity: number;
    geocoding: number;
    features: number;
  };
  failedAnalyses: number;
}

@Injectable()
export class CompetitorDiscoveryService {
  private spider: Spider;
  private readonly logger = new Logger(CompetitorDiscoveryService.name);
  private readonly redis: Redis;
  private redisOperational = true;

  // Configurable weights for scoring
  private readonly WEIGHTS = {
    geographic: parseFloat(process.env.COMPETITOR_WEIGHT_GEO || '0.25'),
    feature: parseFloat(process.env.COMPETITOR_WEIGHT_FEATURE || '0.35'),
    price: parseFloat(process.env.COMPETITOR_WEIGHT_PRICE || '0.20'),
    category: parseFloat(process.env.COMPETITOR_WEIGHT_CATEGORY || '0.20'),
  };

  // Filtering thresholds
  private readonly THRESHOLDS = {
    maxDistance: parseInt(process.env.COMPETITOR_MAX_DISTANCE_KM || '100'),
    minFeatureOverlap: parseFloat(
      process.env.COMPETITOR_MIN_FEATURE_OVERLAP || '0.15',
    ),
    maxPriceDelta: parseFloat(process.env.COMPETITOR_MAX_PRICE_DELTA || '3.0'), // 3x price difference
    minOverallScore: parseFloat(process.env.COMPETITOR_MIN_SCORE || '0.40'),
  };

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly analysisService: CompetitorAnalysisService,
    private readonly configService: ConfigService<Env, true>,
    private readonly perplexityService: PerplexityService,
  ) {
    this.spider = new Spider({
      apiKey: this.configService.get('SPIDER_API_KEY'),
    });

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
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
        ...(redisPassword ? { password: redisPassword } : {}),
        ...(redisUsername ? { username: redisUsername } : {}),
        ...baseOptions,
      });
    }

    this.redis.on('error', (error) => {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed. Competitor discovery caching is disabled.',
        );
        return;
      }

      if (this.redisOperational) {
        this.logger.warn(
          `Redis error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  async discoverCompetitors(
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const metrics: DiscoveryMetrics = {
      queryParams: {
        domain,
        businessType,
        knownCompetitors: knownCompetitors.length,
      },
      candidateCounts: {
        initial: 0,
        afterHeuristics: 0,
        afterGeographic: 0,
        afterFeature: 0,
        afterLLM: 0,
        final: 0,
      },
      timings: {
        heuristics: 0,
        geographic: 0,
        feature: 0,
        llm: 0,
        analysis: 0,
        total: 0,
      },
      cacheHits: { perplexity: 0, geocoding: 0, features: 0 },
      failedAnalyses: 0,
    };

    try {
      this.logger.log(
        `🚀 Starting enhanced competitor discovery for ${domain}`,
      );

      // Step 1: Build comprehensive business profile
      const businessProfile = await this.buildBusinessProfile(
        domain,
        businessType,
        productCatalogUrl,
      );
      this.logger.log(
        `📊 Business profile: ${businessProfile.features.length} features, ${businessProfile.geography.city || 'unknown location'}`,
      );

      // Step 2: Gather initial candidates from multiple sources
      const heuristicsStart = Date.now();
      const candidates = await this.gatherCandidates(
        domain,
        businessProfile,
        knownCompetitors,
      );
      metrics.candidateCounts.initial = candidates.length;
      metrics.timings.heuristics = Date.now() - heuristicsStart;

      this.logger.log(`🔍 Gathered ${candidates.length} initial candidates`);

      // Step 3: Fast heuristic filtering
      const afterHeuristics = this.applyHeuristicFilters(
        candidates,
        businessProfile,
      );
      metrics.candidateCounts.afterHeuristics = afterHeuristics.length;

      this.logger.log(
        `⚡ After heuristics: ${afterHeuristics.length} candidates`,
      );

      // Step 4: Geographic filtering (for location-based businesses)
      const geoStart = Date.now();
      const afterGeographic = await this.applyGeographicFilter(
        afterHeuristics,
        businessProfile,
      );
      metrics.candidateCounts.afterGeographic = afterGeographic.length;
      metrics.timings.geographic = Date.now() - geoStart;

      this.logger.log(
        `🌍 After geographic filter: ${afterGeographic.length} candidates`,
      );

      // Step 5: Feature overlap scoring and filtering
      const featureStart = Date.now();
      const afterFeature = await this.applyFeatureFilter(
        afterGeographic,
        businessProfile,
      );
      metrics.candidateCounts.afterFeature = afterFeature.length;
      metrics.timings.feature = Date.now() - featureStart;

      this.logger.log(
        `🎯 After feature filter: ${afterFeature.length} candidates`,
      );

      // Step 6: LLM-powered final selection with Perplexity
      const llmStart = Date.now();
      const finalCandidates = await this.llmFinalSelection(
        afterFeature,
        businessProfile,
      );
      metrics.candidateCounts.afterLLM = finalCandidates.length;
      metrics.timings.llm = Date.now() - llmStart;

      this.logger.log(
        `🧠 After LLM selection: ${finalCandidates.length} candidates`,
      );

      // Step 7: Detailed analysis of final candidates
      const analysisStart = Date.now();
      const competitorInsights = await this.analyzeFinalists(
        finalCandidates,
        businessProfile,
      );
      metrics.candidateCounts.final = competitorInsights.length;
      metrics.timings.analysis = Date.now() - analysisStart;
      metrics.failedAnalyses =
        finalCandidates.length - competitorInsights.length;

      // Step 8: Final re-ranking with combined scores
      const rankedCompetitors =
        this.rerankWithCombinedScores(competitorInsights);

      metrics.timings.total = Date.now() - startTime;

      // Log metrics for observability
      this.logDiscoveryMetrics(metrics);

      // Get recommended data sources
      const recommendedSources = this.getRecommendedSources(businessProfile);

      const result: DiscoveryResult = {
        competitors: rankedCompetitors,
        recommendedSources,
        searchStrategy: {
          businessType: businessProfile.businessType,
          targetMarket: businessProfile.targetMarket,
          geography: businessProfile.geography,
          features: businessProfile.features,
          priceRange: businessProfile.priceRange,
          searchType: 'local' as const,
          searchQuery: `${businessProfile.businessType} competitors`,
        } as AnalysisResult,
        stats: {
          totalDiscovered: metrics.candidateCounts.final,
          newCompetitors: metrics.candidateCounts.final,
          existingCompetitors: 0,
          failedAnalyses: metrics.failedAnalyses,
        },
      };

      this.logger.log(
        `✅ Discovery completed: ${rankedCompetitors.length} competitors in ${metrics.timings.total}ms`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Discovery failed for ${domain}:`, error);
      throw error;
    }
  }

  private async buildBusinessProfile(
    domain: string,
    businessType: string,
    productCatalogUrl: string,
  ): Promise<BusinessProfile> {
    // Discover website content
    const websiteContent =
      await this.websiteDiscovery.discoverWebsiteContent(domain);

    // Auto-classify when caller passes "other"
    if (businessType === 'other') {
      businessType = this.guessBusinessType(websiteContent);
    }

    // Get product catalog if provided
    let catalogContent: WebsiteContent | null = null;
    if (productCatalogUrl) {
      try {
        catalogContent =
          await this.websiteDiscovery.discoverWebsiteContent(productCatalogUrl);
      } catch (error) {
        this.logger.warn(`Failed to fetch catalog: ${error.message}`);
      }
    }

    // Extract features with caching
    const cacheKey = `features:${crypto.createHash('md5').update(domain).digest('hex')}`;
    let features: string[] = [];

    const cachedFeatures = await this.safeRedisGet(cacheKey);
    if (cachedFeatures) {
      features = JSON.parse(cachedFeatures);
    } else {
      const contentText = [
        websiteContent.title,
        websiteContent.description,
        websiteContent.mainContent?.substring(0, 2000),
        ...(websiteContent.products?.map(
          (p) => `${p.name} ${p.description || ''}`,
        ) || []),
        ...(websiteContent.services?.map(
          (s) => `${s.name} ${s.description || ''}`,
        ) || []),
      ]
        .filter(Boolean)
        .join(' ');

      features = await this.extractFeatures(contentText);
      await this.safeRedisSetex(cacheKey, 86400, JSON.stringify(features)); // Cache for 24h
    }

    // Extract geographic context
    const geography = this.extractGeographicContext(websiteContent);

    // Calculate price range
    const priceRange = this.calculatePriceRange([
      ...(websiteContent.products || []),
      ...(catalogContent?.products || []),
    ]);

    return {
      domain,
      businessType,
      features,
      priceRange,
      geography,
      targetMarket: this.inferTargetMarket(websiteContent, businessType),
      revenueModel: this.inferRevenueModel(websiteContent, businessType),
    };
  }

  private async gatherCandidates(
    domain: string,
    profile: BusinessProfile,
    knownCompetitors: string[],
  ): Promise<CandidateCompetitor[]> {
    const candidates: CandidateCompetitor[] = [];

    // Add known competitors
    knownCompetitors.forEach((comp) => {
      candidates.push({
        domain: this.cleanDomain(comp),
        source: 'known',
      });
    });

    // SERP search with multiple strategies
    const serpCandidates = await this.fetchSerpCandidates(profile);
    candidates.push(...serpCandidates);

    // Remove duplicates and the original domain
    const seen = new Set([this.cleanDomain(domain)]);
    return candidates.filter((c) => {
      const cleanDomain = this.cleanDomain(c.domain);
      if (seen.has(cleanDomain)) return false;
      seen.add(cleanDomain);
      return true;
    });
  }

  private async fetchSerpCandidates(
    profile: BusinessProfile,
  ): Promise<CandidateCompetitor[]> {
    const candidates: CandidateCompetitor[] = [];
    const queries = this.generateSearchQueries(profile);
    const searchTypes = this.determineSearchTypes(profile.businessType);

    for (const query of queries) {
      for (const searchType of searchTypes) {
        try {
          const results = await this.fetchValueSerpResults(query, searchType);
          candidates.push(
            ...results.map((r) => ({ ...r, source: 'serp' as const })),
          );
        } catch (error) {
          this.logger.warn(
            `SERP search failed for "${query}" (${searchType}):`,
            error.message,
          );
        }
      }
    }

    return candidates;
  }

  private generateSearchQueries(profile: BusinessProfile): string[] {
    const queries: string[] = [];

    // Base queries
    queries.push(`${profile.businessType} competitors`);

    // Location-based queries
    if (profile.geography.city) {
      queries.push(`${profile.businessType} ${profile.geography.city}`);
      queries.push(
        `best ${profile.businessType} near ${profile.geography.city}`,
      );
    }

    // Feature-based queries
    if (profile.features.length > 0) {
      const topFeatures = profile.features.slice(0, 3);
      queries.push(`${profile.businessType} with ${topFeatures.join(' ')}`);
    }

    // Price-based queries
    if (profile.priceRange) {
      const priceLevel =
        profile.priceRange.min > 200
          ? 'luxury'
          : profile.priceRange.min > 100
            ? 'mid-range'
            : 'budget';
      queries.push(`${priceLevel} ${profile.businessType}`);
    }

    return queries.slice(0, 6); // Limit to avoid rate limits
  }

  private determineSearchTypes(
    businessType: string,
  ): Array<'maps' | 'local' | 'shopping' | 'organic'> {
    const locationBased = [
      'hospitality',
      'restaurant',
      'healthcare',
      'automotive',
    ];
    const productBased = ['ecommerce', 'retail'];

    if (locationBased.includes(businessType)) {
      return ['maps', 'local'];
    } else if (productBased.includes(businessType)) {
      return ['shopping', 'organic'];
    } else {
      return ['local', 'organic'];
    }
  }

  private applyHeuristicFilters(
    candidates: CandidateCompetitor[],
    profile: BusinessProfile,
  ): CandidateCompetitor[] {
    const AGGREGATOR_DENYLIST = new Set([
      'tripadvisor.com',
      'expedia.com',
      'booking.com',
      'hotels.com',
      'agoda.com',
      'kayak.com',
      'priceline.com',
      'orbitz.com',
      'travelocity.com',
      'google.com',
      'bing.com',
      'yahoo.com',
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'linkedin.com',
    ]);

    return candidates.filter((candidate) => {
      const domain = this.cleanDomain(candidate.domain);

      // Skip aggregators
      if (AGGREGATOR_DENYLIST.has(domain)) return false;

      // Skip invalid domains
      if (!this.isValidDomain(domain)) return false;

      // Skip if domain is too similar to original (likely same company)
      if (this.isDomainTooSimilar(domain, profile.domain)) return false;

      return true;
    });
  }

  private async applyGeographicFilter(
    candidates: CandidateCompetitor[],
    profile: BusinessProfile,
  ): Promise<CandidateCompetitor[]> {
    // Skip geographic filtering for non-location-based businesses
    if (
      !this.isLocationBasedBusiness(profile.businessType) ||
      !profile.geography.coordinates
    ) {
      return candidates;
    }

    const filtered: CandidateCompetitor[] = [];

    for (const candidate of candidates) {
      try {
        const coords = await this.getCoordinates(candidate);
        if (coords && profile.geography.coordinates) {
          const distance = this.calculateDistance(
            profile.geography.coordinates,
            coords,
          );
          if (distance <= this.THRESHOLDS.maxDistance) {
            candidate.coordinates = coords;
            filtered.push(candidate);
          }
        } else {
          // If we can't get coordinates, include by default
          filtered.push(candidate);
        }
      } catch {
        // On error, include the candidate
        filtered.push(candidate);
      }
    }

    return filtered;
  }

  private async applyFeatureFilter(
    candidates: CandidateCompetitor[],
    profile: BusinessProfile,
  ): Promise<ScoredCandidate[]> {
    const scored: ScoredCandidate[] = [];

    for (const candidate of candidates) {
      try {
        // Get features for candidate (with caching)
        const features = await this.getCandidateFeatures(candidate.domain);
        candidate.features = features;

        // Calculate all scores
        const scores = {
          geographic: this.calculateGeographicScore(candidate, profile),
          feature: this.calculateFeatureScore(features, profile.features),
          price: this.calculatePriceScore(candidate, profile),
          category: this.calculateCategoryScore(candidate, profile),
          overall: 0,
        };

        // Calculate weighted overall score
        scores.overall =
          scores.geographic * this.WEIGHTS.geographic +
          scores.feature * this.WEIGHTS.feature +
          scores.price * this.WEIGHTS.price +
          scores.category * this.WEIGHTS.category;

        // Only include if meets minimum threshold
        if (scores.overall >= this.THRESHOLDS.minOverallScore) {
          scored.push({
            ...candidate,
            scores,
            reasons: this.generateScoreReasons(scores),
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to score candidate ${candidate.domain}:`,
          error.message,
        );
      }
    }

    // Sort by overall score
    return scored.sort((a, b) => b.scores.overall - a.scores.overall);
  }

  private async llmFinalSelection(
    candidates: ScoredCandidate[],
    profile: BusinessProfile,
  ): Promise<ScoredCandidate[]> {
    if (candidates.length <= 10) {
      return candidates; // No need for LLM if we already have few candidates
    }

    // Create rich prompt with all context
    const prompt = this.createPerplexityPrompt(
      candidates.slice(0, 20),
      profile,
    );
    const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');

    // Check cache first
    const cached = await this.safeRedisGet(`perplexity:${cacheKey}`);
    if (cached) {
      const domains = JSON.parse(cached) as string[];
      return candidates.filter((c) => domains.includes(c.domain));
    }

    try {
      const result = await this.perplexityService.discoverCompetitors(
        profile.domain,
        profile.businessType,
        profile.geography.city
          ? `${profile.geography.city}, ${profile.geography.country}`
          : undefined,
      );

      const selectedDomains = new Set(
        result.competitors.map((c) => this.cleanDomain(c.domain)),
      );
      const selected = candidates.filter((c) =>
        selectedDomains.has(this.cleanDomain(c.domain)),
      );

      // Cache result for 24 hours
      await this.safeRedisSetex(
        `perplexity:${cacheKey}`,
        86400,
        JSON.stringify(Array.from(selectedDomains)),
      );

      return selected.slice(0, 10); // Limit final candidates
    } catch (error) {
      this.logger.warn(
        'Perplexity selection failed, using top scored candidates:',
        error.message,
      );
      return candidates.slice(0, 10);
    }
  }

  private createPerplexityPrompt(
    candidates: ScoredCandidate[],
    profile: BusinessProfile,
  ): string {
    const candidateInfo = candidates.map((c) => ({
      domain: c.domain,
      features: c.features?.slice(0, 5) || [],
      priceRange: c.priceRange,
      location: c.address,
      score: Math.round(c.scores.overall * 100),
    }));

    return `Find the best direct competitors for ${profile.domain}, a ${profile.businessType} business in ${profile.geography.city || 'unknown location'}.

Business Profile:
- Features: ${profile.features.slice(0, 10).join(', ')}
- Price Range: ${profile.priceRange ? `$${profile.priceRange.min}-${profile.priceRange.max}` : 'unknown'}
- Target Market: ${profile.targetMarket.join(', ')}

Candidate Analysis:
${JSON.stringify(candidateInfo, null, 2)}

Select the top 8 most relevant competitors considering:
1. Geographic proximity (for location-based businesses)
2. Feature overlap and service similarity
3. Price range compatibility
4. Target market alignment
5. Business model similarity

Return exactly 8 domains that are the strongest direct competitors.`;
  }

  private async analyzeFinalists(
    candidates: ScoredCandidate[],
    profile: BusinessProfile,
  ): Promise<CompetitorInsight[]> {
    const insights: CompetitorInsight[] = [];
    const concurrencyLimit = 3; // Limit concurrent analyses

    for (let i = 0; i < candidates.length; i += concurrencyLimit) {
      const batch = candidates.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (candidate) => {
        try {
          return await this.analysisService.analyzeCompetitor(
            candidate.domain,
            {
              businessType: profile.businessType,
              targetMarket: profile.targetMarket,
              geography: profile.geography,
              searchType: 'local' as const,
              searchQuery: `${profile.businessType} competitors`,
            } as AnalysisResult,
            {
              rating: candidate.rating,
              reviewCount: candidate.reviewCount,
              priceRange: candidate.priceRange,
            },
          );
        } catch (error) {
          this.logger.warn(
            `Analysis failed for ${candidate.domain}:`,
            error.message,
          );
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          insights.push(result.value);
        }
      });
    }

    return insights;
  }

  private rerankWithCombinedScores(
    insights: CompetitorInsight[],
  ): CompetitorInsight[] {
    return insights
      .map((insight) => {
        // Enhance match score with our scoring logic
        const enhancedScore = Math.min(100, insight.matchScore * 1.1); // Slight boost for making it through the funnel
        return { ...insight, matchScore: enhancedScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  // Helper methods for scoring
  private calculateGeographicScore(
    candidate: CandidateCompetitor,
    profile: BusinessProfile,
  ): number {
    if (
      !this.isLocationBasedBusiness(profile.businessType) ||
      !profile.geography.coordinates
    ) {
      return 1.0; // Max score for non-location businesses
    }

    if (!candidate.coordinates) {
      return 0.5; // Neutral score if no coordinates
    }

    const distance = this.calculateDistance(
      profile.geography.coordinates,
      candidate.coordinates,
    );
    if (distance > this.THRESHOLDS.maxDistance) return 0;

    // Linear decay: max score at 0km, min score at threshold
    return Math.max(0, 1 - distance / this.THRESHOLDS.maxDistance);
  }

  private calculateFeatureScore(
    candidateFeatures: string[],
    profileFeatures: string[],
  ): number {
    if (!candidateFeatures?.length || !profileFeatures?.length) return 0;

    const candidateSet = new Set(candidateFeatures.map((f) => f.toLowerCase()));
    const profileSet = new Set(profileFeatures.map((f) => f.toLowerCase()));

    const intersection = new Set(
      [...candidateSet].filter((f) => profileSet.has(f)),
    );
    const union = new Set([...candidateSet, ...profileSet]);

    return intersection.size / union.size; // Jaccard similarity
  }

  private calculatePriceScore(
    candidate: CandidateCompetitor,
    profile: BusinessProfile,
  ): number {
    if (!candidate.priceRange || !profile.priceRange) return 0.5; // Neutral if no price data

    const candidateAvg =
      (candidate.priceRange.min + candidate.priceRange.max) / 2;
    const profileAvg = (profile.priceRange.min + profile.priceRange.max) / 2;

    const ratio =
      Math.max(candidateAvg, profileAvg) / Math.min(candidateAvg, profileAvg);

    if (ratio > this.THRESHOLDS.maxPriceDelta) return 0;

    // Exponential decay: max score at 1:1 ratio, min score at threshold
    return Math.exp(-Math.log(ratio));
  }

  private calculateCategoryScore(
    candidate: CandidateCompetitor,
    profile: BusinessProfile,
  ): number {
    // Basic category matching based on domain keywords and business type
    const businessKeywords = this.getBusinessTypeKeywords(profile.businessType);
    const candidateDomain = candidate.domain.toLowerCase();

    let score = 0.5; // Base score

    for (const keyword of businessKeywords) {
      if (candidateDomain.includes(keyword)) {
        score += 0.1;
      }
    }

    return Math.min(1.0, score);
  }

  // Utility methods
  private async extractFeatures(text: string): Promise<string[]> {
    const prompt = `Extract key business features, amenities, and services from this text. Return only a JSON array of 10-15 most important features.

Text: ${text.substring(0, 1500)}

Return format: ["feature1", "feature2", ...]`;

    try {
      const result = await this.modelManager.withBatchProcessing(
        async (llm) => llm.invoke(prompt),
        prompt,
      );

      const content =
        typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content);
      const jsonStr = JsonUtils.extractJSON(content, 'array');
      return JSON.parse(jsonStr) as string[];
    } catch (error) {
      this.logger.warn('Feature extraction failed:', error.message);
      return [];
    }
  }

  private extractGeographicContext(content: WebsiteContent): GeographicContext {
    const address = content.metadata?.contactInfo?.address;
    const structuredData = content.metadata?.structuredData || [];

    let city = '';
    let country = '';
    let region = '';

    // Extract from structured data
    for (const data of structuredData) {
      if (data.address && typeof data.address === 'object') {
        const addr = data.address as {
          addressLocality?: string;
          addressCountry?: string;
          addressRegion?: string;
        };
        city = addr.addressLocality || city;
        country = addr.addressCountry || country;
        region = addr.addressRegion || region;
      }
    }

    // Extract from content text if not found
    if (!city || !country) {
      const text = (
        content.title +
        ' ' +
        content.description +
        ' ' +
        content.mainContent
      ).toLowerCase();

      // Simple extraction patterns (could be enhanced with NER)
      const cityMatch = text.match(
        /(?:in|at|located)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      );
      if (cityMatch && !city) city = cityMatch[1];

      const countryPatterns = [
        'rwanda',
        'kenya',
        'uganda',
        'tanzania',
        'usa',
        'uk',
        'canada',
      ];
      for (const pattern of countryPatterns) {
        if (text.includes(pattern) && !country) {
          country = pattern;
          break;
        }
      }
    }

    return {
      address,
      city,
      country,
      region,
      coordinates: undefined, // Would need geocoding service
      serviceRadius: this.inferServiceRadius(content),
    };
  }

  private calculatePriceRange(
    products: Array<{ price?: number | null }>,
  ): { min: number; max: number; currency: string } | undefined {
    const prices = products
      .map((p) => p.price)
      .filter((p): p is number => typeof p === 'number' && p !== null && p > 0);

    if (prices.length === 0) return undefined;

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: 'USD', // Default, could be enhanced
    };
  }

  private inferTargetMarket(
    content: WebsiteContent,
    businessType: string,
  ): string[] {
    // Simple inference based on content and business type
    const markets: string[] = [];

    if (businessType === 'hospitality') {
      markets.push('travelers', 'tourists');

      const text = (content.title + ' ' + content.description).toLowerCase();
      if (text.includes('luxury') || text.includes('premium'))
        markets.push('luxury travelers');
      if (text.includes('family')) markets.push('families');
      if (text.includes('business')) markets.push('business travelers');
      if (text.includes('safari') || text.includes('wildlife'))
        markets.push('safari enthusiasts');
    }

    return markets.length > 0 ? markets : ['general'];
  }

  private inferRevenueModel(
    content: WebsiteContent,
    businessType: string,
  ): string {
    if (businessType === 'hospitality') return 'per night booking';
    if (businessType === 'software') return 'subscription';
    if (businessType === 'ecommerce') return 'product sales';
    return 'service fees';
  }

  private async getCandidateFeatures(domain: string): Promise<string[]> {
    const cacheKey = `features:${crypto.createHash('md5').update(domain).digest('hex')}`;

    const cached = await this.safeRedisGet(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const content =
        await this.websiteDiscovery.discoverWebsiteContent(domain);
      const text = [
        content.title,
        content.description,
        content.mainContent?.substring(0, 1000),
      ]
        .filter(Boolean)
        .join(' ');
      const features = await this.extractFeatures(text);

      await this.safeRedisSetex(cacheKey, 86400, JSON.stringify(features));
      return features;
    } catch (error) {
      this.logger.warn(`Failed to get features for ${domain}:`, error.message);
      return [];
    }
  }

  private async getCoordinates(
    candidate: CandidateCompetitor,
  ): Promise<{ lat: number; lng: number } | null> {
    if (candidate.coordinates) return candidate.coordinates;
    if (!candidate.address) return null;

    const cacheKey = `geo:${crypto.createHash('md5').update(candidate.address).digest('hex')}`;
    const cached = await this.safeRedisGet(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // In a real implementation, you'd call a geocoding service here
    // For now, return null to skip geographic filtering
    return null;
  }

  private calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.lat * Math.PI) / 180) *
        Math.cos((coord2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private generateScoreReasons(scores: {
    geographic: number;
    feature: number;
    price: number;
    category: number;
  }): string[] {
    const reasons: string[] = [];

    if (scores.geographic > 0.8) reasons.push('excellent geographic proximity');
    else if (scores.geographic > 0.6) reasons.push('good geographic proximity');

    if (scores.feature > 0.7) reasons.push('high feature overlap');
    else if (scores.feature > 0.4) reasons.push('moderate feature similarity');

    if (scores.price > 0.8) reasons.push('similar price range');

    if (scores.category > 0.7) reasons.push('same business category');

    return reasons;
  }

  private isLocationBasedBusiness(businessType: string): boolean {
    return [
      'hospitality',
      'restaurant',
      'healthcare',
      'automotive',
      'retail',
    ].includes(businessType);
  }

  private isValidDomain(domain: string): boolean {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      domain,
    );
  }

  private isDomainTooSimilar(domain1: string, domain2: string): boolean {
    const clean1 = domain1.replace(/^www\./, '').split('.')[0];
    const clean2 = domain2.replace(/^www\./, '').split('.')[0];

    // Check if one is substring of another
    return clean1.includes(clean2) || clean2.includes(clean1);
  }

  private cleanDomain(domain: string): string {
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }

  private getBusinessTypeKeywords(businessType: string): string[] {
    const keywords = {
      hospitality: ['hotel', 'lodge', 'resort', 'accommodation', 'stay'],
      restaurant: ['restaurant', 'cafe', 'dining', 'food', 'kitchen'],
      software: ['software', 'app', 'platform', 'tech', 'saas'],
      ecommerce: ['shop', 'store', 'market', 'buy', 'sell'],
      healthcare: ['health', 'medical', 'clinic', 'care', 'wellness'],
    };

    return keywords[businessType] || [];
  }

  private inferServiceRadius(content: WebsiteContent): number {
    // Default service radius based on business type inference
    const text = (content.title + ' ' + content.description).toLowerCase();

    if (text.includes('international') || text.includes('worldwide'))
      return 10000;
    if (text.includes('national')) return 1000;
    if (text.includes('regional')) return 200;

    return 50; // Default local radius
  }

  private async fetchValueSerpResults(
    query: string,
    searchType: string,
  ): Promise<CandidateCompetitor[]> {
    const apiKey = this.configService.get<string>('VALUESERP_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'VALUESERP_API_KEY not configured, skipping SERP search',
      );
      return [];
    }

    const baseParams = new URLSearchParams({
      api_key: apiKey,
      google_domain: 'google.com',
      gl: 'us',
      hl: 'en',
      q: query,
    });

    // Add type-specific parameters
    switch (searchType) {
      case 'maps':
      case 'local':
        baseParams.append('tbm', 'lcl');
        baseParams.append('num', '20');
        break;
      case 'shopping':
        baseParams.append('tbm', 'shop');
        baseParams.append('num', '15');
        break;
      case 'organic':
        baseParams.append('num', '20');
        break;
    }

    const url = new URL('/search', 'https://api.valueserp.com');
    url.search = baseParams.toString();

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Sagelytics/1.0',
        },
      });

      if (!response.ok) {
        this.logger.error(`ValueSERP API Error [${response.status}]`);
        return [];
      }

      const data = (await response.json()) as ValueserpResponse;
      return this.extractCandidatesFromSerpResponse(data, searchType);
    } catch (error) {
      this.logger.error('ValueSERP API request failed:', error);
      return [];
    }
  }

  private extractCandidatesFromSerpResponse(
    data: ValueserpResponse,
    searchType: string,
  ): CandidateCompetitor[] {
    const candidates: CandidateCompetitor[] = [];

    // Extract from organic results
    if (data.organic_results) {
      for (const result of data.organic_results) {
        if (result.link) {
          try {
            const domain = new URL(result.link).hostname.replace(/^www\./, '');
            candidates.push({
              domain,
              title: result.title,
              snippet: result.snippet,
              source: 'serp',
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    // Extract from local results for maps/local searches
    if (
      (searchType === 'maps' || searchType === 'local') &&
      data.local_results
    ) {
      for (const result of data.local_results) {
        if (result.website) {
          try {
            const domain = new URL(result.website).hostname.replace(
              /^www\./,
              '',
            );
            candidates.push({
              domain,
              title: result.title,
              snippet: result.snippet,
              rating: result.rating,
              reviewCount: result.reviews,
              address: '',
              source: 'serp',
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    // Extract from shopping results
    if (searchType === 'shopping' && data.shopping_results) {
      for (const result of data.shopping_results) {
        if (result.link) {
          try {
            const domain = new URL(result.link).hostname.replace(/^www\./, '');
            let priceRange;
            if (result.rich_snippet?.top?.detected_extensions?.price) {
              const price = parseFloat(
                result.rich_snippet.top.detected_extensions.price.replace(
                  /[^0-9.]/g,
                  '',
                ),
              );
              if (!isNaN(price)) {
                priceRange = { min: price, max: price, currency: 'USD' };
              }
            }
            candidates.push({
              domain,
              title: result.title,
              snippet: result.snippet,
              priceRange,
              source: 'serp',
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    return candidates;
  }

  private getRecommendedSources(profile: BusinessProfile): string[] {
    const sources: string[] = [];

    if (profile.businessType === 'hospitality') {
      sources.push('booking.com', 'tripadvisor.com', 'expedia.com');
    } else if (profile.businessType === 'software') {
      sources.push('g2.com', 'capterra.com', 'producthunt.com');
    } else if (profile.businessType === 'ecommerce') {
      sources.push('similarweb.com', 'semrush.com');
    }

    return sources;
  }

  private logDiscoveryMetrics(metrics: DiscoveryMetrics): void {
    this.logger.log('📊 Discovery Metrics:', {
      funnel: {
        initial: metrics.candidateCounts.initial,
        afterHeuristics: metrics.candidateCounts.afterHeuristics,
        afterGeographic: metrics.candidateCounts.afterGeographic,
        afterFeature: metrics.candidateCounts.afterFeature,
        afterLLM: metrics.candidateCounts.afterLLM,
        final: metrics.candidateCounts.final,
      },
      timings: metrics.timings,
      efficiency: {
        totalTime: metrics.timings.total,
        avgTimePerCandidate:
          metrics.timings.total / Math.max(1, metrics.candidateCounts.initial),
        cacheHitRate:
          Object.values(metrics.cacheHits).reduce((a, b) => a + b, 0) / 3,
      },
    });
  }

  private guessBusinessType(content: WebsiteContent): string {
    const text = (
      content.title +
      ' ' +
      content.description +
      ' ' +
      (content.mainContent ?? '')
    ).toLowerCase();

    if (/(hotel|lodge|resort|accommodation|suite)/.test(text)) {
      return 'hospitality';
    }
    if (/(restaurant|cafe|dining|food)/.test(text)) {
      return 'restaurant';
    }
    if (/(shop|store|buy|cart)/.test(text)) {
      return 'ecommerce';
    }
    return 'other';
  }

  private async safeRedisGet(key: string): Promise<string | null> {
    if (!this.redisOperational) {
      return null;
    }

    try {
      return await this.redis.get(key);
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while reading cache. Continuing without cache.',
        );
      } else {
        this.logger.warn(
          `Failed to read Redis key ${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return null;
    }
  }

  private async safeRedisSetex(
    key: string,
    ttlSeconds: number,
    value: string,
  ): Promise<void> {
    if (!this.redisOperational) {
      return;
    }

    try {
      await this.redis.setex(key, ttlSeconds, value);
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while writing cache. Continuing without cache.',
        );
      } else {
        this.logger.warn(
          `Failed to write Redis key ${key}: ${error instanceof Error ? error.message : String(error)}`,
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
    this.logger.warn(`Redis disabled: ${reason}`);
    try {
      this.redis.disconnect();
    } catch {
      // noop
    }
  }
}
