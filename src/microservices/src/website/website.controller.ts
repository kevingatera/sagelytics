import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { WebsiteService } from './website.service';
import type { WebsiteContent } from '../interfaces/website-content.interface';

@Controller()
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @MessagePattern('discover_website_content')
  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    return this.websiteService.discoverWebsiteContent(domain);
  }
} 