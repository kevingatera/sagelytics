import { Module } from '@nestjs/common';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { WebsiteDiscoveryService } from './services/website-discovery.service';
import { ModelManagerService } from '@shared/services/model-manager.service';

@Module({
  controllers: [WebsiteController],
  providers: [
    WebsiteService,
    WebsiteDiscoveryService,
    ModelManagerService,
  ],
  exports: [WebsiteDiscoveryService],
})
export class WebsiteModule {} 