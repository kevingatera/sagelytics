import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('MicroserviceBootstrap');
  logger.log('Starting microservice...');

  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001,
    },
  });

  // Get config service to log environment settings
  const configService = app.get(ConfigService);
  const redisUrl = configService.get('REDIS_URL') || 'redis://localhost:6379';
  const redisDB = configService.get('REDIS_DB') || '0';
  const redisTLS = configService.get('REDIS_TLS') || false;

  logger.log('Microservice configuration:');
  logger.debug({
    transport: 'TCP',
    host: '0.0.0.0',
    port: 3001,
    redis: {
      url: redisUrl.replace(/\/\/(.+):(.+)@/, '//***:***@'), // Mask credentials
      db: redisDB,
      tls: redisTLS,
    },
  });

  await app.listen();
  logger.log('Microservice is listening on port 3001');
}
void bootstrap();
