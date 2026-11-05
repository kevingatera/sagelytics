import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('MicroserviceBootstrap');
  logger.log('Starting microservice...');

  // ConfigModule has already loaded .env into process.env at import time, so the
  // listen address can be read before the app is created.
  const host = process.env.MICROSERVICE_HOST ?? '127.0.0.1';
  const port = Number(process.env.MICROSERVICE_PORT ?? '3001');

  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      host,
      port,
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
    host,
    port,
    redis: {
      url: redisUrl.replace(/\/\/(.+):(.+)@/, '//***:***@'), // Mask credentials
      db: redisDB,
      tls: redisTLS,
    },
  });

  await app.listen();
  logger.log(`Microservice is listening on ${host}:${port}`);
}
void bootstrap();
