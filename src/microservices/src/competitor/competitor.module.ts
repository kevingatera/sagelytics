import { Module } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { CompetitorController } from './competitor.controller';
import { CompetitorService } from './competitor.service';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import { AgentToolsService } from './services/agent-tools.service';
import { WebsiteModule } from '../website/website.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [WebsiteModule, ConfigModule],
  controllers: [CompetitorController],
  providers: [
    CompetitorService,
    ModelManagerService,
    AgentToolsService,
    IntelligentAgentService,
    {
      provide: 'AGENT_TOOLS',
      useFactory: (agentToolsService: AgentToolsService) => ({
        analysis: agentToolsService.analysis,
        navigation: agentToolsService.navigation,
        web: agentToolsService.web,
        search: agentToolsService.search,
      }),
      inject: [AgentToolsService],
    },
  ],
})
export class CompetitorModule {}
