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
import {
  classifyHttpFailure,
  failureCostUsd,
  isAbortLike,
  isAccountError,
  ProviderError,
  retryAfterHeader,
  toNetworkError,
  type ProviderName,
} from '../../llm-tools/provider-errors';
import {
  usageReporter,
  type ProviderCallOptions,
} from '../../llm-tools/provider-usage';
import { normalizeDomain, isDenylisted } from '../../common/utils/domain';
import { ValueserpResponse } from '../interfaces/valueserp-response.interface';
import { CostLedger, type FlatRateCosts } from './discovery-cost-ledger';
import { Deadline, DeadlineExceededError, runWithDeadline } from './discovery-deadline';
import {
  parseDomainVerdicts,
  selectApprovedCandidates,
  type DomainVerdict,
} from './strict-filter-output';
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

/** Explains why a result is degraded or partial. Degraded results get a short cache TTL. */
export type DiscoveryQuality = {
  /** A stage fell back to unverified candidates, or some finalists were not enriched. */
  degraded: boolean;
  /** The discovery budget ran out before every stage finished. */
  partial: boolean;
  confidence: 'normal' | 'low';
  reasons: string[];
  enrichmentFailures: number;
  /** Providers disabled for the rest of the run after an account error (key rejected or no credit). */
  accountErrors: Array<{ provider: ProviderName; reason: string }>;
};

export type DiscoveryResultWithQuality = DiscoveryResult & {
  quality: DiscoveryQuality;
};

type AccountFailure = { provider: ProviderName; reason: string };

type DiscoveryRun = {
  deadline: Deadline;
  ledger: CostLedger;
  sessionId?: string | null;
  /** Stages cut short by the discovery budget or a stage slice. */
  partialStages: Set<string>;
  /** Stages that failed for a reason other than the budget. */
  failedStages: Set<string>;
  disabledProviders: Map<ProviderName, AccountFailure>;
};

type FilterState = { candidates: CandidateCompetitor[]; degraded: boolean };
type FilterOutcome =
  | { ok: true; candidates: CandidateCompetitor[] }
  | { ok: false; error: unknown };

/** Thrown instead of dispatching to a provider that already returned an account error in this run. */
class ProviderDisabledError extends Error {
  constructor(provider: ProviderName, reason: string) {
    super(`${provider} skipped for this run after an account error (${reason})`);
    this.name = 'ProviderDisabledError';
  }
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isBudgetStop = (error: unknown): boolean =>
  error instanceof DeadlineExceededError || isAbortLike(error);

const isAccountOrDisabled = (error: unknown): boolean =>
  error instanceof ProviderDisabledError || isAccountError(error);

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
  private static readonly DEFAULT_ENRICHMENT_CONCURRENCY = 2;
  private static readonly MAX_APPROVED_CANDIDATES = 12;
  private static readonly DEGRADED_MATCH_SCORE_CAP = 40;
  // Stage slices. Each stage runs under its own child deadline of the discovery budget.
  private static readonly WEBSITE_STAGE_MS = 18000;
  private static readonly CANDIDATE_STAGE_MS = 15000;
  private static readonly STRICT_STAGE_MS = 10000;
  private static readonly ESCALATION_STAGE_MS = 8000;
  // Escalation only starts when this much budget is left, so enrichment keeps 12 s.
  private static readonly ENRICHMENT_RESERVE_MS = 12000;
  // Enrichment stops this long before the budget ends, leaving time to finalize the result.
  private static readonly FINALIZE_RESERVE_MS = 1500;
  private static readonly ESCALATION_MIN_BUDGET_MS =
    CompetitorDiscoveryService.ESCALATION_STAGE_MS +
    CompetitorDiscoveryService.ENRICHMENT_RESERVE_MS;
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
  private readonly enrichmentConcurrency: number;
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
      55000,
      30000,
      300000,
    );
    this.enrichmentConcurrency = this.resolveBoundedInt(
      'COMPETITOR_ENRICHMENT_CONCURRENCY',
      CompetitorDiscoveryService.DEFAULT_ENRICHMENT_CONCURRENCY,
      1,
      6,
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
      failedStages: new Set<string>(),
      disabledProviders: new Map<ProviderName, AccountFailure>(),
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
      if (!initial.ok) {
        this.noteStageFailure(run, 'strict_filter', initial.error, 'Strict filter failed');
      }
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
      const accountErrors = [...run.disabledProviders.values()];
      const degraded =
        strict.degraded ||
        enriched.failures > 0 ||
        partial ||
        run.failedStages.size > 0 ||
        accountErrors.length > 0;
      const reasons = [
        ...(strict.degraded ? ['strict_filter_unavailable'] : []),
        ...(enriched.failures > 0
          ? [`enrichment_failed:${enriched.failures}`]
          : []),
        ...[...run.failedStages].map((stage) => `stage_failed:${stage}`),
        ...[...run.partialStages].map((stage) => `budget_exhausted:${stage}`),
        ...accountErrors.map(
          (failure) => `account_error:${failure.provider}:${failure.reason}`,
        ),
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
          accountErrors,
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

  private resolveBoundedInt(key: string, defaultValue: number, min: number, max: number): number {
    const configured = Number(this.configService.get<string>(key));
    if (!Number.isFinite(configured) || configured <= 0) {
      return defaultValue;
    }
    return Math.min(Math.max(Math.floor(configured), min), max);
  }

  /**
   * Runs one provider call. After an account error the provider is disabled for the rest of the
   * run: later calls are skipped without dispatch, and the account error is logged once.
   */
  private async callProvider<T>(
    run: DiscoveryRun,
    provider: ProviderName,
    task: () => Promise<T>,
  ): Promise<T> {
    const disabled = run.disabledProviders.get(provider);
    if (disabled) {
      throw new ProviderDisabledError(provider, disabled.reason);
    }
    try {
      return await task();
    } catch (error) {
      // Parallel requests can fail together, so only the first account error is recorded and logged.
      if (isAccountError(error) && !run.disabledProviders.has(provider)) {
        const reason = error.reason ?? 'unknown';
        run.disabledProviders.set(provider, { provider, reason });
        this.logger.warn(
          `[TwoStage] ${provider} disabled for this run after an account error (${reason}): ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Records why a stage failed. A stage cut short by the budget is partial. Any other failure is
   * degraded. Account errors were already recorded by callProvider, so they only add debug output.
   */
  private noteStageFailure(
    run: DiscoveryRun,
    stage: string,
    error: unknown,
    context: string,
  ): void {
    if (isAccountOrDisabled(error)) {
      this.logger.debug(`${context}: ${messageOf(error)}`);
      return;
    }
    if (isBudgetStop(error) || run.deadline.expired) {
      run.partialStages.add(stage);
      this.logger.warn(`${context} (budget): ${messageOf(error)}`);
      return;
    }
    run.failedStages.add(stage);
    this.logger.warn(`${context}: ${messageOf(error)}`);
  }

  private async buildBusinessProfile(
    run: DiscoveryRun,
    domain: string,
    businessType: string,
    productCatalogUrl: string,
  ): Promise<BusinessProfile> {
    // The homepage and the optional catalog share one website stage. The catalog gets what is left.
    const websiteStage = run.deadline.child('Website stage', CompetitorDiscoveryService.WEBSITE_STAGE_MS);
    let websiteContent: WebsiteContent;
    let catalogContent: WebsiteContent | null = null;
    try {
      try {
        websiteContent = await runWithDeadline(
          websiteStage,
          CompetitorDiscoveryService.WEBSITE_STAGE_MS,
          `Website discovery for ${domain}`,
          (scope) =>
            this.websiteDiscovery.discoverWebsiteContent(domain, {
              llmDeadlineAt: scope.expiresAt,
              signal: scope.signal,
            }),
        );
      } catch (error) {
        this.noteStageFailure(run, 'website_discovery', error, `Failed website discovery for ${domain}`);
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

      if (productCatalogUrl && websiteStage.expired) {
        run.partialStages.add('catalog_discovery');
      } else if (productCatalogUrl) {
        try {
          catalogContent = await runWithDeadline(
            websiteStage,
            CompetitorDiscoveryService.WEBSITE_STAGE_MS,
            `Product catalog discovery for ${productCatalogUrl}`,
            (scope) =>
              this.websiteDiscovery.discoverWebsiteContent(productCatalogUrl, {
                llmDeadlineAt: scope.expiresAt,
                signal: scope.signal,
              }),
          );
        } catch (error) {
          this.noteStageFailure(
            run,
            'catalog_discovery',
            error,
            `Failed product catalog discovery for ${productCatalogUrl}`,
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
        websiteStage,
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
    } finally {
      websiteStage.dispose();
    }
  }

  private async extractUserProducts(
    run: DiscoveryRun,
    stage: Deadline,
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
        stage,
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
      this.noteStageFailure(
        run,
        'product_fallback',
        error,
        `Fallback product extraction failed for ${domain}`,
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

    const stage = run.deadline.child('Candidate stage', CompetitorDiscoveryService.CANDIDATE_STAGE_MS);
    let perplexityResult: PromiseSettledResult<Awaited<ReturnType<PerplexityService['discoverCompetitors']>>>;
    let valueserpResult: PromiseSettledResult<{ candidates: CandidateCompetitor[]; snippets: SerpSnippet[] }>;
    try {
      [perplexityResult, valueserpResult] = await Promise.allSettled([
        runWithDeadline(
          stage,
          this.perplexityDiscoveryTimeoutMs,
          `Perplexity candidate discovery for ${profile.domain}`,
          (scope) =>
            this.callProvider(run, 'perplexity', () =>
              this.perplexityService.discoverCompetitors(
                profile.domain,
                profile.businessType,
                profile.region || undefined,
                {
                  signal: scope.signal,
                  timeoutMs: scope.remainingMs(),
                  deadlineAt: scope.expiresAt,
                  onUsage: run.ledger.sink,
                },
              ),
            ),
        ),
        this.fetchValueSerpCandidates(run, stage, profile),
      ]);
    } finally {
      stage.dispose();
    }

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
      this.noteStageFailure(
        run,
        'perplexity_discovery',
        perplexityResult.reason,
        'Perplexity candidate discovery failed',
      );
    }

    let snippets: SerpSnippet[] = [];
    if (valueserpResult.status === 'fulfilled') {
      candidates.push(...valueserpResult.value.candidates);
      snippets = valueserpResult.value.snippets;
    } else {
      this.noteStageFailure(
        run,
        'valueserp',
        valueserpResult.reason,
        'ValueSERP candidate discovery failed',
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

    const stage = run.deadline.child('Strict filter stage', CompetitorDiscoveryService.STRICT_STAGE_MS);
    try {
      // OpenAI is primary and uses its own timeout. OpenRouter timeouts never apply to it.
      const verdicts = await runWithDeadline(
        stage,
        this.openAiFilterTimeoutMs,
        `OpenAI strict filter for ${profile.domain}`,
        (scope) =>
          this.callProvider(run, 'openai', () =>
            this.openRouterService.strictCompetitorFilterViaOpenAi({
              ...request,
              timeoutMs: scope.remainingMs(),
              signal: scope.signal,
              onUsage: run.ledger.sink,
            }),
          ),
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
      // Not recorded as a stage failure: the fallback may still succeed. If the stage has run out,
      // the fallback skips and records the stop instead.
      if (!isAccountOrDisabled(primaryError)) {
        this.logger.warn(
          `OpenAI strict filter failed, trying OpenRouter fallback: ${messageOf(primaryError)}`,
        );
      }
      const fallbackTimeoutMs = this.getFallbackTimeoutMs(
        this.openRouterFilterTimeoutMs,
        primaryError,
        12000,
      );
      try {
        const verdicts = await runWithDeadline(
          stage,
          fallbackTimeoutMs,
          `OpenRouter strict filter for ${profile.domain}`,
          (scope) =>
            this.callProvider(run, 'openrouter', () =>
              this.openRouterService.strictCompetitorFilter({
                ...request,
                timeoutMs: scope.remainingMs(),
                signal: scope.signal,
                onUsage: run.ledger.sink,
              }),
            ),
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
        return { ok: false, error: fallbackError };
      }
    } finally {
      stage.dispose();
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
    // Escalation runs only when its slice and the enrichment reserve both fit in the remaining budget.
    const remainingMs = run.deadline.remainingMs();
    if (remainingMs < CompetitorDiscoveryService.ESCALATION_MIN_BUDGET_MS) {
      run.partialStages.add('escalation');
      this.logger.warn(
        `[TwoStage] Escalation skipped for ${profile.domain}: ${remainingMs}ms of budget left`,
      );
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
      // Keep the set that was already approved, including its degraded flag. Only a budget stop is
      // recorded: the approved set was verified, so a failed re-filter does not degrade it.
      if (isBudgetStop(refiltered.error)) {
        run.partialStages.add('strict_filter');
      }
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

    const stage = run.deadline.child(
      'Escalation stage',
      CompetitorDiscoveryService.ESCALATION_STAGE_MS,
    );
    try {
      // OpenAI web-search is primary and uses its own timeout. OpenRouter is fallback.
      try {
        const verdicts = await runWithDeadline(
          stage,
          this.openAiEscalationTimeoutMs,
          `OpenAI escalation discovery for ${profile.domain}`,
          (scope) =>
            this.callProvider(run, 'openai', () =>
              this.openRouterService.webSearchDiscoveryViaOpenAi({
                ...request,
                timeoutMs: scope.remainingMs(),
                signal: scope.signal,
                onUsage: run.ledger.sink,
              }),
            ),
        );
        return parseDomainVerdicts(verdicts);
      } catch (primaryError) {
        if (isBudgetStop(primaryError) || stage.expired) {
          this.noteStageFailure(run, 'escalation', primaryError, 'OpenAI escalation stopped');
          return null;
        }
        if (!isAccountOrDisabled(primaryError)) {
          this.logger.warn(
            `OpenAI escalation failed, trying OpenRouter fallback. ${messageOf(primaryError)}`,
          );
        }
        const fallbackTimeoutMs = this.getFallbackTimeoutMs(
          this.openRouterEscalationTimeoutMs,
          primaryError,
          20000,
        );
        try {
          const verdicts = await runWithDeadline(
            stage,
            fallbackTimeoutMs,
            `OpenRouter escalation discovery for ${profile.domain}`,
            (scope) =>
              this.callProvider(run, 'openrouter', () =>
                this.openRouterService.webSearchDiscovery({
                  ...request,
                  timeoutMs: scope.remainingMs(),
                  signal: scope.signal,
                  onUsage: run.ledger.sink,
                }),
              ),
          );
          return parseDomainVerdicts(verdicts);
        } catch (fallbackError) {
          this.noteStageFailure(
            run,
            'escalation',
            fallbackError,
            'Escalation failed, returning initial strict set',
          );
          return null;
        }
      }
    } finally {
      stage.dispose();
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
    // Enrichment gets the budget that is left, less a reserve for finalizing the result.
    const stage = run.deadline.child(
      'Enrichment stage',
      Math.max(0, run.deadline.remainingMs() - CompetitorDiscoveryService.FINALIZE_RESERVE_MS),
    );

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

        const outcome = await this.enrichCandidate(run, stage, candidate, profile);
        insights[index] = outcome.insight;
        if (outcome.failed) {
          failures += 1;
        }
        completed += 1;
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(this.enrichmentConcurrency, targets.length) },
          () => worker(),
        ),
      );
    } finally {
      stage.dispose();
    }

    return { insights, failures };
  }

  private async enrichCandidate(
    run: DiscoveryRun,
    stage: Deadline,
    candidate: CandidateCompetitor,
    profile: BusinessProfile,
  ): Promise<{ insight: CompetitorInsight; failed: boolean }> {
    try {
      const research = await this.researchCompetitorWithCache(
        run,
        stage,
        candidate.domain,
        profile.businessType,
        profile.userProducts[0]?.name || '',
      );
      return { insight: this.buildInsight(candidate, profile, research), failed: false };
    } catch (error) {
      // A failed finalist is counted in enrichmentFailures. Only a budget stop marks the stage partial.
      if (isBudgetStop(error) || stage.expired) {
        run.partialStages.add('enrichment');
      }
      const message = `Competitor enrichment failed for ${candidate.domain}: ${messageOf(error)}`;
      if (isAccountOrDisabled(error)) {
        this.logger.debug(message);
      } else {
        this.logger.warn(message);
      }
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
    stage: Deadline,
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

    // Requests run in parallel under the candidate stage. Each one is dispatched at most once, and
    // none is dispatched once the stage has expired.
    const settled = await Promise.allSettled(
      requests.map((request) =>
        runWithDeadline(
          stage,
          this.valueserpTimeoutMs,
          `ValueSERP ${request.searchType} search`,
          (scope) =>
            this.callProvider(run, 'valueserp', () =>
              this.fetchValueSerpResults(request.query, request.searchType, apiKey, {
                signal: scope.signal,
                timeoutMs: scope.remainingMs(),
                deadlineAt: scope.expiresAt,
                onUsage: run.ledger.sink,
              }),
            ),
        ),
      ),
    );

    settled.forEach((outcome, index) => {
      const request = requests[index];
      if (outcome.status === 'rejected') {
        this.noteStageFailure(
          run,
          'valueserp',
          outcome.reason,
          `ValueSERP failed for query "${request.query}" (${request.searchType})`,
        );
        return;
      }
      candidates.push(...outcome.value.extractedCandidates);
      snippets.push(...outcome.value.extractedSnippets);
    });

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
    options: ProviderCallOptions & { signal: AbortSignal },
  ): Promise<{
    extractedCandidates: CandidateCompetitor[];
    extractedSnippets: SerpSnippet[];
  }> {
    options.signal.throwIfAborted();
    const report = usageReporter(options, { provider: 'valueserp', operation: 'search' });

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

    let response: Response;
    try {
      response = await fetch(`https://api.valueserp.com/search?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Sagelytics/1.0',
        },
        signal: options.signal,
      });
    } catch (error) {
      const failure = toNetworkError('valueserp', error, options.signal);
      report(failureCostUsd(failure));
      throw failure;
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const failure = classifyHttpFailure(
        'valueserp',
        response.status,
        errorBody,
        retryAfterHeader(response),
      );
      report(failureCostUsd(failure));
      throw failure;
    }

    // A successful response is billed at the configured flat rate.
    report();
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
    stage: Deadline,
    domain: string,
    businessType: string,
    productQuery?: string,
  ): Promise<CompetitorResearch> {
    const cacheKey = this.buildResearchCacheKey(domain, businessType, productQuery);

    return this.coalesce(
      cacheKey,
      async () => {
        // Cache hits return before any dispatch, so they cost nothing.
        const cached = await this.getCachedJson<CompetitorResearch>(cacheKey);
        if (cached) {
          return cached;
        }

        const fresh = await runWithDeadline(
          stage,
          this.competitorResearchTimeoutMs,
          `Competitor research for ${domain}`,
          (scope) =>
            this.callProvider(run, 'perplexity', () =>
              this.perplexityService.researchCompetitor(
                domain,
                businessType,
                productQuery,
                {
                  signal: scope.signal,
                  timeoutMs: scope.remainingMs(),
                  deadlineAt: scope.expiresAt,
                  onUsage: run.ledger.sink,
                },
              ),
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
      stage,
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

  /** A primary that was rate limited, out of quota, or skipped leaves the fallback a shorter cap. */
  private getFallbackTimeoutMs(
    defaultTimeoutMs: number,
    primaryError: unknown,
    cappedTimeoutMs: number,
  ): number {
    const constrained =
      primaryError instanceof ProviderDisabledError ||
      (primaryError instanceof ProviderError &&
        (primaryError.kind === 'rate_limit' || primaryError.kind === 'account'));
    return constrained ? Math.min(defaultTimeoutMs, cappedTimeoutMs) : defaultTimeoutMs;
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
