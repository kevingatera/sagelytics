import { Injectable } from '@nestjs/common';
import { WebsiteDiscoveryService } from './services/website-discovery.service';
import type { WebsiteContent } from './services/website-discovery.service';

@Injectable()
export class WebsiteService {
  constructor(private readonly websiteDiscovery: WebsiteDiscoveryService) {}

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    return this.websiteDiscovery.discoverWebsiteContent(domain);
  }
} 