import { Module } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { CompetitorController } from './competitor.controller';
import { CompetitorService } from './competitor.service';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import { AgentToolsService } from './services/agent-tools.service';
import { WebsiteModule } from '../website/website.module';

@Module({
  imports: [WebsiteModule],
  controllers: [CompetitorController],
  providers: [
    CompetitorService,
    IntelligentAgentService,
    AgentToolsService,
    ModelManagerService,
  ],
})
export class CompetitorModule {} 