import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { WebsiteService } from './website.service';
import { PriceMonitorService } from './services/price-monitor.service';
import { PriceMonitoringWorker } from './services/price-monitoring-worker';
import type { Product, ProductMatch, WebsiteContent } from '@shared/types';

type MonitoringProductRef = {
  id: string;
  name: string;
  url?: string;
  price?: number;
  currency?: string;
};

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
    productUrls?: MonitoringProductRef[];
    userProducts?: MonitoringProductRef[];
    frequency: string;
    enabled: boolean;
  }): Promise<{ taskId: string }> {
    this.logger.log(
      `Creating monitoring task for user ${data.userId} and competitor ${data.competitorDomain}`,
    );

    const productUrls = this.normalizeProductUrls(
      data.productUrls ?? data.userProducts ?? [],
    );

    const taskId = await this.priceMonitoringWorker.addMonitoringTask({
      userId: data.userId,
      competitorDomain: data.competitorDomain,
      productUrls,
      frequency: data.frequency,
      enabled: data.enabled,
    });

    return { taskId };
  }

  @MessagePattern('update_monitoring_task')
  async updateMonitoringTask(data: {
    taskId: string;
    updates: {
      productUrls?: MonitoringProductRef[];
      userProducts?: MonitoringProductRef[];
      frequency?: string;
      enabled?: boolean;
    };
  }): Promise<{ success: boolean }> {
    this.logger.log(`Updating monitoring task ${data.taskId}`);

    const normalizedUpdates: {
      productUrls?: Array<{
        id: string;
        name: string;
        url: string;
        price?: number;
        currency?: string;
      }>;
      frequency?: string;
      enabled?: boolean;
    } = {
      frequency: data.updates.frequency,
      enabled: data.updates.enabled,
    };

    if (data.updates.productUrls || data.updates.userProducts) {
      normalizedUpdates.productUrls = this.normalizeProductUrls(
        data.updates.productUrls ?? data.updates.userProducts ?? [],
      );
    }

    const success = await this.priceMonitoringWorker.updateMonitoringTask(
      data.taskId,
      normalizedUpdates,
    );

    return { success };
  }

  @MessagePattern('remove_monitoring_task')
  async removeMonitoringTask(
    data: { taskId: string },
  ): Promise<{ success: boolean }> {
    this.logger.log(`Removing monitoring task ${data.taskId}`);

    const success = await this.priceMonitoringWorker.removeMonitoringTask(
      data.taskId,
    );

    return { success };
  }

  @MessagePattern('get_user_monitoring_tasks')
  async getUserMonitoringTasks(data: { userId: string }): Promise<{
    tasks: Array<{
      id: string;
      userId: string;
      competitorDomain: string;
      productUrls: Array<{
        id: string;
        name: string;
        url?: string;
        price?: number;
        currency?: string;
      }>;
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
  }> {
    this.logger.log(`Getting monitoring tasks for user ${data.userId}`);

    const tasks = await this.priceMonitoringWorker.getMonitoringTasksForUser(
      data.userId,
    );

    return {
      tasks: tasks.map((task) => {
        const productUrls = task.productUrls.map((product) => ({
          id: product.id,
          name: product.name,
          url: product.url,
          price: product.price,
          currency: product.currency,
        }));

        return {
          id: task.id,
          userId: task.userId,
          competitorDomain: task.competitorDomain,
          productUrls,
          userProducts: productUrls,
          lastRun: task.lastRun ?? new Date(0),
          frequency: task.frequency,
          enabled: task.enabled,
        };
      }),
    };
  }

  private normalizeProductUrls(productUrls: MonitoringProductRef[]): Array<{
    id: string;
    name: string;
    url: string;
    price?: number;
    currency?: string;
  }> {
    return productUrls.map((product) => ({
      id: product.id,
      name: product.name,
      url: product.url ?? '',
      price: product.price,
      currency: product.currency,
    }));
  }
}
