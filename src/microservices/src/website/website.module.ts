import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '@shared/shared.module';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { WebsiteDiscoveryService } from './services/website-discovery.service';
import { SmartCrawlerService } from './services/smart-crawler.service';
import { PriceMonitorService } from './services/price-monitor.service';
import { PriceMonitoringWorker } from './services/price-monitoring-worker';
import { LlmToolsModule } from '../llm-tools/llm-tools.module';
import { CompetitorAnalysisService } from '../competitor/services/competitor-analysis.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    LlmToolsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [WebsiteController],
  providers: [
    WebsiteService,
    WebsiteDiscoveryService,
    SmartCrawlerService,
    PriceMonitorService,
    PriceMonitoringWorker,
    CompetitorAnalysisService,
  ],
  exports: [
    WebsiteService,
    WebsiteDiscoveryService,
    SmartCrawlerService,
    PriceMonitorService,
    PriceMonitoringWorker,
  ],
})
export class WebsiteModule {}
