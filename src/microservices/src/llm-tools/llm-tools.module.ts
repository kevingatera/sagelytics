import { Module } from '@nestjs/common';
import { PerplexityService } from './perplexity.service';
import { OpenRouterService } from './openrouter.service';

@Module({
  providers: [PerplexityService, OpenRouterService],
  exports: [PerplexityService, OpenRouterService],
})
export class LlmToolsModule {}
