import { type ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { throwError, timeout } from 'rxjs';
import type {
  BusinessContext,
  CompetitorInsight,
  DiscoveryResult,
  Product,
  ProductMatch,
  WebsiteContent,
} from '@shared/types';
// Relative, because the microservice test suite also compiles this file.
import { catalogHostForLog } from '../log-redaction';

type MonitoringProductRef = {
  id: string;
  name: string;
  url?: string;
  price?: number;
  currency?: string;
};

// These deadlines are safety nets against a stalled microservice. Discovery sends the service an
// absolute deadline DISCOVERY_RESPONSE_GRACE_MS before the TCP timeout. The service starts no
// paid call after it and answers within a few seconds, so the app does not give up first. The
// two-stage pipeline also stops at DISCOVERY_BUDGET_MS (default 65s), which fits under the floor.
const DEFAULT_RESPONSE_TIMEOUT_MS = 600000;
const DEFAULT_DISCOVERY_TIMEOUT_MS = 120000;
const MIN_DISCOVERY_TIMEOUT_MS = 90000;
const DISCOVERY_RESPONSE_GRACE_MS = 10000;

/** Code the microservice puts on a discovery failure that reports its paid call count. */
const DISCOVERY_FAILED_CODE = 'DISCOVERY_FAILED';

/**
 * A discovery the microservice answered with a failure. `paidCallsStarted` is the number of paid
 * provider requests the run dispatched, or null when the service could not say.
 */
export class DiscoveryFailedError extends Error {
  constructor(
    message: string,
    readonly paidCallsStarted: number | null,
  ) {
    super(message);
    this.name = 'DiscoveryFailedError';
  }
}

/**
 * True only when the microservice confirmed that the failed run started no paid call. A transport
 * timeout or any other error leaves the cost unknown, so the usage stays charged.
 */
export function discoveryStartedNoPaidWork(error: unknown): boolean {
  return error instanceof DiscoveryFailedError && error.paidCallsStarted === 0;
}

function toDiscoveryError(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || error instanceof Error) return error;
  const body = error as { code?: unknown; message?: unknown; paidCallsStarted?: unknown };
  if (body.code !== DISCOVERY_FAILED_CODE) return error;
  const paid = body.paidCallsStarted;
  return new DiscoveryFailedError(
    typeof body.message === 'string' ? body.message : 'Competitor discovery failed',
    typeof paid === 'number' && Number.isSafeInteger(paid) && paid >= 0 ? paid : null,
  );
}

function parseTimeoutMs(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export class MicroserviceClient {
  private static instance: MicroserviceClient;
  private client: ClientProxy;
  private readonly responseTimeoutMs: number;
  private readonly discoveryTimeoutMs: number;

  private constructor() {
    this.responseTimeoutMs = parseTimeoutMs(
      process.env.MICROSERVICE_RESPONSE_TIMEOUT_MS,
      DEFAULT_RESPONSE_TIMEOUT_MS,
    );
    this.discoveryTimeoutMs = Math.max(
      parseTimeoutMs(
        process.env.MICROSERVICE_DISCOVERY_TIMEOUT_MS,
        DEFAULT_DISCOVERY_TIMEOUT_MS,
      ),
      MIN_DISCOVERY_TIMEOUT_MS,
    );
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: process.env.MICROSERVICE_HOST ?? 'localhost',
        port: parseInt(process.env.MICROSERVICE_PORT ?? '3001'),
      },
    });
  }

  public static getInstance(): MicroserviceClient {
    if (!MicroserviceClient.instance) {
      MicroserviceClient.instance = new MicroserviceClient();
    }
    return MicroserviceClient.instance;
  }

  /**
   * Sends a request and fails if no response arrives within the deadline. Without this, a stalled
   * microservice would hold the caller indefinitely.
   */
  private send<T>(
    pattern: string,
    data: unknown,
    timeoutMs: number = this.responseTimeoutMs,
  ): Promise<T | undefined> {
    return this.client
      .send<T>(pattern, data)
      .pipe(
        timeout({
          first: timeoutMs,
          with: () =>
            throwError(
              () =>
                new Error(
                  `Microservice ${pattern} did not respond within ${Math.round(timeoutMs / 1000)} seconds`,
                ),
            ),
        }),
      )
      .toPromise();
  }

  async discoverCompetitors(data: {
    domain: string;
    userId: string;
    businessType: string;
    knownCompetitors?: string[];
    productCatalogUrl: string;
    sessionId?: string;
  }): Promise<DiscoveryResult> {
    console.log('[MicroserviceClient] Sending discover_competitors request:', {
      domain: data.domain,
      userId: data.userId,
      businessType: data.businessType,
      knownCompetitorCount: data.knownCompetitors?.length ?? 0,
      hasCatalog: !!data.productCatalogUrl,
      timestamp: new Date().toISOString()
    });

    try {
      const deadlineAt = Date.now() + this.discoveryTimeoutMs - DISCOVERY_RESPONSE_GRACE_MS;
      const result = await this.send<DiscoveryResult>(
        'discover_competitors',
        { ...data, deadlineAt },
        this.discoveryTimeoutMs,
      ).catch((error: unknown) => {
        throw toDiscoveryError(error);
      });

      if (!result) {
        console.error('❌ [MicroserviceClient] No result received from microservice');
        throw new Error('Failed to discover competitors');
      }

      console.log('[MicroserviceClient] Discovery result received:', {
        competitorCount: result.competitors?.length ?? 0,
        userProductCount: result.userProducts?.length ?? 0,
        competitorDomains: result.competitors?.map(c => c.domain) ?? [],
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      // The catalog URL can carry signed tokens, so only its host is logged.
      console.error('[MicroserviceClient] Discovery request failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        paidCallsStarted: error instanceof DiscoveryFailedError ? error.paidCallsStarted : 'unknown',
        domain: data.domain,
        userId: data.userId,
        businessType: data.businessType,
        pipeline: process.env.DISCOVERY_PIPELINE ?? 'service default',
        catalogHost: catalogHostForLog(data.productCatalogUrl),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private sendPaid<T>(pattern: string, data: object, requestedDeadline?: number) {
    const now = Date.now();
    const deadlineAt = Math.min(requestedDeadline ?? now + 45_000, now + this.responseTimeoutMs);
    if (deadlineAt <= now) throw new Error(`Microservice ${pattern} deadline exceeded`);
    return this.send<T>(pattern, { ...data, deadlineAt }, deadlineAt - now);
  }

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
  }, deadlineAt?: number): Promise<CompetitorInsight> {
    const result = await this.sendPaid<CompetitorInsight>('analyze_competitor', data, deadlineAt);

    if (!result) throw new Error('Failed to analyze competitor');
    return result;
  }

  async discoverWebsiteContent(domain: string, deadlineAt?: number): Promise<WebsiteContent> {
    const result = await this.sendPaid<WebsiteContent>('discover_website_content', { url: domain }, deadlineAt);

    if (!result) throw new Error('Failed to discover website content');
    return result;
  }
  
  async monitorCompetitorPrices(data: {
    competitorDomain: string;
    userProducts: Product[];
  }, deadlineAt?: number): Promise<ProductMatch[]> {
    const result = await this.sendPaid<ProductMatch[]>('monitor_competitor_prices', data, deadlineAt);

    if (!result) throw new Error('Failed to monitor competitor prices');
    return result;
  }

  /** Price history for `productUrl` from `userId`'s own monitoring tasks only. */
  async trackPriceHistory(userId: string, productUrl: string): Promise<{
    current: number | null;
    history: Array<{ date: string; price: number; change: number | null }>;
  }> {
    const result = await this.send<{
      current: number | null;
      history: Array<{ date: string; price: number; change: number | null }>;
    }>('track_price_history', { userId, productUrl });

    if (!result) throw new Error('Failed to track price history');
    return result;
  }
  
  /**
   * Create a new price monitoring task
   */
  async createMonitoringTask(data: {
    userId: string;
    competitorDomain: string;
    productUrls?: MonitoringProductRef[];
    userProducts?: MonitoringProductRef[];
    frequency: string;
    enabled: boolean;
  }): Promise<{ taskId: string }> {
    const productUrls = data.productUrls ?? data.userProducts ?? [];
    const result = await this.send<{ taskId: string }>('create_monitoring_task', {
      ...data,
      productUrls,
      userProducts: productUrls,
    });

    if (!result) throw new Error('Failed to create monitoring task');
    return result;
  }
  
  /**
   * Update an existing monitoring task
   */
  async updateMonitoringTask(data: {
    taskId: string;
    updates: {
      productUrls?: MonitoringProductRef[];
      userProducts?: MonitoringProductRef[];
      frequency?: string;
      enabled?: boolean;
    };
  }): Promise<{ success: boolean }> {
    const productUrls =
      data.updates.productUrls ?? data.updates.userProducts ?? undefined;

    const result = await this.send<{ success: boolean }>('update_monitoring_task', {
      ...data,
      updates: {
        ...data.updates,
        productUrls,
        userProducts: productUrls,
      },
    });

    if (!result) throw new Error('Failed to update monitoring task');
    return result;
  }
  
  /**
   * Remove a monitoring task
   */
  async removeMonitoringTask(taskId: string): Promise<{ success: boolean }> {
    const result = await this.send<{ success: boolean }>('remove_monitoring_task', { taskId });

    if (!result) throw new Error('Failed to remove monitoring task');
    return result;
  }
  
  /**
   * Get all monitoring tasks for a user
   */
  async getUserMonitoringTasks(userId: string): Promise<{ 
    tasks: Array<{
      id: string;
      userId: string;
      competitorDomain: string;
      productUrls: Array<{
        id: string;
        name: string;
        url?: string;
        price?: number;
        currency?: string;
      }>;
      userProducts: Array<{
        id: string;
        name: string;
        url?: string;
        price?: number;
        currency?: string;
      }>;
      lastRun: Date;
      frequency: string;
      enabled: boolean;
    }>;
  }> {
    const result = await this.send<{
      tasks: Array<{
        id: string;
        userId: string;
        competitorDomain: string;
        productUrls?: MonitoringProductRef[];
        userProducts?: MonitoringProductRef[];
        lastRun: Date;
        frequency: string;
        enabled: boolean;
      }>;
    }>('get_user_monitoring_tasks', { userId });

    if (!result) throw new Error('Failed to get user monitoring tasks');
    return {
      tasks: result.tasks.map((task) => {
        const productUrls = task.productUrls ?? task.userProducts ?? [];
        return {
          id: task.id,
          userId: task.userId,
          competitorDomain: task.competitorDomain,
          productUrls,
          userProducts: productUrls,
          lastRun: task.lastRun,
          frequency: task.frequency,
          enabled: task.enabled,
        };
      }),
    };
  }
}
