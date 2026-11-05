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
import { CostLedger, type FlatRateCosts } from './discovery-cost-ledger';
import { Deadline, runWithDeadline } from './discovery-deadline';
import {
  parseDomainVerdicts,
  selectApprovedCandidates,
  type DomainVerdict,
} from './strict-filter-output';

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

/** Explains why a result is degraded or partial. Degraded results get a short cache TTL. */
export type DiscoveryQuality = {
  /** A stage fell back to unverified candidates, or some finalists were not enriched. */
  degraded: boolean;
  /** The discovery budget ran out before every stage finished. */
  partial: boolean;
  confidence: 'normal' | 'low';
  reasons: string[];
  enrichmentFailures: number;
};

export type DiscoveryResultWithQuality = DiscoveryResult & {
  quality: DiscoveryQuality;
};

type DiscoveryRun = {
  deadline: Deadline;
  ledger: CostLedger;
  sessionId?: string | null;
  partialStages: Set<string>;
};

type FilterState = { candidates: CandidateCompetitor[]; degraded: boolean };
type FilterOutcome = { ok: true; candidates: CandidateCompetitor[] } | { ok: false };

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

@Injectable()
export class CompetitorDiscoveryService {
  private readonly logger = new Logger(CompetitorDiscoveryService.name);
  private readonly redis: Redis;
  private redisOperational = true;
  private readonly cacheEnabled: boolean;
  private readonly usePerplexity: boolean;
  // Identical in-flight calls share one promise, so paid work starts once.
  private readonly inFlight = new Map<string, Promise<unknown>>();

  private static readonly MIN_MATCH_SCORE = 30;
  private static readonly DISCOVERY_CACHE_TTL_SECONDS = 6 * 60 * 60;
  private static readonly DEGRADED_CACHE_TTL_SECONDS = 10 * 60;
  private static readonly RESEARCH_CACHE_TTL_SECONDS = 24 * 60 * 60;
  private static readonly DEFAULT_MAX_COMPETITORS_TO_ENRICH = 3;
  private static readonly MAX_COMPETITORS_TO_ENRICH_CAP = 6;
  private static readonly ENRICHMENT_CONCURRENCY = 3;
  private static readonly MAX_APPROVED_CANDIDATES = 12;
  private static readonly DEGRADED_MATCH_SCORE_CAP = 40;
  private static readonly WEBSITE_DISCOVERY_TIMEOUT_MS = 30000;
  private static readonly ENRICHMENT_FAILURE_GAP =
    'Failed to fetch detailed product information';
  private static readonly UNVERIFIED_GAP =
    'Unverified: strict relevance filter unavailable';

  private readonly perplexityDiscoveryTimeoutMs: number;
  private readonly valueserpTimeoutMs: number;
  private readonly openAiFilterTimeoutMs: number;
  private readonly openAiEscalationTimeoutMs: number;
  private readonly openRouterFilterTimeoutMs: number;
  private readonly openRouterEscalationTimeoutMs: number;
  private readonly competitorResearchTimeoutMs: number;
  private readonly discoveryBudgetMs: number;
  private readonly valueserpCostPerQueryUsd: number | null;
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
    this.openAiFilterTimeoutMs = this.resolveTimeoutMs(
      'OPENAI_PRIMARY_FILTER_TIMEOUT_MS',
      60000,
      10000,
      120000,
    );
    this.openAiEscalationTimeoutMs = this.resolveTimeoutMs(
      'OPENAI_PRIMARY_ESCALATION_TIMEOUT_MS',
      180000,
      30000,
      300000,
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
    this.discoveryBudgetMs = this.resolveTimeoutMs(
      'DISCOVERY_BUDGET_MS',
      120000,
      30000,
      300000,
    );
    // ValueSERP has no built-in price. Without configuration its cost is unknown, not zero.
    this.valueserpCostPerQueryUsd = this.resolveOptionalCostUsd(
      'VALUESERP_COST_PER_QUERY_USD',
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
  ): Promise<DiscoveryResultWithQuality> {
    const userDomain = normalizeDomain(domain);
    const safeKnownCompetitors = Array.isArray(knownCompetitors)
      ? knownCompetitors
      : [];
    const cacheKey = this.buildDiscoveryCacheKey(
      userDomain,
      businessType,
      safeKnownCompetitors,
      productCatalogUrl,
    );

    return this.coalesce(cacheKey, () =>
      this.runDiscovery({
        userDomain,
        businessType,
        knownCompetitors: safeKnownCompetitors,
        productCatalogUrl,
        cacheKey,
        sessionId,
      }),
    );
  }

  private async runDiscovery(input: {
    userDomain: string;
    businessType: string;
    knownCompetitors: string[];
    productCatalogUrl: string;
    cacheKey: string;
    sessionId?: string | null;
  }): Promise<DiscoveryResultWithQuality> {
    const {
      userDomain,
      businessType,
      knownCompetitors,
      productCatalogUrl,
      cacheKey,
      sessionId,
    } = input;

    this.logger.log(`[TwoStage] Starting competitor discovery for ${userDomain}`);

    const cachedResult =
      await this.getCachedJson<DiscoveryResultWithQuality>(cacheKey);
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

    const run: DiscoveryRun = {
      deadline: Deadline.root('Discovery budget', this.discoveryBudgetMs),
      ledger: new CostLedger(this.flatRateCosts()),
      sessionId,
      partialStages: new Set<string>(),
    };

    try {
      await this.updateProgress(
        sessionId,
        'analyzing_domain',
        35,
        `Analyzing your domain: ${userDomain}...`,
        120,
      );

      const profile = await this.buildBusinessProfile(
        run,
        userDomain,
        businessType,
        productCatalogUrl,
      );

      await this.updateProgress(
        sessionId,
        'discovering_competitors',
        50,
        'Gathering candidates from Perplexity and search results...',
        90,
      );

      const gathered = await this.gatherCandidates(
        run,
        profile,
        knownCompetitors,
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

      const initial = await this.strictLlmFilter(
        run,
        profile,
        heuristicCandidates,
        gathered.snippets,
      );
      let strict: FilterState = initial.ok
        ? { candidates: initial.candidates, degraded: false }
        : {
            // Heuristic candidates are unverified. They stay marked as degraded throughout.
            candidates: heuristicCandidates.slice(0, 6).map((candidate) => ({
              ...candidate,
              reason: candidate.reason ?? 'heuristic fallback',
            })),
            degraded: true,
          };
      if (strict.degraded) {
        this.logger.warn(
          `[TwoStage] Strict filter unavailable for ${profile.domain}; ${strict.candidates.length} unverified candidates`,
        );
      }

      strict = await this.checkEscalation(
        run,
        profile,
        strict,
        heuristicCandidates,
        gathered.snippets,
      );

      await this.updateProgress(
        sessionId,
        'analyzing_competitors',
        75,
        `Enriching ${strict.candidates.length} finalists...`,
        45,
      );

      const enriched = await this.enrichFinalists(run, strict.candidates, profile);
      const insights = strict.degraded
        ? enriched.insights.map((insight) => this.markUnverified(insight))
        : enriched.insights;
      const ranked = insights
        .slice()
        .sort((a, b) => b.matchScore - a.matchScore);

      await this.updateProgress(
        sessionId,
        'processing_results',
        90,
        `Processing ${ranked.length} competitors and finalizing results...`,
        20,
      );

      const partial = run.partialStages.size > 0;
      const degraded = strict.degraded || enriched.failures > 0 || partial;
      const reasons = [
        ...(strict.degraded ? ['strict_filter_unavailable'] : []),
        ...(enriched.failures > 0
          ? [`enrichment_failed:${enriched.failures}`]
          : []),
        ...[...run.partialStages].map((stage) => `budget_exhausted:${stage}`),
      ];

      const result: DiscoveryResultWithQuality = {
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
          failedAnalyses: enriched.failures,
        },
        quality: {
          degraded,
          partial,
          confidence: degraded ? 'low' : 'normal',
          reasons,
          enrichmentFailures: enriched.failures,
        },
      };

      // Degraded and empty results expire quickly, so a later request can repair them.
      await this.setCachedJson(
        cacheKey,
        result,
        degraded || ranked.length === 0
          ? CompetitorDiscoveryService.DEGRADED_CACHE_TTL_SECONDS
          : CompetitorDiscoveryService.DISCOVERY_CACHE_TTL_SECONDS,
      );
      this.logger.log('[TwoStage] API cost summary', run.ledger.summary());

      this.logger.log(
        `[TwoStage] Discovery complete for ${userDomain}. Competitors=${ranked.length}, products=${profile.userProducts.length}, degraded=${degraded}, partial=${partial}`,
      );

      return result;
    } finally {
      run.deadline.dispose();
    }
  }

  /** Joins an identical in-flight call instead of starting a second paid one. */
  private coalesce<T>(
    key: string,
    factory: () => Promise<T>,
    waiterScope?: Deadline,
  ): Promise<T> {
    let shared = this.inFlight.get(key) as Promise<T> | undefined;
    if (!shared) {
      shared = factory().finally(() => {
        this.inFlight.delete(key);
      });
      this.inFlight.set(key, shared);
    }
    // A joining caller never waits past its own budget.
    return waiterScope ? Promise.race([shared, waiterScope.expiry()]) : shared;
  }

  private flatRateCosts(): FlatRateCosts {
    return {
      valueserp: this.valueserpCostPerQueryUsd,
      perplexity_discovery: this.perplexityDiscoveryCostUsd,
      perplexity_research: this.perplexityResearchCostUsd,
    };
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

  private resolveOptionalCostUsd(key: string): number | null {
    const raw = this.configService.get<string>(key);
    if (raw === undefined || raw.trim() === '') {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0
      ? Number(parsed.toFixed(6))
      : null;
  }

  /** Marks a stage as cut short when it failed because the discovery budget ran out. */
  private noteDeadline(run: DiscoveryRun, stage: string, _error: unknown): void {
    if (run.deadline.expired) {
      run.partialStages.add(stage);
    }
  }

  private async buildBusinessProfile(
    run: DiscoveryRun,
    domain: string,
    businessType: string,
    productCatalogUrl: string,
  ): Promise<BusinessProfile> {
    let websiteContent: WebsiteContent;
    try {
      websiteContent = await runWithDeadline(
        run.deadline,
        CompetitorDiscoveryService.WEBSITE_DISCOVERY_TIMEOUT_MS,
        `Website discovery for ${domain}`,
        () => this.websiteDiscovery.discoverWebsiteContent(domain),
      );
    } catch (error) {
      this.noteDeadline(run, 'website_discovery', error);
      this.logger.warn(
        `Failed website discovery for ${domain}: ${messageOf(error)}`,
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
    if (productCatalogUrl && run.deadline.expired) {
      run.partialStages.add('catalog_discovery');
    } else if (productCatalogUrl) {
      try {
        catalogContent = await runWithDeadline(
          run.deadline,
          CompetitorDiscoveryService.WEBSITE_DISCOVERY_TIMEOUT_MS,
          `Product catalog discovery for ${productCatalogUrl}`,
          () => this.websiteDiscovery.discoverWebsiteContent(productCatalogUrl),
        );
      } catch (error) {
        this.noteDeadline(run, 'catalog_discovery', error);
        this.logger.warn(
          `Failed product catalog discovery for ${productCatalogUrl}: ${messageOf(error)}`,
        );
      }
    }

    const resolvedBusinessType =
      businessType && businessType !== 'other'
        ? businessType
        : this.guessBusinessType(websiteContent);

    const region = this.extractRegion(websiteContent);
    const userProducts = await this.extractUserProducts(
      run,
      domain,
      resolvedBusinessType,
      websiteContent,
      catalogContent,
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
    run: DiscoveryRun,
    domain: string,
    businessType: string,
    websiteContent: WebsiteContent,
    catalogContent: WebsiteContent | null,
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
      const fallback = await this.researchCompetitorWithCache(
        run,
        domain,
        businessType,
        'accommodation rooms and services offered',
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
      this.noteDeadline(run, 'product_fallback', error);
      this.logger.warn(
        `Fallback product extraction failed for ${domain}: ${messageOf(error)}`,
      );
      return sanitized;
    }
  }

  private async gatherCandidates(
    run: DiscoveryRun,
    profile: BusinessProfile,
    knownCompetitors: string[],
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
      runWithDeadline(
        run.deadline,
        this.perplexityDiscoveryTimeoutMs,
        `Perplexity candidate discovery for ${profile.domain}`,
        (scope) =>
          this.perplexityService.discoverCompetitors(
            profile.domain,
            profile.businessType,
            profile.region || undefined,
            {
              signal: scope.signal,
              timeoutMs: scope.remainingMs(),
              onUsage: run.ledger.sink,
            },
          ),
      ),
      this.fetchValueSerpCandidates(run, profile),
    ]);

    if (perplexityResult.status === 'fulfilled') {
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
      this.noteDeadline(run, 'perplexity_discovery', perplexityResult.reason);
      this.logger.warn(
        `Perplexity candidate discovery failed: ${messageOf(perplexityResult.reason)}`,
      );
    }

    let snippets: SerpSnippet[] = [];
    if (valueserpResult.status === 'fulfilled') {
      candidates.push(...valueserpResult.value.candidates);
      snippets = valueserpResult.value.snippets;
    } else {
      this.logger.warn(
        `ValueSERP candidate discovery failed: ${messageOf(valueserpResult.reason)}`,
      );
    }

    await this.updateProgress(
      run.sessionId,
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
    return candidates.filter((candidate) =>
      this.isEligibleCandidate(normalizeDomain(candidate.domain), targetDomain),
    );
  }

  /** The rules every candidate passes before and after the LLM filter. */
  private isEligibleCandidate(domain: string, targetDomain: string): boolean {
    return (
      !!domain &&
      !isDenylisted(domain) &&
      this.isValidDomain(domain) &&
      !this.isDomainTooSimilar(domain, targetDomain)
    );
  }

  private async strictLlmFilter(
    run: DiscoveryRun,
    profile: BusinessProfile,
    candidates: CandidateCompetitor[],
    snippets: SerpSnippet[],
  ): Promise<FilterOutcome> {
    if (candidates.length === 0) {
      return { ok: true, candidates: [] };
    }

    const request = {
      domain: profile.domain,
      businessType: profile.businessType,
      region: profile.region,
      candidates,
      serpSnippets: snippets,
    };
    const isEligible = (domain: string): boolean =>
      this.isEligibleCandidate(domain, profile.domain);
    const limit = CompetitorDiscoveryService.MAX_APPROVED_CANDIDATES;

    try {
      // OpenAI is primary and uses its own timeout. OpenRouter timeouts never apply to it.
      const verdicts = await runWithDeadline(
        run.deadline,
        this.openAiFilterTimeoutMs,
        `OpenAI strict filter for ${profile.domain}`,
        (scope) =>
          this.openRouterService.strictCompetitorFilterViaOpenAi({
            ...request,
            timeoutMs: scope.remainingMs(),
            signal: scope.signal,
            onUsage: run.ledger.sink,
          }),
      );
      return {
        ok: true,
        candidates: selectApprovedCandidates(
          parseDomainVerdicts(verdicts),
          candidates,
          isEligible,
          limit,
        ),
      };
    } catch (primaryError) {
      this.noteDeadline(run, 'strict_filter', primaryError);
      this.logger.warn(
        `OpenAI strict filter failed, trying OpenRouter fallback. ${messageOf(primaryError)}`,
      );
      const fallbackTimeoutMs = this.getFallbackTimeoutMs(
        this.openRouterFilterTimeoutMs,
        primaryError,
        12000,
      );
      try {
        const verdicts = await runWithDeadline(
          run.deadline,
          fallbackTimeoutMs,
          `OpenRouter strict filter for ${profile.domain}`,
          (scope) =>
            this.openRouterService.strictCompetitorFilter({
              ...request,
              timeoutMs: scope.remainingMs(),
              signal: scope.signal,
              onUsage: run.ledger.sink,
            }),
        );
        return {
          ok: true,
          candidates: selectApprovedCandidates(
            parseDomainVerdicts(verdicts),
            candidates,
            isEligible,
            limit,
          ),
        };
      } catch (fallbackError) {
        this.noteDeadline(run, 'strict_filter', fallbackError);
        this.logger.warn(
          `Strict filter failed. ${messageOf(fallbackError)}`,
        );
        return { ok: false };
      }
    }
  }

  private async checkEscalation(
    run: DiscoveryRun,
    profile: BusinessProfile,
    state: FilterState,
    heuristicCandidates: CandidateCompetitor[],
    snippets: SerpSnippet[],
  ): Promise<FilterState> {
    const thresholdRaw = this.configService.get<string>(
      'DISCOVERY_ESCALATION_THRESHOLD',
      '2',
    );
    const threshold = Number.isFinite(Number(thresholdRaw))
      ? Math.max(1, Math.floor(Number(thresholdRaw)))
      : 2;

    if (state.candidates.length >= threshold) {
      return state;
    }
    if (run.deadline.expired) {
      run.partialStages.add('escalation');
      return state;
    }

    this.logger.log(
      `[TwoStage] Escalation triggered for ${profile.domain}: filtered=${state.candidates.length}, threshold=${threshold}`,
    );

    const escalated = await this.runEscalationSearch(run, profile);
    if (!escalated) {
      return state;
    }

    const pool = new Map<string, CandidateCompetitor>();
    for (const candidate of [...heuristicCandidates, ...state.candidates]) {
      pool.set(candidate.domain, candidate);
    }

    let addedCount = 0;
    for (const candidate of escalated) {
      const domain = normalizeDomain(candidate.domain);
      if (
        !domain ||
        pool.has(domain) ||
        !this.isEligibleCandidate(domain, profile.domain)
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
      return state;
    }

    const refiltered = await this.strictLlmFilter(
      run,
      profile,
      [...pool.values()],
      snippets,
    );
    if (!refiltered.ok) {
      // Keep the set that was already approved, including its degraded flag.
      this.logger.warn(
        `[TwoStage] Re-filter failed for ${profile.domain}; keeping the ${state.candidates.length} previously approved candidates`,
      );
      return state;
    }
    return { candidates: refiltered.candidates, degraded: false };
  }

  private async runEscalationSearch(
    run: DiscoveryRun,
    profile: BusinessProfile,
  ): Promise<DomainVerdict[] | null> {
    const request = {
      domain: profile.domain,
      businessType: profile.businessType,
      region: profile.region,
    };

    try {
      // OpenAI web-search is primary and uses its own timeout. OpenRouter is fallback.
      const verdicts = await runWithDeadline(
        run.deadline,
        this.openAiEscalationTimeoutMs,
        `OpenAI escalation discovery for ${profile.domain}`,
        (scope) =>
          this.openRouterService.webSearchDiscoveryViaOpenAi({
            ...request,
            timeoutMs: scope.remainingMs(),
            signal: scope.signal,
            onUsage: run.ledger.sink,
          }),
      );
      return parseDomainVerdicts(verdicts);
    } catch (primaryError) {
      this.noteDeadline(run, 'escalation', primaryError);
      this.logger.warn(
        `OpenAI escalation failed, trying OpenRouter fallback. ${messageOf(primaryError)}`,
      );
      if (run.deadline.expired) {
        return null;
      }
      const fallbackTimeoutMs = this.getFallbackTimeoutMs(
        this.openRouterEscalationTimeoutMs,
        primaryError,
        20000,
      );
      try {
        const verdicts = await runWithDeadline(
          run.deadline,
          fallbackTimeoutMs,
          `OpenRouter escalation discovery for ${profile.domain}`,
          (scope) =>
            this.openRouterService.webSearchDiscovery({
              ...request,
              timeoutMs: scope.remainingMs(),
              signal: scope.signal,
              onUsage: run.ledger.sink,
            }),
        );
        return parseDomainVerdicts(verdicts);
      } catch (fallbackError) {
        this.noteDeadline(run, 'escalation', fallbackError);
        this.logger.warn(
          `Escalation failed, returning initial strict set: ${messageOf(fallbackError)}`,
        );
        return null;
      }
    }
  }

  /**
   * Enriches each finalist with bounded concurrency. A finalist whose enrichment fails or is skipped
   * stays in the result with a failure marker, as the legacy pipeline does.
   */
  private async enrichFinalists(
    run: DiscoveryRun,
    finalists: CandidateCompetitor[],
    profile: BusinessProfile,
  ): Promise<{ insights: CompetitorInsight[]; failures: number }> {
    const limit = this.resolveMaxCompetitorsToAnalyze();
    const targets = finalists.slice(0, limit);
    const insights: CompetitorInsight[] = new Array(targets.length);
    let failures = 0;
    let nextIndex = 0;
    let completed = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < targets.length) {
        const index = nextIndex;
        nextIndex += 1;
        const candidate = targets[index];
        await this.updateProgress(
          run.sessionId,
          'analyzing_competitors',
          78 + Math.floor(((completed + 1) / Math.max(1, targets.length)) * 10),
          `Analyzing competitor ${completed + 1}/${targets.length}: ${candidate.domain}...`,
          35,
        );

        const outcome = await this.enrichCandidate(run, candidate, profile);
        insights[index] = outcome.insight;
        if (outcome.failed) {
          failures += 1;
        }
        completed += 1;
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(CompetitorDiscoveryService.ENRICHMENT_CONCURRENCY, targets.length) },
        () => worker(),
      ),
    );

    return { insights, failures };
  }

  private async enrichCandidate(
    run: DiscoveryRun,
    candidate: CandidateCompetitor,
    profile: BusinessProfile,
  ): Promise<{ insight: CompetitorInsight; failed: boolean }> {
    try {
      const research = await this.researchCompetitorWithCache(
        run,
        candidate.domain,
        profile.businessType,
        profile.userProducts[0]?.name || '',
      );
      return { insight: this.buildInsight(candidate, profile, research), failed: false };
    } catch (error) {
      this.noteDeadline(run, 'enrichment', error);
      this.logger.warn(
        `Competitor enrichment failed for ${candidate.domain}: ${messageOf(error)}`,
      );
      return { insight: this.buildEnrichmentFailureInsight(candidate), failed: true };
    }
  }

  private buildInsight(
    candidate: CandidateCompetitor,
    profile: BusinessProfile,
    research: CompetitorResearch,
  ): CompetitorInsight {
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

    return {
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
    };
  }

  private buildEnrichmentFailureInsight(
    candidate: CandidateCompetitor,
  ): CompetitorInsight {
    return {
      domain: candidate.domain,
      matchScore: 0,
      matchReasons: [],
      suggestedApproach: candidate.reason || '',
      dataGaps: [CompetitorDiscoveryService.ENRICHMENT_FAILURE_GAP],
      listingPlatforms: [],
      products: [],
      monitoringData: {
        productUrls: [],
        lastUpdated: new Date().toISOString(),
        extractionMethod: 'perplexity',
      },
    };
  }

  /** Heuristic-only finalists keep their data but never rank as normal, verified results. */
  private markUnverified(insight: CompetitorInsight): CompetitorInsight {
    return {
      ...insight,
      matchScore: Math.min(
        insight.matchScore,
        CompetitorDiscoveryService.DEGRADED_MATCH_SCORE_CAP,
      ),
      dataGaps: [...insight.dataGaps, CompetitorDiscoveryService.UNVERIFIED_GAP],
    };
  }

  private async fetchValueSerpCandidates(
    run: DiscoveryRun,
    profile: BusinessProfile,
  ): Promise<{ candidates: CandidateCompetitor[]; snippets: SerpSnippet[] }> {
    const apiKey = this.configService.get<string>('VALUESERP_API_KEY');
    if (!apiKey) {
      return { candidates: [], snippets: [] };
    }

    const queries = this.generateValueSerpQueries(profile);
    const searchTypes = this.determineSearchTypes(profile.businessType);
    const requests = queries.flatMap((query) =>
      searchTypes.map((searchType) => ({ query, searchType })),
    );
    const candidates: CandidateCompetitor[] = [];
    const snippets: SerpSnippet[] = [];

    // One stage deadline covers every SERP request. Nothing is dispatched after it passes.
    const stage = run.deadline.child('ValueSERP stage', this.valueserpTimeoutMs);
    try {
      for (const [index, request] of requests.entries()) {
        if (stage.expired) {
          if (run.deadline.expired) {
            run.partialStages.add('valueserp');
          }
          this.logger.warn(
            `ValueSERP stopped at its deadline; ${requests.length - index} requests not sent`,
          );
          break;
        }

        // Recorded at dispatch: a request that later fails or is discarded still counts.
        run.ledger.record({ provider: 'valueserp', operation: 'search' });
        try {
          const { extractedCandidates, extractedSnippets } = await runWithDeadline(
            stage,
            this.valueserpTimeoutMs,
            `ValueSERP ${request.searchType} search`,
            (scope) =>
              this.fetchValueSerpResults(
                request.query,
                request.searchType,
                apiKey,
                scope.signal,
              ),
          );
          candidates.push(...extractedCandidates);
          snippets.push(...extractedSnippets);
        } catch (error) {
          this.noteDeadline(run, 'valueserp', error);
          this.logger.warn(
            `ValueSERP failed for query "${request.query}" (${request.searchType}): ${messageOf(error)}`,
          );
        }
      }
    } finally {
      stage.dispose();
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
    signal: AbortSignal,
  ): Promise<{
    extractedCandidates: CandidateCompetitor[];
    extractedSnippets: SerpSnippet[];
  }> {
    signal.throwIfAborted();

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
      signal,
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
    // Version 2 invalidates entries written before results carried degradation markers.
    const payload = {
      version: 2,
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
    run: DiscoveryRun,
    domain: string,
    businessType: string,
    productQuery?: string,
  ): Promise<CompetitorResearch> {
    const cacheKey = this.buildResearchCacheKey(domain, businessType, productQuery);

    return this.coalesce(
      cacheKey,
      async () => {
        const cached = await this.getCachedJson<CompetitorResearch>(cacheKey);
        if (cached) {
          return cached;
        }

        const fresh = await runWithDeadline(
          run.deadline,
          this.competitorResearchTimeoutMs,
          `Competitor research for ${domain}`,
          (scope) =>
            this.perplexityService.researchCompetitor(
              domain,
              businessType,
              productQuery,
              {
                signal: scope.signal,
                timeoutMs: scope.remainingMs(),
                onUsage: run.ledger.sink,
              },
            ),
        );

        const empty =
          !fresh.businessName &&
          !fresh.insights &&
          (fresh.products ?? []).length === 0;
        await this.setCachedJson(
          cacheKey,
          fresh,
          empty
            ? CompetitorDiscoveryService.DEGRADED_CACHE_TTL_SECONDS
            : CompetitorDiscoveryService.RESEARCH_CACHE_TTL_SECONDS,
        );

        return fresh;
      },
      run.deadline,
    );
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
    const priceRegex = /(?:\$|USD\s*|CAD\s*)?(\d{1,6}(?:[.,]\d{2})?)/i;
    const match = text.match(priceRegex);
    if (!match) {
      return undefined;
    }
    const value = parseFloat(match[1].replace(',', '.'));
    return Number.isNaN(value) ? undefined : value;
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
