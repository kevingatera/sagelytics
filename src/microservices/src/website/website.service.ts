import { Injectable } from '@nestjs/common';
import { WebsiteDiscoveryService } from './services/website-discovery.service';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import type { WebsiteContent } from '../interfaces/website-content.interface';

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
if (require.main === module) {
  // Use dynamic imports to avoid top-level import issues
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
  void bootstrap();
} 