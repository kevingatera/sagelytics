import { Module } from '@nestjs/common';
import { JsonUtils } from './utils';
import { ModelManagerService } from './services/model-manager.service';

@Module({
  providers: [JsonUtils, ModelManagerService],
  exports: [JsonUtils, ModelManagerService],
})
export class SharedModule {} 