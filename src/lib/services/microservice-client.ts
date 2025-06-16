import { type ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import type { DiscoveryResult, WebsiteContent, BusinessContext, Product, ProductMatch } from '@shared/types';
import type { CompetitorMetadata } from '~/server/db/schema';

export class MicroserviceClient {
  private static instance: MicroserviceClient;
  private client: ClientProxy;

  private constructor() {
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
      const result = await this.client
        .send<DiscoveryResult>('discover_competitors', data)
        .toPromise();

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
  }): Promise<Partial<CompetitorMetadata>> {
    const result = await this.client
      .send<Partial<CompetitorMetadata>>('analyze_competitor', data)
      .toPromise();

    if (!result) throw new Error('Failed to analyze competitor');
    return result;
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    const result = await this.client
      .send<WebsiteContent>('discover_website_content', { url: domain })
      .toPromise();

    if (!result) throw new Error('Failed to discover website content');
    return result;
  }
  
  async monitorCompetitorPrices(data: {
    competitorDomain: string;
    userProducts: Product[];
  }): Promise<ProductMatch[]> {
    const result = await this.client
      .send<ProductMatch[]>('monitor_competitor_prices', data)
      .toPromise();

    if (!result) throw new Error('Failed to monitor competitor prices');
    return result;
  }

  async trackPriceHistory(productUrl: string): Promise<{
    current: number | null;
    history: Array<{ date: string; price: number; change: number | null }>;
  }> {
    const result = await this.client
      .send<{
        current: number | null;
        history: Array<{ date: string; price: number; change: number | null }>;
      }>('track_price_history', { productUrl })
      .toPromise();

    if (!result) throw new Error('Failed to track price history');
    return result;
  }
  
  /**
   * Create a new price monitoring task
   */
  async createMonitoringTask(data: {
    userId: string;
    competitorDomain: string;
    userProducts: Array<{
      id: string;
      name: string;
      url?: string;
      price?: number;
      currency?: string;
    }>;
    frequency: string;
    enabled: boolean;
  }): Promise<{ taskId: string }> {
    const result = await this.client
      .send<{ taskId: string }>('create_monitoring_task', data)
      .toPromise();

    if (!result) throw new Error('Failed to create monitoring task');
    return result;
  }
  
  /**
   * Update an existing monitoring task
   */
  async updateMonitoringTask(data: {
    taskId: string;
    updates: {
      userProducts?: Array<{
        id: string;
        name: string;
        url?: string;
        price?: number;
        currency?: string;
      }>;
      frequency?: string;
      enabled?: boolean;
    };
  }): Promise<{ success: boolean }> {
    const result = await this.client
      .send<{ success: boolean }>('update_monitoring_task', data)
      .toPromise();

    if (!result) throw new Error('Failed to update monitoring task');
    return result;
  }
  
  /**
   * Remove a monitoring task
   */
  async removeMonitoringTask(taskId: string): Promise<{ success: boolean }> {
    const result = await this.client
      .send<{ success: boolean }>('remove_monitoring_task', { taskId })
      .toPromise();

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
    const result = await this.client
      .send<{ 
        tasks: Array<{
          id: string;
          userId: string;
          competitorDomain: string;
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
      }>('get_user_monitoring_tasks', { userId })
      .toPromise();

    if (!result) throw new Error('Failed to get user monitoring tasks');
    return result;
  }
}
