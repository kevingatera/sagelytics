import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { WebsiteService } from './website.service';
import { PriceMonitorService } from './services/price-monitor.service';
import { PriceMonitoringWorker } from './services/price-monitoring-worker';
import type { Product, ProductMatch, WebsiteContent } from '@shared/types';

@Controller()
export class WebsiteController {
  private readonly logger = new Logger(WebsiteController.name);

  constructor(
    private readonly websiteService: WebsiteService,
    private readonly priceMonitorService: PriceMonitorService,
    private readonly priceMonitoringWorker: PriceMonitoringWorker,
  ) {}

  @MessagePattern('discover_website_content')
  async discoverWebsiteContent(data: { url: string }): Promise<WebsiteContent> {
    this.logger.debug(
      `Received 'discover_website_content' for URL: ${data.url}`,
    );
    return await this.websiteService.discoverWebsiteContent(data.url);
  }

  @MessagePattern('monitor_competitor_prices')
  async monitorCompetitorPrices(data: {
    competitorDomain: string;
    userProducts: Product[];
  }): Promise<ProductMatch[]> {
    this.logger.log(`Monitoring prices for ${data.competitorDomain}`);
    return await this.priceMonitorService.monitorCompetitorPrices(
      data.competitorDomain,
      data.userProducts,
    );
  }

  @MessagePattern('track_price_history')
  async trackPriceHistory(data: { productUrl: string }) {
    this.logger.log(`Tracking price history for ${data.productUrl}`);
    return await this.priceMonitorService.trackPriceHistory(data.productUrl);
  }

  @MessagePattern('create_monitoring_task')
  async createMonitoringTask(data: {
    userId: string;
    competitorDomain: string;
    userProducts: Array<{
      id: string;
      name: string;
      url?: string;
      price?: number;
      currency?: string;
    }>;
    frequency: string;
    enabled: boolean;
  }): Promise<{ taskId: string }> {
    this.logger.log(
      `Creating monitoring task for user ${data.userId} and competitor ${data.competitorDomain}`,
    );

    const taskId = await this.priceMonitoringWorker.addMonitoringTask({
      userId: data.userId,
      competitorDomain: data.competitorDomain,
      userProducts: data.userProducts,
      frequency: data.frequency,
      enabled: data.enabled,
    });

    return { taskId };
  }

  @MessagePattern('update_monitoring_task')
  updateMonitoringTask(data: {
    taskId: string;
    updates: {
      userProducts?: Array<{
        id: string;
        name: string;
        url?: string;
        price?: number;
        currency?: string;
      }>;
      frequency?: string;
      enabled?: boolean;
    };
  }): { success: boolean } {
    this.logger.log(`Updating monitoring task ${data.taskId}`);

    const success = this.priceMonitoringWorker.updateMonitoringTask(
      data.taskId,
      data.updates,
    );

    return { success };
  }

  @MessagePattern('remove_monitoring_task')
  removeMonitoringTask(data: { taskId: string }): { success: boolean } {
    this.logger.log(`Removing monitoring task ${data.taskId}`);

    const success = this.priceMonitoringWorker.removeMonitoringTask(
      data.taskId,
    );

    return { success };
  }

  @MessagePattern('get_user_monitoring_tasks')
  getUserMonitoringTasks(data: { userId: string }): {
    tasks: Array<{
      id: string;
      userId: string;
      competitorDomain: string;
      userProducts: Array<{
        id: string;
        name: string;
        url?: string;
        price?: number;
        currency?: string;
      }>;
      lastRun: Date;
      frequency: string;
      enabled: boolean;
    }>;
  } {
    this.logger.log(`Getting monitoring tasks for user ${data.userId}`);

    const tasks = this.priceMonitoringWorker.getMonitoringTasksForUser(
      data.userId,
    );

    return { tasks };
  }
}
