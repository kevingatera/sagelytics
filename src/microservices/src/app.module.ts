import { Module } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { SharedModule } from '@shared/shared.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompetitorModule } from './competitor/competitor.module';
import { WebsiteModule } from './website/website.module';
import { validateEnv } from './env';

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
  providers: [AppService],
})
export class AppModule {}

const modelManager = new ModelManagerService(new ConfigService());
modelManager.getLLM("test");
