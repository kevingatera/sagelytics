import { Module } from '@nestjs/common';
import { CompetitorController } from './competitor.controller';
import { CompetitorService } from './competitor.service';
import { CompetitorAnalysisService } from './services/competitor-analysis.service';
import { CompetitorDiscoveryService } from './services/competitor-discovery.service';
import { ModelManagerService } from '../shared/services/model-manager.service';
import { WebsiteModule } from '../website/website.module';

@Module({
  imports: [WebsiteModule],
  controllers: [CompetitorController],
  providers: [
    CompetitorService,
    CompetitorAnalysisService,
    CompetitorDiscoveryService,
    ModelManagerService,
  ],
})
export class CompetitorModule {} 