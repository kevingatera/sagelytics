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

type MonitoringProductRef = {
  id: string;
  name: string;
  url?: string;
  price?: number;
  currency?: string;
};

// These deadlines are safety nets against a stalled microservice. Legacy discovery has no budget
// and can run for minutes, so the defaults stay generous. The two-stage pipeline finishes well
// inside DISCOVERY_BUDGET_MS (default 120s) and never reaches these limits.
const DEFAULT_RESPONSE_TIMEOUT_MS = 600000;
const DEFAULT_DISCOVERY_TIMEOUT_MS = 900000;

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
    this.discoveryTimeoutMs = parseTimeoutMs(
      process.env.MICROSERVICE_DISCOVERY_TIMEOUT_MS,
      DEFAULT_DISCOVERY_TIMEOUT_MS,
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
      const result = await this.send<DiscoveryResult>(
        'discover_competitors',
        data,
        this.discoveryTimeoutMs,
      );

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
      console.error('[MicroserviceClient] Discovery request failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestData: data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
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
  }): Promise<CompetitorInsight> {
    const result = await this.send<CompetitorInsight>('analyze_competitor', data);

    if (!result) throw new Error('Failed to analyze competitor');
    return result;
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    const result = await this.send<WebsiteContent>('discover_website_content', { url: domain });

    if (!result) throw new Error('Failed to discover website content');
    return result;
  }
  
  async monitorCompetitorPrices(data: {
    competitorDomain: string;
    userProducts: Product[];
  }): Promise<ProductMatch[]> {
    const result = await this.send<ProductMatch[]>('monitor_competitor_prices', data);

    if (!result) throw new Error('Failed to monitor competitor prices');
    return result;
  }

  async trackPriceHistory(productUrl: string): Promise<{
    current: number | null;
    history: Array<{ date: string; price: number; change: number | null }>;
  }> {
    const result = await this.send<{
      current: number | null;
      history: Array<{ date: string; price: number; change: number | null }>;
    }>('track_price_history', { productUrl });

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
