import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebsiteDiscoveryService } from './website-discovery.service';
import { NotificationService } from '../../notification/notification.service';
import {
  DatabaseService,
  type MonitoringTask,
} from '../../shared/services/database.service';

type MonitoredProduct = MonitoringTask['productUrls'][number];

type NewMonitoringTask = {
  userId: string;
  competitorDomain: string;
  productUrls: MonitoredProduct[];
  frequency: string;
  enabled?: boolean;
  discoverySource?: string;
};

const PRICE_INCREASE_THRESHOLD = 10; // percent
const PRICE_DECREASE_THRESHOLD = -10; // percent

/**
 * Runs persisted competitor price monitoring tasks.
 *
 * Tasks are the rows onboarding creates in sg_monitoring_tasks. Each product URL is a
 * competitor product page, so its price is read from that page and written to
 * sg_price_history. Unknown prices are skipped, never recorded as 0.
 */
@Injectable()
export class PriceMonitoringWorker {
  private readonly logger = new Logger(PriceMonitoringWorker.name);

  constructor(
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly notificationService: NotificationService,
    private readonly database: DatabaseService,
  ) {
    this.logger.log('Price monitoring worker initialized');
  }

  /**
   * Run price monitoring every hour for high-priority tasks
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyMonitoring() {
    this.logger.debug('Running hourly price monitoring');
    await this.runMonitoringTasks('0 * * * *');
  }

  /**
   * Run price monitoring every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyMonitoring() {
    this.logger.debug('Running daily price monitoring');
    await this.runMonitoringTasks('0 0 * * *');
  }

  /**
   * Run monitoring every 6 hours
   */
  @Cron('0 */6 * * *')
  async handleSixHourlyMonitoring() {
    this.logger.debug('Running 6-hourly price monitoring');
    await this.runMonitoringTasks('0 */6 * * *');
  }

  /**
   * Persist a new monitoring task, then run it once for a baseline price.
   * Database errors propagate to the caller; no placeholder task is returned.
   */
  async addMonitoringTask(task: NewMonitoringTask): Promise<string> {
    try {
      const created = await this.database.createMonitoringTask({
        userId: task.userId,
        competitorDomain: task.competitorDomain,
        productUrls: task.productUrls,
        frequency: task.frequency,
        enabled: task.enabled,
        discoverySource: task.discoverySource || 'perplexity',
      });

      this.logger.log(
        `Added monitoring task: ${created.id} for ${task.competitorDomain}`,
      );

      await this.runMonitoringTask(created);

      return created.id;
    } catch (error) {
      this.logger.error(
        `Failed to add monitoring task: ${errorMessage(error)}`,
        errorStack(error),
      );
      throw error;
    }
  }

  /**
   * Remove a monitoring task
   */
  async removeMonitoringTask(taskId: string): Promise<boolean> {
    try {
      await this.database.deleteMonitoringTask(taskId);
      this.logger.log(`Removed monitoring task: ${taskId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to remove monitoring task ${taskId}: ${errorMessage(error)}`,
        errorStack(error),
      );
      return false;
    }
  }

  /**
   * Update a monitoring task
   */
  async updateMonitoringTask(
    taskId: string,
    updates: Partial<
      Pick<MonitoringTask, 'enabled' | 'frequency' | 'productUrls' | 'status'>
    >,
  ): Promise<boolean> {
    try {
      await this.database.updateMonitoringTask(taskId, updates);
      this.logger.log(`Updated monitoring task: ${taskId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update monitoring task ${taskId}: ${errorMessage(error)}`,
        errorStack(error),
      );
      return false;
    }
  }

  /**
   * Get all monitoring tasks for a user
   */
  async getMonitoringTasksForUser(userId: string): Promise<MonitoringTask[]> {
    return this.database.getMonitoringTasksByUser(userId);
  }

  private async runMonitoringTasks(frequency: string): Promise<void> {
    let tasks: MonitoringTask[];
    try {
      tasks = await this.database.getTasksToRun(frequency);
    } catch (error) {
      this.logger.error(
        `Failed to load monitoring tasks for ${frequency}: ${errorMessage(error)}`,
        errorStack(error),
      );
      return;
    }

    this.logger.debug(
      `Running ${tasks.length} monitoring tasks with frequency ${frequency}`,
    );

    for (const task of tasks) {
      await this.runMonitoringTask(task);
    }
  }

  private async runMonitoringTask(task: MonitoringTask): Promise<void> {
    try {
      this.logger.debug(
        `Running monitoring task ${task.id} for ${task.competitorDomain}`,
      );

      for (const product of task.productUrls) {
        await this.monitorProduct(task, product);
      }

      await this.database.updateMonitoringTask(task.id, {
        lastRun: new Date(),
        nextRun: this.calculateNextRun(task.frequency),
        status: 'active',
      });
    } catch (error) {
      this.logger.error(
        `Failed to run monitoring task ${task.id} for ${task.competitorDomain}: ${errorMessage(error)}`,
        errorStack(error),
      );
      await this.database
        .updateMonitoringTask(task.id, { status: 'failed' })
        .catch((statusError: unknown) =>
          this.logger.error(
            `Failed to mark task ${task.id} as failed: ${errorMessage(statusError)}`,
          ),
        );
    }
  }

  /**
   * Read one competitor product page and record its price. A failed fetch or an
   * unreadable price records nothing, so the next run compares against real data.
   */
  private async monitorProduct(
    task: MonitoringTask,
    product: MonitoredProduct,
  ): Promise<void> {
    try {
      const observed = await this.fetchCompetitorPrice(product.url);
      if (!observed) {
        this.logger.debug(
          `No price found for ${product.url} (task ${task.id}); nothing recorded`,
        );
        return;
      }

      const previousPrice = await this.getPreviousPrice(task.id, product.url);
      const changePercentage = this.calculatePriceChange(
        previousPrice,
        observed.price,
      );

      await this.database.createPriceRecord({
        monitoringTaskId: task.id,
        productName: product.name,
        productUrl: product.url,
        price: observed.price,
        currency: observed.currency ?? product.currency ?? 'USD',
        changePercentage,
        previousPrice,
        extractionMethod: 'direct_crawl',
      });

      await this.checkAndTriggerAlert(
        task,
        product,
        changePercentage,
        observed.price,
        previousPrice,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to monitor ${product.url} for task ${task.id}: ${errorMessage(error)}`,
      );
    }
  }

  private async fetchCompetitorPrice(
    productUrl: string,
  ): Promise<{ price: number; currency: string | null } | null> {
    const content = await this.websiteDiscovery.discoverWebsiteContent(productUrl);
    const products = content.products ?? [];
    const target = normalizeUrl(productUrl);
    const match =
      products.find((p) => normalizeUrl(p.url ?? '') === target) ??
      (products.length === 1 ? products[0] : undefined);

    if (!match || typeof match.price !== 'number' || !(match.price > 0)) {
      return null;
    }
    return { price: match.price, currency: match.currency ?? null };
  }

  private async getPreviousPrice(
    monitoringTaskId: string,
    productUrl: string,
  ): Promise<number | null> {
    const latest = await this.database.getLatestPriceForProduct(
      monitoringTaskId,
      productUrl,
    );
    if (!latest || latest.price === null || latest.price === undefined) {
      return null;
    }
    // Postgres numeric columns arrive as strings.
    const value = Number(latest.price);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private calculatePriceChange(
    previousPrice: number | null,
    currentPrice: number | null,
  ): number | null {
    if (!previousPrice || !currentPrice) return null;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  private async checkAndTriggerAlert(
    task: MonitoringTask,
    product: MonitoredProduct,
    changePercentage: number | null,
    currentPrice: number | null,
    previousPrice: number | null,
  ): Promise<void> {
    try {
      if (changePercentage === null || !currentPrice || !previousPrice) return;

      let alertType: string | null = null;
      if (changePercentage >= PRICE_INCREASE_THRESHOLD) {
        alertType = 'price_increase';
      } else if (changePercentage <= PRICE_DECREASE_THRESHOLD) {
        alertType = 'price_decrease';
      }

      if (alertType) {
        const alert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          userId: task.userId,
          monitoringTaskId: task.id,
          alertType,
          thresholdValue: Math.abs(changePercentage),
          thresholdType: 'percentage',
          enabled: true,
          createdAt: new Date(),
        };

        await this.notificationService.sendAlert(alert);

        this.logger.log(
          `Alert triggered for user ${task.userId}: ${alertType} of ${changePercentage.toFixed(2)}% for ${product.name}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check/trigger alert: ${errorMessage(error)}`,
        errorStack(error),
      );
    }
  }

  private calculateNextRun(frequency: string): Date {
    const now = new Date();

    switch (frequency) {
      case '0 * * * *': // Hourly
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '0 */6 * * *': // Every 6 hours
        return new Date(now.getTime() + 6 * 60 * 60 * 1000);
      case '0 0 * * *': // Daily
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
