import { Module } from '@nestjs/common';
import { JsonUtils } from './utils';

@Module({
  providers: [JsonUtils],
  exports: [JsonUtils],
})
export class SharedModule {} 