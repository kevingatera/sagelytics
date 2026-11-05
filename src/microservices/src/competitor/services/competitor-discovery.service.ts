import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compareTwoStrings } from 'string-similarity';
import { Redis, type RedisOptions } from 'ioredis';
import { createHash } from 'crypto';
import type {
  AnalysisResult,
  CompetitorInsight,
  DiscoveryResult,
  Product,
  WebsiteContent,
} from '@shared/types';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { OpenRouterService } from '../../llm-tools/openrouter.service';
import { normalizeDomain, isDenylisted } from '../../common/utils/domain';
import { ValueserpResponse } from '../interfaces/valueserp-response.interface';
import { parseListedPrice } from '../../shared/utils/price-parser';

type CompetitorResearch = Awaited<
  ReturnType<PerplexityService['researchCompetitor']>
>;

type CandidateCompetitor = {
  domain: string;
  source: 'known' | 'perplexity' | 'serp' | 'escalation';
  reason?: string;
  title?: string;
  snippet?: string;
};

type SerpSnippet = {
  domain: string;
  title?: string;
  snippet?: string;
};

type BusinessProfile = {
  domain: string;
  businessType: string;
  region: string;
  userProducts: Product[];
  websiteContent: WebsiteContent;
};

type DiscoveryCostMetrics = {
  valueserpRequestCount: number;
  valueserpEstimatedCostUsd: number;
  perplexityDiscoveryEstimatedCostUsd: number;
  perplexityResearchCalls: number;
  perplexityResearchEstimatedCostUsd: number;
  openAiFilterCostUsd: number;
  openAiEscalationCostUsd: number;
  openrouterFilterCostUsd: number;
  openrouterEscalationCostUsd: number;
  totalEstimatedCostUsd: number;
};

@Injectable()
export class CompetitorDiscoveryService {
  private readonly logger = new Logger(CompetitorDiscoveryService.name);
  private readonly redis: Redis;
  private redisOperational = true;
  private readonly cacheEnabled: boolean;
  private readonly usePerplexity: boolean;

  private static readonly MIN_MATCH_SCORE = 30;
  private static readonly DISCOVERY_CACHE_TTL_SECONDS = 6 * 60 * 60;
  private static readonly RESEARCH_CACHE_TTL_SECONDS = 24 * 60 * 60;
  private static readonly DEFAULT_MAX_COMPETITORS_TO_ENRICH = 3;
  private static readonly MAX_COMPETITORS_TO_ENRICH_CAP = 6;

  private readonly perplexityDiscoveryTimeoutMs: number;
  private readonly valueserpTimeoutMs: number;
  private readonly openRouterFilterTimeoutMs: number;
  private readonly openRouterEscalationTimeoutMs: number;
  private readonly competitorResearchTimeoutMs: number;
  private readonly valueserpCostPerQueryUsd: number;
  private readonly perplexityDiscoveryCostUsd: number;
  private readonly perplexityResearchCostUsd: number;

  constructor(
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly configService: ConfigService,
    private readonly perplexityService: PerplexityService,
    private readonly openRouterService: OpenRouterService,
  ) {
    this.usePerplexity = !!this.configService.get<string>('PERPLEXITY_API_KEY');

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const cacheToggle =
      this.configService.get<string>('ENABLE_COMPETITOR_CACHE', 'true') !==
      'false';
    this.cacheEnabled = nodeEnv !== 'test' && cacheToggle;

    this.perplexityDiscoveryTimeoutMs = this.resolveTimeoutMs(
      'PERPLEXITY_TIMEOUT_MS',
      60000,
      10000,
      120000,
    );
    this.valueserpTimeoutMs = this.resolveTimeoutMs(
      'VALUESERP_TIMEOUT_MS',
      30000,
      10000,
      120000,
    );
    this.openRouterFilterTimeoutMs = this.resolveTimeoutMs(
      'OPENROUTER_FILTER_TIMEOUT_MS',
      45000,
      10000,
      120000,
    );
    this.openRouterEscalationTimeoutMs = this.resolveTimeoutMs(
      'OPENROUTER_ESCALATION_TIMEOUT_MS',
      180000,
      30000,
      300000,
    );
    this.competitorResearchTimeoutMs = this.resolveTimeoutMs(
      'COMPETITOR_RESEARCH_TIMEOUT_MS',
      30000,
      10000,
      120000,
    );
    this.valueserpCostPerQueryUsd = this.resolveCostUsd(
      'VALUESERP_COST_PER_QUERY_USD',
      0.0,
    );
    this.perplexityDiscoveryCostUsd = this.resolveCostUsd(
      'PERPLEXITY_DISCOVERY_COST_USD',
      0.01,
    );
    this.perplexityResearchCostUsd = this.resolveCostUsd(
      'PERPLEXITY_RESEARCH_COST_USD',
      0.01,
    );

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
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: Number(this.configService.get<number>('REDIS_PORT', 6379)),
        ...(redisPassword ? { password: redisPassword } : {}),
        ...(redisUsername ? { username: redisUsername } : {}),
        ...baseOptions,
      });
    }

    this.redis.on('error', (error) => {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed. Progress updates and cache are disabled.',
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
    sessionId?: string | null,
  ): Promise<DiscoveryResult> {
    const userDomain = normalizeDomain(domain);
    const safeKnownCompetitors = Array.isArray(knownCompetitors)
      ? knownCompetitors
      : [];
    const discoveryCacheKey = this.buildDiscoveryCacheKey(
      userDomain,
      businessType,
      safeKnownCompetitors,
      productCatalogUrl,
    );

    this.logger.log(`[TwoStage] Starting competitor discovery for ${userDomain}`);
    const costMetrics: DiscoveryCostMetrics = {
      valueserpRequestCount: 0,
      valueserpEstimatedCostUsd: 0,
      perplexityDiscoveryEstimatedCostUsd: 0,
      perplexityResearchCalls: 0,
      perplexityResearchEstimatedCostUsd: 0,
      openAiFilterCostUsd: 0,
      openAiEscalationCostUsd: 0,
      openrouterFilterCostUsd: 0,
      openrouterEscalationCostUsd: 0,
      totalEstimatedCostUsd: 0,
    };

    const cachedResult = await this.getCachedJson<DiscoveryResult>(
      discoveryCacheKey,
    );
    if (cachedResult) {
      await this.updateProgress(
        sessionId,
        'processing_results',
        95,
        'Using recent competitor analysis results...',
        5,
      );
      return cachedResult;
    }

    await this.updateProgress(
      sessionId,
      'analyzing_domain',
      35,
      `Analyzing your domain: ${userDomain}...`,
      120,
    );

    const profile = await this.buildBusinessProfile(
      userDomain,
      businessType,
      productCatalogUrl,
      costMetrics,
    );

    await this.updateProgress(
      sessionId,
      'discovering_competitors',
      50,
      'Gathering candidates from Perplexity and search results...',
      90,
    );

    const gathered = await this.gatherCandidates(
      profile,
      safeKnownCompetitors,
      sessionId,
      costMetrics,
    );

    const heuristicCandidates = this.applyHeuristicFilter(
      gathered.candidates,
      profile.domain,
    );

    await this.updateProgress(
      sessionId,
      'discovering_competitors',
      65,
      `Filtering ${heuristicCandidates.length} candidate competitors...`,
      70,
    );

    let strictCandidates = await this.strictLlmFilter(
      profile,
      heuristicCandidates,
      gathered.snippets,
      costMetrics,
    );

    strictCandidates = await this.checkEscalation(
      profile,
      strictCandidates,
      heuristicCandidates,
      gathered.snippets,
      costMetrics,
    );

    await this.updateProgress(
      sessionId,
      'analyzing_competitors',
      75,
      `Enriching ${strictCandidates.length} finalists...`,
      45,
    );

    const competitorInsights = await this.enrichFinalists(
      strictCandidates,
      profile,
      sessionId,
      costMetrics,
    );

    const ranked = competitorInsights
      .slice()
      .sort((a, b) => b.matchScore - a.matchScore);

    await this.updateProgress(
      sessionId,
      'processing_results',
      90,
      `Processing ${ranked.length} competitors and finalizing results...`,
      20,
    );

    const result: DiscoveryResult = {
      competitors: ranked,
      recommendedSources: this.getRecommendedSources(profile.businessType),
      userProducts: profile.userProducts,
      searchStrategy: {
        searchType: 'local',
        searchQuery: `${profile.businessType} competitors ${profile.region}`.trim(),
        businessAttributes: {
          size: 'small',
          focus: [],
          onlinePresence: 'moderate',
          businessCategory: profile.businessType,
          serviceType: 'service',
          uniqueFeatures: [],
          targetMarket: [],
          competitiveAdvantages: [],
        },
      } as AnalysisResult,
      stats: {
        totalDiscovered: ranked.length,
        newCompetitors: ranked.length,
        existingCompetitors: 0,
        failedAnalyses: strictCandidates.length - ranked.length,
      },
    };

    await this.setCachedJson(
      discoveryCacheKey,
      result,
      CompetitorDiscoveryService.DISCOVERY_CACHE_TTL_SECONDS,
    );
    costMetrics.totalEstimatedCostUsd = Number(
      (
        costMetrics.valueserpEstimatedCostUsd +
        costMetrics.perplexityDiscoveryEstimatedCostUsd +
        costMetrics.perplexityResearchEstimatedCostUsd +
        costMetrics.openAiFilterCostUsd +
        costMetrics.openAiEscalationCostUsd +
        costMetrics.openrouterFilterCostUsd +
        costMetrics.openrouterEscalationCostUsd
      ).toFixed(6),
    );
    this.logger.log('[TwoStage] API cost summary', costMetrics);

    this.logger.log(
      `[TwoStage] Discovery complete for ${userDomain}. Competitors=${ranked.length}, products=${profile.userProducts.length}`,
    );

    return result;
  }

  private resolveTimeoutMs(
    key: string,
    defaultMs: number,
    minMs: number,
    maxMs: number,
  ): number {
    const configuredRaw = this.configService.get<string>(key);
    const configured = Number(configuredRaw);
    if (!Number.isFinite(configured) || configured <= 0) {
      return defaultMs;
    }

    return Math.min(Math.max(Math.floor(configured), minMs), maxMs);
  }
  private resolveCostUsd(key: string, defaultValue: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return defaultValue;
    }
    return Number(parsed.toFixed(6));
  }

  private addCost(total: number, delta?: number): number {
    return Number((total + (delta ?? 0)).toFixed(6));
  }

  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    context: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
      return (await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(
              new Error(
                `${context} timed out after ${Math.round(timeoutMs / 1000)} seconds`,
              ),
            );
          }, timeoutMs);
        }),
      ])) as T;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async buildBusinessProfile(
    domain: string,
    businessType: string,
    productCatalogUrl: string,
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<BusinessProfile> {
    let websiteContent: WebsiteContent;
    try {
      websiteContent = await this.withTimeout(
        this.websiteDiscovery.discoverWebsiteContent(domain),
        30000,
        `Website discovery for ${domain}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed website discovery for ${domain}: ${error instanceof Error ? error.message : String(error)}`,
      );
      websiteContent = {
        url: domain,
        title: '',
        description: '',
        products: [],
        services: [],
        categories: [],
        keywords: [],
        mainContent: '',
        metadata: {},
      };
    }

    let catalogContent: WebsiteContent | null = null;
    if (productCatalogUrl) {
      try {
        catalogContent = await this.withTimeout(
          this.websiteDiscovery.discoverWebsiteContent(productCatalogUrl),
          30000,
          `Product catalog discovery for ${productCatalogUrl}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed product catalog discovery for ${productCatalogUrl}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const resolvedBusinessType =
      businessType && businessType !== 'other'
        ? businessType
        : this.guessBusinessType(websiteContent);

    const region = this.extractRegion(websiteContent);
    const userProducts = await this.extractUserProducts(
      domain,
      resolvedBusinessType,
      websiteContent,
      catalogContent,
      costMetrics,
    );

    return {
      domain,
      businessType: resolvedBusinessType,
      region,
      userProducts,
      websiteContent,
    };
  }

  private async extractUserProducts(
    domain: string,
    businessType: string,
    websiteContent: WebsiteContent,
    catalogContent: WebsiteContent | null,
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<Product[]> {
    const productsFromWebsite = (websiteContent.products ?? []).map((p) => {
      const derivedPrice =
        p?.price ?? this.extractPriceFromText(`${p?.name ?? ''} ${p?.description ?? ''}`);
      return {
        name: p?.name ?? 'Unknown Product',
        description: p?.description ?? '',
        url: p?.url ?? undefined,
        price: derivedPrice,
        currency: p?.currency ?? (derivedPrice ? 'USD' : undefined),
      } as Product;
    });

    const productsFromCatalog = (catalogContent?.products ?? []).map((p) => {
      const derivedPrice =
        p?.price ?? this.extractPriceFromText(`${p?.name ?? ''} ${p?.description ?? ''}`);
      return {
        name: p?.name ?? 'Unknown Product',
        description: p?.description ?? '',
        url: p?.url ?? undefined,
        price: derivedPrice,
        currency: p?.currency ?? (derivedPrice ? 'USD' : undefined),
      } as Product;
    });

    const sanitized = this.sanitizeProducts([
      ...productsFromWebsite,
      ...productsFromCatalog,
    ]);

    if (sanitized.length > 0 || !this.usePerplexity) {
      return sanitized;
    }

    try {
      const fallback = await this.withTimeout(
        this.researchCompetitorWithCache(
          domain,
          businessType,
          'accommodation rooms and services offered',
          costMetrics,
        ),
        this.competitorResearchTimeoutMs,
        `Fallback user product extraction for ${domain}`,
      );

      const fallbackProducts = fallback.products.map((product) => ({
        name: product.name,
        description: product.description || '',
        url: product.url,
        price: product.price,
        currency: product.currency || 'USD',
      }));

      return this.sanitizeProducts(fallbackProducts);
    } catch (error) {
      this.logger.warn(
        `Fallback product extraction failed for ${domain}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return sanitized;
    }
  }

  private async gatherCandidates(
    profile: BusinessProfile,
    knownCompetitors: string[],
    sessionId?: string | null,
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<{ candidates: CandidateCompetitor[]; snippets: SerpSnippet[] }> {
    const candidates: CandidateCompetitor[] = [];

    for (const known of knownCompetitors) {
      const domain = normalizeDomain(known);
      if (!domain || domain === profile.domain) {
        continue;
      }
      candidates.push({ domain, source: 'known', reason: 'known competitor' });
    }

    const [perplexityResult, valueserpResult] = await Promise.allSettled([
      this.withTimeout(
        this.perplexityService.discoverCompetitors(
          profile.domain,
          profile.businessType,
          profile.region || undefined,
        ),
        this.perplexityDiscoveryTimeoutMs,
        `Perplexity candidate discovery for ${profile.domain}`,
      ),
      this.withTimeout(
        this.fetchValueSerpCandidates(profile),
        this.valueserpTimeoutMs,
        `ValueSERP candidate discovery for ${profile.domain}`,
      ),
    ]);

    if (perplexityResult.status === 'fulfilled') {
      if (costMetrics) {
        costMetrics.perplexityDiscoveryEstimatedCostUsd = Number(
          (costMetrics.perplexityDiscoveryEstimatedCostUsd +
            this.perplexityDiscoveryCostUsd).toFixed(6),
        );
      }
      for (const competitor of perplexityResult.value.competitors ?? []) {
        const domain = normalizeDomain(competitor.domain);
        if (!domain || domain === profile.domain) {
          continue;
        }
        candidates.push({
          domain,
          source: 'perplexity',
          reason: competitor.description || competitor.name,
        });
      }
    } else {
      this.logger.warn(
        `Perplexity candidate discovery failed: ${perplexityResult.reason instanceof Error ? perplexityResult.reason.message : String(perplexityResult.reason)}`,
      );
    }

    let snippets: SerpSnippet[] = [];
    if (valueserpResult.status === 'fulfilled') {
      candidates.push(...valueserpResult.value.candidates);
      snippets = valueserpResult.value.snippets;
      if (costMetrics) {
        costMetrics.valueserpRequestCount += valueserpResult.value.requestCount;
        costMetrics.valueserpEstimatedCostUsd = Number(
          (
            costMetrics.valueserpEstimatedCostUsd +
            valueserpResult.value.requestCount * this.valueserpCostPerQueryUsd
          ).toFixed(6),
        );
      }
    } else {
      this.logger.warn(
        `ValueSERP candidate discovery failed: ${valueserpResult.reason instanceof Error ? valueserpResult.reason.message : String(valueserpResult.reason)}`,
      );
    }

    await this.updateProgress(
      sessionId,
      'discovering_competitors',
      58,
      `Collected ${candidates.length} raw candidate domains...`,
      80,
    );

    const dedupedByDomain = new Map<string, CandidateCompetitor>();
    for (const candidate of candidates) {
      const domain = normalizeDomain(candidate.domain);
      if (!domain || domain === profile.domain) {
        continue;
      }
      if (!dedupedByDomain.has(domain)) {
        dedupedByDomain.set(domain, {
          ...candidate,
          domain,
        });
      }
    }

    return {
      candidates: [...dedupedByDomain.values()],
      snippets,
    };
  }

  private applyHeuristicFilter(
    candidates: CandidateCompetitor[],
    targetDomain: string,
  ): CandidateCompetitor[] {
    return candidates.filter((candidate) => {
      const domain = normalizeDomain(candidate.domain);
      if (!domain) {
        return false;
      }
      if (isDenylisted(domain)) {
        return false;
      }
      if (!this.isValidDomain(domain)) {
        return false;
      }
      if (this.isDomainTooSimilar(domain, targetDomain)) {
        return false;
      }
      return true;
    });
  }

  private async strictLlmFilter(
    profile: BusinessProfile,
    candidates: CandidateCompetitor[],
    snippets: SerpSnippet[],
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<CandidateCompetitor[]> {
    if (candidates.length === 0) {
      return [];
    }

    try {
      // OpenAI is primary; OpenRouter is fallback.
      const filtered = await this.withTimeout(
        this.openRouterService.strictCompetitorFilterViaOpenAi({
          domain: profile.domain,
          businessType: profile.businessType,
          region: profile.region,
          candidates,
          serpSnippets: snippets,
          timeoutMs: this.openRouterFilterTimeoutMs,
        }),
        this.openRouterFilterTimeoutMs,
        `OpenAI strict filter for ${profile.domain}`,
      );
      if (costMetrics) {
        costMetrics.openAiFilterCostUsd = Number(
          (
            costMetrics.openAiFilterCostUsd +
            (filtered.usage.costUsd ?? 0)
          ).toFixed(6),
        );
      }

      const byDomain = new Map(candidates.map((candidate) => [candidate.domain, candidate]));

      return filtered.competitors
        .map((item) => {
          const domain = normalizeDomain(item.domain);
          const base = byDomain.get(domain);
          return {
            domain,
            source: base?.source ?? 'serp',
            title: base?.title,
            snippet: base?.snippet,
            reason: item.reason ?? base?.reason,
          } as CandidateCompetitor;
        })
        .filter((item) => item.domain.length > 0)
        .slice(0, 12);
    } catch (primaryError) {
      this.logger.warn(
        `OpenAI strict filter failed, trying OpenRouter fallback. ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
      );
      const fallbackTimeoutMs = this.getFallbackTimeoutMs(
        this.openRouterFilterTimeoutMs,
        primaryError,
        12000,
      );
      try {
        const filtered = await this.withTimeout(
          this.openRouterService.strictCompetitorFilter({
            domain: profile.domain,
            businessType: profile.businessType,
            region: profile.region,
            candidates,
            serpSnippets: snippets,
            timeoutMs: fallbackTimeoutMs,
          }),
          fallbackTimeoutMs,
          `OpenRouter strict filter for ${profile.domain}`,
        );
        if (costMetrics) {
          costMetrics.openrouterFilterCostUsd = Number(
            (
              costMetrics.openrouterFilterCostUsd +
              (filtered.usage.costUsd ?? 0)
            ).toFixed(6),
          );
        }
        const byDomain = new Map(
          candidates.map((candidate) => [candidate.domain, candidate]),
        );
        return filtered.competitors
          .map((item) => {
            const domain = normalizeDomain(item.domain);
            const base = byDomain.get(domain);
            return {
              domain,
              source: base?.source ?? 'serp',
              title: base?.title,
              snippet: base?.snippet,
              reason: item.reason ?? base?.reason,
            } as CandidateCompetitor;
          })
          .filter((item) => item.domain.length > 0)
          .slice(0, 12);
      } catch (fallbackError) {
        this.logger.warn(
          `Strict filter failed; using heuristic fallback. ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }

      return candidates.slice(0, 6).map((candidate) => ({
        ...candidate,
        reason: candidate.reason ?? 'heuristic fallback',
      }));
    }
  }

  private async checkEscalation(
    profile: BusinessProfile,
    filtered: CandidateCompetitor[],
    heuristicCandidates: CandidateCompetitor[],
    snippets: SerpSnippet[],
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<CandidateCompetitor[]> {
    const thresholdRaw = this.configService.get<string>(
      'DISCOVERY_ESCALATION_THRESHOLD',
      '2',
    );
    const threshold = Number.isFinite(Number(thresholdRaw))
      ? Math.max(1, Math.floor(Number(thresholdRaw)))
      : 2;

    if (filtered.length >= threshold) {
      return filtered;
    }

    this.logger.log(
      `[TwoStage] Escalation triggered for ${profile.domain}: filtered=${filtered.length}, threshold=${threshold}`,
    );

    const escalated = await this.runEscalationSearch(profile, costMetrics);
    if (!escalated) {
      return filtered;
    }

    const pool = new Map<string, CandidateCompetitor>();
    for (const candidate of [...heuristicCandidates, ...filtered]) {
      pool.set(candidate.domain, candidate);
    }

    let addedCount = 0;
    for (const candidate of escalated) {
      const domain = normalizeDomain(candidate.domain);
      if (
        !domain ||
        domain === profile.domain ||
        isDenylisted(domain) ||
        pool.has(domain)
      ) {
        continue;
      }
      pool.set(domain, {
        domain,
        source: 'escalation',
        reason: candidate.reason,
      });
      addedCount += 1;
    }

    // Re-running the strict filter only helps when escalation surfaced domains it has not judged yet.
    if (addedCount === 0) {
      this.logger.log(
        `[TwoStage] Escalation added no new domains for ${profile.domain}; keeping strict set`,
      );
      return filtered;
    }

    return this.strictLlmFilter(
      profile,
      [...pool.values()],
      snippets,
      costMetrics,
    );
  }

  private async runEscalationSearch(
    profile: BusinessProfile,
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<Array<{ domain: string; reason?: string }> | null> {
    try {
      // OpenAI web-search is primary; OpenRouter is fallback.
      const escalation = await this.withTimeout(
        this.openRouterService.webSearchDiscoveryViaOpenAi({
          domain: profile.domain,
          businessType: profile.businessType,
          region: profile.region,
          timeoutMs: this.openRouterEscalationTimeoutMs,
        }),
        this.openRouterEscalationTimeoutMs,
        `OpenAI escalation discovery for ${profile.domain}`,
      );
      if (costMetrics) {
        costMetrics.openAiEscalationCostUsd = this.addCost(
          costMetrics.openAiEscalationCostUsd,
          escalation.usage.costUsd,
        );
      }
      return escalation.competitors;
    } catch (primaryError) {
      this.logger.warn(
        `OpenAI escalation failed, trying OpenRouter fallback. ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
      );
      const fallbackTimeoutMs = this.getFallbackTimeoutMs(
        this.openRouterEscalationTimeoutMs,
        primaryError,
        20000,
      );
      try {
        const escalation = await this.withTimeout(
          this.openRouterService.webSearchDiscovery({
            domain: profile.domain,
            businessType: profile.businessType,
            region: profile.region,
            timeoutMs: fallbackTimeoutMs,
          }),
          fallbackTimeoutMs,
          `OpenRouter escalation discovery for ${profile.domain}`,
        );
        if (costMetrics) {
          costMetrics.openrouterEscalationCostUsd = this.addCost(
            costMetrics.openrouterEscalationCostUsd,
            escalation.usage.costUsd,
          );
        }
        return escalation.competitors;
      } catch (fallbackError) {
        this.logger.warn(
          `Escalation failed, returning initial strict set: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return null;
      }
    }
  }

  private async enrichFinalists(
    finalists: CandidateCompetitor[],
    profile: BusinessProfile,
    sessionId?: string | null,
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<CompetitorInsight[]> {
    const limit = this.resolveMaxCompetitorsToAnalyze();
    const targets = finalists.slice(0, limit);
    const results: CompetitorInsight[] = [];

    for (let index = 0; index < targets.length; index += 1) {
      const candidate = targets[index];
      await this.updateProgress(
        sessionId,
        'analyzing_competitors',
        78 + Math.floor(((index + 1) / Math.max(1, targets.length)) * 10),
        `Analyzing competitor ${index + 1}/${targets.length}: ${candidate.domain}...`,
        35,
      );

      try {
        const research = await this.withTimeout(
          this.researchCompetitorWithCache(
            candidate.domain,
            profile.businessType,
            profile.userProducts[0]?.name || '',
            costMetrics,
          ),
          this.competitorResearchTimeoutMs,
          `Competitor enrichment for ${candidate.domain}`,
        );

        const products = (research.products ?? []).map((product) => ({
          name: product.name,
          url: product.url || null,
          price: product.price ?? null,
          currency: product.currency || 'USD',
          matchedProducts: this.matchProducts(product, profile.userProducts),
          lastUpdated: new Date().toISOString(),
        }));

        const matchedProductCount = products.filter(
          (product) => product.matchedProducts.length > 0,
        ).length;

        let matchScore = 60;
        if (profile.businessType) {
          matchScore += 15;
        }
        matchScore += Math.min(25, matchedProductCount * 5);

        results.push({
          domain: candidate.domain,
          businessName: research.businessName,
          matchScore: Math.min(100, matchScore),
          matchReasons: candidate.reason ? [candidate.reason] : [],
          suggestedApproach: research.insights || '',
          dataGaps: [],
          listingPlatforms: [],
          products,
          monitoringData: {
            productUrls: (research.products ?? [])
              .filter((product) => product.url && product.name)
              .map((product, productIndex) => ({
                id: `${candidate.domain}-${productIndex}`,
                name: product.name,
                url: product.url as string,
                price: product.price,
                currency: product.currency || 'USD',
                category: profile.businessType,
              })),
            lastUpdated: new Date().toISOString(),
            extractionMethod: 'perplexity',
          },
        });
      } catch (error) {
        this.logger.warn(
          `Competitor enrichment failed for ${candidate.domain}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  }

  private async fetchValueSerpCandidates(profile: BusinessProfile): Promise<{
    candidates: CandidateCompetitor[];
    snippets: SerpSnippet[];
    requestCount: number;
  }> {
    const apiKey = this.configService.get<string>('VALUESERP_API_KEY');
    if (!apiKey) {
      return { candidates: [], snippets: [], requestCount: 0 };
    }

    const queries = this.generateValueSerpQueries(profile);
    const searchTypes = this.determineSearchTypes(profile.businessType);
    const candidates: CandidateCompetitor[] = [];
    const snippets: SerpSnippet[] = [];
    let requestCount = 0;

    for (const query of queries) {
      for (const searchType of searchTypes) {
        try {
          const { extractedCandidates, extractedSnippets } =
            await this.fetchValueSerpResults(query, searchType, apiKey);
          candidates.push(...extractedCandidates);
          snippets.push(...extractedSnippets);
          requestCount += 1;
        } catch (error) {
          this.logger.warn(
            `ValueSERP failed for query "${query}" (${searchType}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    const dedupedSnippetDomains = new Set<string>();
    const dedupedSnippets = snippets.filter((snippet) => {
      const key = `${snippet.domain}:${snippet.title ?? ''}`;
      if (dedupedSnippetDomains.has(key)) {
        return false;
      }
      dedupedSnippetDomains.add(key);
      return true;
    });

    return {
      candidates,
      snippets: dedupedSnippets.slice(0, 20),
      requestCount,
    };
  }

  private generateValueSerpQueries(profile: BusinessProfile): string[] {
    const queries = [
      `${profile.businessType} competitors ${profile.region}`.trim(),
      `best ${profile.businessType} near ${profile.region}`.trim(),
      `${profile.businessType} alternatives ${profile.region}`.trim(),
    ].filter((value) => value.length > 0);

    return [...new Set(queries)].slice(0, 3);
  }

  private determineSearchTypes(
    businessType: string,
  ): Array<'local' | 'organic' | 'shopping'> {
    if (['hospitality', 'restaurant', 'healthcare', 'automotive'].includes(businessType)) {
      return ['local', 'organic'];
    }
    if (['ecommerce', 'retail'].includes(businessType)) {
      return ['shopping', 'organic'];
    }
    return ['organic'];
  }

  private async fetchValueSerpResults(
    query: string,
    searchType: 'local' | 'organic' | 'shopping',
    apiKey: string,
  ): Promise<{
    extractedCandidates: CandidateCompetitor[];
    extractedSnippets: SerpSnippet[];
  }> {
    const params = new URLSearchParams({
      api_key: apiKey,
      google_domain: 'google.com',
      gl: 'us',
      hl: 'en',
      q: query,
      num: searchType === 'shopping' ? '15' : '20',
    });

    if (searchType === 'local') {
      params.set('tbm', 'lcl');
    }
    if (searchType === 'shopping') {
      params.set('tbm', 'shop');
    }

    const response = await fetch(`https://api.valueserp.com/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Sagelytics/1.0',
      },
      signal: AbortSignal.timeout(this.valueserpTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ValueSERP error (${response.status}): ${errorBody.slice(0, 180)}`);
    }

    const payload = (await response.json()) as ValueserpResponse;
    const extractedCandidates: CandidateCompetitor[] = [];
    const extractedSnippets: SerpSnippet[] = [];

    for (const result of payload.organic_results ?? []) {
      if (!result.link) {
        continue;
      }
      const domain = normalizeDomain(result.link);
      if (!domain) {
        continue;
      }
      extractedCandidates.push({
        domain,
        source: 'serp',
        title: result.title,
        snippet: result.snippet,
        reason: result.snippet,
      });
      extractedSnippets.push({
        domain,
        title: result.title,
        snippet: result.snippet,
      });
    }

    for (const result of payload.local_results ?? []) {
      if (!result.website) {
        continue;
      }
      const domain = normalizeDomain(result.website);
      if (!domain) {
        continue;
      }
      extractedCandidates.push({
        domain,
        source: 'serp',
        title: result.title,
        snippet: result.snippet,
        reason: result.snippet,
      });
      extractedSnippets.push({
        domain,
        title: result.title,
        snippet: result.snippet,
      });
    }

    for (const result of payload.shopping_results ?? []) {
      if (!result.link) {
        continue;
      }
      const domain = normalizeDomain(result.link);
      if (!domain) {
        continue;
      }
      extractedCandidates.push({
        domain,
        source: 'serp',
        title: result.title,
        snippet: result.snippet,
        reason: result.snippet,
      });
      extractedSnippets.push({
        domain,
        title: result.title,
        snippet: result.snippet,
      });
    }

    return { extractedCandidates, extractedSnippets };
  }

  private resolveMaxCompetitorsToAnalyze(): number {
    const configuredRaw = this.configService.get<string>(
      'COMPETITOR_DISCOVERY_LIMIT',
      `${CompetitorDiscoveryService.DEFAULT_MAX_COMPETITORS_TO_ENRICH}`,
    );
    const configured = Number(configuredRaw);

    if (!Number.isFinite(configured) || configured <= 0) {
      return CompetitorDiscoveryService.DEFAULT_MAX_COMPETITORS_TO_ENRICH;
    }

    return Math.min(
      Math.floor(configured),
      CompetitorDiscoveryService.MAX_COMPETITORS_TO_ENRICH_CAP,
    );
  }

  private buildDiscoveryCacheKey(
    userDomain: string,
    businessType: string,
    knownCompetitors: string[],
    productCatalogUrl: string,
  ): string {
    const payload = {
      version: 1,
      pipeline: 'two_stage',
      userDomain,
      businessType: businessType.toLowerCase().trim(),
      knownCompetitors: [...knownCompetitors]
        .map((item) => normalizeDomain(item))
        .filter(Boolean)
        .sort(),
      productCatalogUrl: this.normalizeUrlForCache(productCatalogUrl),
    };

    const hash = createHash('sha1')
      .update(JSON.stringify(payload))
      .digest('hex');
    return `competitor:discovery:two-stage:${hash}`;
  }

  private buildResearchCacheKey(
    domain: string,
    businessType: string,
    productQuery?: string,
  ): string {
    const payload = {
      version: 1,
      domain: normalizeDomain(domain),
      businessType: businessType.toLowerCase().trim(),
      productQuery: (productQuery ?? '').toLowerCase().trim(),
    };

    const hash = createHash('sha1')
      .update(JSON.stringify(payload))
      .digest('hex');
    return `competitor:research:${hash}`;
  }

  private async researchCompetitorWithCache(
    domain: string,
    businessType: string,
    productQuery?: string,
    costMetrics?: DiscoveryCostMetrics,
  ): Promise<CompetitorResearch> {
    const cacheKey = this.buildResearchCacheKey(
      domain,
      businessType,
      productQuery,
    );

    const cached = await this.getCachedJson<CompetitorResearch>(cacheKey);
    if (cached) {
      return cached;
    }

    if (costMetrics) {
      costMetrics.perplexityResearchCalls += 1;
      costMetrics.perplexityResearchEstimatedCostUsd = this.addCost(
        costMetrics.perplexityResearchEstimatedCostUsd,
        this.perplexityResearchCostUsd,
      );
    }

    const fresh = await this.perplexityService.researchCompetitor(
      domain,
      businessType,
      productQuery,
    );

    await this.setCachedJson(
      cacheKey,
      fresh,
      CompetitorDiscoveryService.RESEARCH_CACHE_TTL_SECONDS,
    );

    return fresh;
  }

  private async getCachedJson<T>(key: string): Promise<T | null> {
    if (!this.cacheEnabled || !this.redisOperational) {
      return null;
    }

    try {
      const raw = await this.redis.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while reading cache. Continuing without cache.',
        );
      }
      return null;
    }
  }

  private async setCachedJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.cacheEnabled || !this.redisOperational) {
      return;
    }

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while writing cache. Continuing without cache.',
        );
      }
    }
  }

  private sanitizeProducts(products: Product[]): Product[] {
    const ignoreNames = new Set([
      'products',
      'services',
      'our products',
      'our services',
      'room types',
      'all rooms',
      'rooms',
    ]);
    const deduped = new Map<string, Product>();

    for (const product of products) {
      const name = (product.name ?? '').trim();
      if (!name) {
        continue;
      }
      if (ignoreNames.has(name.toLowerCase())) {
        continue;
      }

      const key = name.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, {
          ...product,
          name,
          description: product.description?.trim() ?? '',
        });
      }
    }

    return [...deduped.values()];
  }

  private matchProducts(
    competitorProduct: { name?: string; price?: number },
    userProducts: Product[],
  ): Array<{
    name: string;
    url: string | null;
    matchScore: number;
    priceDiff: number | null;
  }> {
    if (!userProducts || userProducts.length === 0) {
      return [];
    }

    const matches: Array<{
      name: string;
      url: string | null;
      matchScore: number;
      priceDiff: number | null;
    }> = [];

    for (const userProduct of userProducts) {
      const matchScore = this.calculateProductMatchScore(
        userProduct.name,
        competitorProduct.name || '',
      );

      if (matchScore >= CompetitorDiscoveryService.MIN_MATCH_SCORE) {
        const priceDiff =
          userProduct.price && competitorProduct.price
            ? ((competitorProduct.price - userProduct.price) / userProduct.price) *
              100
            : null;

        matches.push({
          name: userProduct.name,
          url: userProduct.url || null,
          matchScore: Math.round(matchScore),
          priceDiff,
        });
      }
    }

    return matches;
  }

  private calculateProductMatchScore(
    userProductName: string,
    competitorProductName: string,
  ): number {
    const user = userProductName.toLowerCase().trim();
    const competitor = competitorProductName.toLowerCase().trim();

    if (!user || !competitor) {
      return 0;
    }

    if (user === competitor) {
      return 100;
    }

    const similarity = compareTwoStrings(user, competitor);
    let score = similarity * 60;

    const userTerms = this.extractKeyTerms(user);
    const competitorTerms = this.extractKeyTerms(competitor);
    const totalTerms = Math.max(userTerms.length, competitorTerms.length);
    const overlap = userTerms.filter((term) => competitorTerms.includes(term)).length;
    if (totalTerms > 0) {
      score += (overlap / totalTerms) * 25;
    }

    const keywords = [
      'basic',
      'standard',
      'plus',
      'pro',
      'premium',
      'advanced',
      'enterprise',
      'family',
      'individual',
      'online',
      'desktop',
      'service',
      'software',
      'subscription',
      'bundle',
      'license',
    ];
    if (keywords.some((kw) => user.includes(kw) && competitor.includes(kw))) {
      score += 15;
    }

    return Math.min(Math.round(score), 100);
  }

  private extractKeyTerms(productName: string): string[] {
    const rawTokens = productName
      .replace(/[_()[\],]/g, ' ')
      .split(/\s+/)
      .flatMap((token) => token.match(/[A-Z]?[a-z]+|[0-9]+/g) || []);

    const stopWords = [
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'per',
      'night',
      'person',
      'occupancy',
    ];

    return rawTokens
      .map((term) => term.toLowerCase())
      .filter((term) => term.length > 2 && !stopWords.includes(term));
  }

  private extractPriceFromText(text: string): number | undefined {
    return parseListedPrice(text) ?? undefined;
  }

  private normalizeUrlForCache(url: string): string {
    if (!url) {
      return '';
    }

    try {
      const normalized = new URL(
        url.startsWith('http://') || url.startsWith('https://')
          ? url
          : `https://${url}`,
      );
      normalized.hash = '';
      normalized.search = '';
      return normalized.toString().toLowerCase();
    } catch {
      return url.trim().toLowerCase();
    }
  }

  private getRecommendedSources(businessType: string): string[] {
    if (businessType === 'hospitality') {
      return ['booking.com', 'tripadvisor.com', 'expedia.com'];
    }
    if (businessType === 'software') {
      return ['g2.com', 'capterra.com', 'producthunt.com'];
    }
    if (businessType === 'ecommerce') {
      return ['similarweb.com', 'semrush.com'];
    }
    return [];
  }

  private extractRegion(content: WebsiteContent): string {
    const metadataAddress = content.metadata?.contactInfo?.address;
    if (metadataAddress) {
      return metadataAddress;
    }

    const city = content.metadata?.contactInfo?.city;
    const region = content.metadata?.contactInfo?.region;
    const country = content.metadata?.contactInfo?.country;
    const joined = [city, region, country].filter(Boolean).join(', ');
    if (joined) {
      return joined;
    }

    const text = `${content.title} ${content.description} ${content.mainContent}`.toLowerCase();
    const locationPatterns = [
      /(?:located in|based in|situated in|serving)\s+([^,.\n]+(?:,\s*[^,.\n]+)?)/i,
      /(?:in|at|near)\s+([a-z][a-z\s]+(?:,\s*[a-z][a-z\s]+)?)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return 'United States';
  }

  private guessBusinessType(content: WebsiteContent): string {
    const text = `${content.title} ${content.description} ${content.mainContent}`.toLowerCase();

    if (/(hotel|lodge|resort|accommodation|suite)/.test(text)) {
      return 'hospitality';
    }
    if (/(restaurant|cafe|dining|food)/.test(text)) {
      return 'restaurant';
    }
    if (/(shop|store|buy|cart)/.test(text)) {
      return 'ecommerce';
    }
    if (/(software|saas|platform|app)/.test(text)) {
      return 'software';
    }
    return 'other';
  }

  private isValidDomain(domain: string): boolean {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
      domain,
    );
  }

  private isDomainTooSimilar(domain1: string, domain2: string): boolean {
    const clean1 = normalizeDomain(domain1).split('.')[0];
    const clean2 = normalizeDomain(domain2).split('.')[0];
    return clean1.includes(clean2) || clean2.includes(clean1);
  }

  private getFallbackTimeoutMs(
    defaultTimeoutMs: number,
    primaryError: unknown,
    cappedTimeoutMs: number,
  ): number {
    const message =
      primaryError instanceof Error
        ? primaryError.message.toLowerCase()
        : String(primaryError ?? '').toLowerCase();
    if (
      message.includes('429') ||
      message.includes('quota') ||
      message.includes('rate limit')
    ) {
      return Math.min(defaultTimeoutMs, cappedTimeoutMs);
    }
    return defaultTimeoutMs;
  }

  private async updateProgress(
    sessionId: string | null | undefined,
    step: string,
    percentage: number,
    message: string,
    estimatedTimeRemaining?: number,
  ): Promise<void> {
    if (!sessionId || !this.redisOperational) {
      return;
    }

    const progress = {
      sessionId,
      step,
      percentage: Math.min(100, Math.max(0, percentage)),
      message,
      timestamp: new Date(),
      estimatedTimeRemaining,
    };

    const key = `onboarding:progress:${sessionId}`;
    try {
      await this.redis.setex(key, 600, JSON.stringify(progress));
      await this.redis.publish(`progress:${sessionId}`, JSON.stringify(progress));
    } catch (error) {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while publishing progress updates.',
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
