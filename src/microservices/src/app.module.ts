import { Logger, Module } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { SharedModule } from '@shared/shared.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompetitorModule } from './competitor/competitor.module';
import { WebsiteModule } from './website/website.module';
import { validateEnv } from './env';
import { SmartCrawlerService } from './website/services/smart-crawler.service';

const logger = new Logger('AppModule');

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
    ClientsModule.registerAsync([
      {
        name: 'WEBSITE_SERVICE',
        useFactory: (configService: ConfigService) => {
          const redisUrl = configService.getOrThrow<string>('REDIS_URL');
          const url = new URL(redisUrl);
          logger.debug(
            `Configuring WEBSITE_SERVICE Redis connection: ${url.hostname}:${url.port}`,
          );
          return {
            transport: Transport.REDIS,
            options: {
              host: url.hostname,
              port: Number(url.port),
              retryAttempts: 5,
              retryDelay: 3000,
            },
          };
        },
        inject: [ConfigService],
      },
      {
        name: 'COMPETITOR_SERVICE',
        useFactory: (configService: ConfigService) => {
          const redisUrl = configService.getOrThrow<string>('REDIS_URL');
          const url = new URL(redisUrl);
          logger.debug(
            `Configuring COMPETITOR_SERVICE Redis connection: ${url.hostname}:${url.port}`,
          );
          return {
            transport: Transport.REDIS,
            options: {
              host: url.hostname,
              port: Number(url.port),
              retryAttempts: 5,
              retryDelay: 3000,
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
    SharedModule,
    CompetitorModule,
    WebsiteModule,
  ],
  controllers: [AppController],
  providers: [AppService, SmartCrawlerService, ModelManagerService],
})
export class AppModule {}

const modelManager = new ModelManagerService(new ConfigService());
logger.debug('Initializing model manager for testing...');
void modelManager
  .getLLM('test')
  .then(() => {
    logger.debug('Model manager initialized successfully');
  })
  .catch((error) => {
    logger.error(
      `Failed to initialize model manager: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
