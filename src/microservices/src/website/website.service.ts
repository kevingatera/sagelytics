import { Injectable } from '@nestjs/common';
import { WebsiteDiscoveryService } from './services/website-discovery.service';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import type { WebsiteContent } from '@shared/types';

@Injectable()
export class WebsiteService {
  constructor(
    private readonly websiteDiscoveryService: WebsiteDiscoveryService,
    private readonly configService: ConfigService,
  ) {}

  static getOptions(configService: ConfigService) {
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
  }

  async onModuleInit() {
    // Initialize microservice-specific setup
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    return this.websiteDiscoveryService.discoverWebsiteContent(domain);
  }
}

// Bootstrap the microservice if running standalone
async function bootstrap() {
  const { NestFactory } = await import('@nestjs/core');
  const { WebsiteModule } = await import('./website.module');
  const { ConfigService } = await import('@nestjs/config');

  const app = await NestFactory.createMicroservice(
    WebsiteModule,
    WebsiteService.getOptions(new ConfigService()),
  );
  await app.listen();
}

if (require.main === module) {
  void bootstrap();
}
