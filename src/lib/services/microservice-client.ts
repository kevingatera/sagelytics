import { type ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import type { DiscoveryResult } from '../../types/competitor';
import type { WebsiteContent } from '../../types/website';
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
  }): Promise<DiscoveryResult> {
    const result = await this.client
      .send<DiscoveryResult>('discover_competitors', data)
      .toPromise();

    if (!result) throw new Error('Failed to discover competitors');
    return result;
  }

  async analyzeCompetitor(data: { 
    competitorDomain: string; 
    businessContext: { 
      userId: string; 
    } 
  }): Promise<Partial<CompetitorMetadata>> {
    const result = await this.client
      .send<Partial<CompetitorMetadata>>('analyze_competitor', data)
      .toPromise();

    if (!result) throw new Error('Failed to analyze competitor');
    return result;
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    const result = await this.client
      .send<WebsiteContent>('discover_website_content', domain)
      .toPromise();

    if (!result) throw new Error('Failed to discover website content');
    return result;
  }
}
