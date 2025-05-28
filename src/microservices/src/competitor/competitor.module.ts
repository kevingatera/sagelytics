import { Module } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { CompetitorController } from './competitor.controller';
import { CompetitorService } from './competitor.service';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import { AgentToolsService } from './services/agent-tools.service';
import { WebsiteModule } from '../website/website.module';
import { ConfigModule } from '@nestjs/config';
import { CompetitorAnalysisService } from './services/competitor-analysis.service';
import { CompetitorDiscoveryService } from './services/competitor-discovery.service';
import { LlmToolsModule } from '../llm-tools/llm-tools.module';

@Module({
  imports: [ConfigModule, WebsiteModule, LlmToolsModule],
  controllers: [CompetitorController],
  providers: [
    CompetitorService,
    ModelManagerService,
    AgentToolsService,
    IntelligentAgentService,
    CompetitorAnalysisService,
    CompetitorDiscoveryService,
    {
      provide: 'AGENT_TOOLS',
      useClass: AgentToolsService,
    },
  ],
  exports: [CompetitorService],
})
export class CompetitorModule {}
