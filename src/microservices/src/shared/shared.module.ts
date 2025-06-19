import { Module } from '@nestjs/common';
import { JsonUtils } from './utils';
import { ModelManagerService } from './services/model-manager.service';
import { DatabaseService } from './services/database.service';

@Module({
  providers: [JsonUtils, ModelManagerService, DatabaseService],
  exports: [JsonUtils, ModelManagerService, DatabaseService],
})
export class SharedModule {}
