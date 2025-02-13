import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { WebsiteService } from './website.service';
import type { WebsiteContent } from './services/website-discovery.service';

@Controller()
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @MessagePattern('discover_website_content')
  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    return this.websiteService.discoverWebsiteContent(domain);
  }
} 