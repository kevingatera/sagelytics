import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceMonitorService } from './price-monitor.service';
import { NotificationService } from '../../notification/notification.service';

// Database imports - we'll use a client to communicate with the Next.js app's database
interface DatabaseClient {
  createMonitoringTask(data: {
    userId: string;
    competitorDomain: string;
    productUrls: Array<{
      id: string;
      name: string;
      url: string;
      price?: number;
      currency?: string;
    }>;
    frequency: string;
    enabled?: boolean;
    discoverySource?: string;
  }): Promise<MonitoringTask>;

  getMonitoringTasksByUser(userId: string): Promise<MonitoringTask[]>;
  getTasksToRun(frequency?: string): Promise<MonitoringTask[]>;
  updateMonitoringTask(
    taskId: string,
    updates: Partial<MonitoringTask>,
  ): Promise<MonitoringTask>;
  deleteMonitoringTask(taskId: string): Promise<void>;
  createPriceRecord(data: {
    monitoringTaskId: string;
    productName: string;
    productUrl: string;
    price?: number | null;
    currency?: string;
    changePercentage?: number | null;
    previousPrice?: number | null;
    extractionMethod?: string;
  }): Promise<void>;
  getLatestPriceForProduct(
    monitoringTaskId: string,
    productUrl: string,
  ): Promise<PriceRecord | null>;
}

interface MonitoringTask {
  id: string;
  userId: string;
  competitorDomain: string;
  productUrls: Array<{
    id: string;
    name: string;
    url: string;
    price?: number;
    currency?: string;
  }>;
  lastRun: Date | null;
  nextRun: Date | null;
  frequency: string; // Cron expression
  enabled: boolean;
  status: string;
  discoverySource: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PriceRecord {
  id: string;
  monitoringTaskId: string;
  productName: string;
  productUrl: string;
  price: number | null;
  currency: string | null;
  recordedAt: Date;
  changePercentage: number | null;
  previousPrice: number | null;
  extractionMethod: string;
}

/**
 * Enhanced price monitoring worker with database persistence
 * Leverages existing Perplexity integration for initial discovery
 * and WebsiteDiscoveryService for ongoing direct monitoring
 */
@Injectable()
export class PriceMonitoringWorker {
  private readonly logger = new Logger(PriceMonitoringWorker.name);
  private dbClient: DatabaseClient | null = null;

  constructor(
    private readonly priceMonitorService: PriceMonitorService,
    private readonly notificationService: NotificationService,
  ) {
    this.logger.log('Enhanced price monitoring worker initialized');
    this.initializeDatabaseClient();
  }

  /**
   * Initialize database client - in a real implementation this would
   * connect to the Next.js app's database through a shared service
   */
  private initializeDatabaseClient() {
    // For now, we'll use a mock client until we set up proper database connection
    // In production, this would connect to the same PostgreSQL database
    this.logger.debug('Database client initialization - using mock for now');
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
   * Add a new monitoring task with database persistence
   */
  async addMonitoringTask(
    task: Omit<
      MonitoringTask,
      'id' | 'lastRun' | 'nextRun' | 'createdAt' | 'updatedAt' | 'status'
    >,
  ): Promise<string> {
    try {
      if (!this.dbClient) {
        // Fallback to in-memory for now
        const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        this.logger.log(
          `Added monitoring task (in-memory): ${id} for ${task.competitorDomain}`,
        );

        // Run initial monitoring to get baseline data
        await this.runInitialMonitoring(task);

        return id;
      }

      const createdTask = await this.dbClient.createMonitoringTask({
        userId: task.userId,
        competitorDomain: task.competitorDomain,
        productUrls: task.productUrls,
        frequency: task.frequency,
        enabled: task.enabled,
        discoverySource: task.discoverySource || 'perplexity',
      });

      this.logger.log(
        `Added monitoring task: ${createdTask.id} for ${task.competitorDomain}`,
      );

      // Run initial monitoring to get baseline data
      await this.runMonitoringTask(createdTask);

      return createdTask.id;
    } catch (error) {
      this.logger.error(
        `Failed to add monitoring task: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Remove a monitoring task
   */
  async removeMonitoringTask(taskId: string): Promise<boolean> {
    try {
      if (!this.dbClient) {
        this.logger.log(`Removed monitoring task (in-memory): ${taskId}`);
        return true;
      }

      await this.dbClient.deleteMonitoringTask(taskId);
      this.logger.log(`Removed monitoring task: ${taskId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to remove monitoring task ${taskId}: ${error.message}`,
        error.stack,
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
      if (!this.dbClient) {
        this.logger.log(`Updated monitoring task (in-memory): ${taskId}`);
        return true;
      }

      await this.dbClient.updateMonitoringTask(taskId, updates);
      this.logger.log(`Updated monitoring task: ${taskId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update monitoring task ${taskId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get all monitoring tasks for a user
   */
  async getMonitoringTasksForUser(userId: string): Promise<MonitoringTask[]> {
    try {
      if (!this.dbClient) {
        // Return empty array for in-memory fallback
        return [];
      }

      return await this.dbClient.getMonitoringTasksByUser(userId);
    } catch (error) {
      this.logger.error(
        `Failed to get monitoring tasks for user ${userId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Run monitoring tasks that match the given frequency
   */
  private async runMonitoringTasks(frequency: string): Promise<void> {
    try {
      if (!this.dbClient) {
        this.logger.debug(
          'Database client not available, skipping scheduled monitoring',
        );
        return;
      }

      const tasksToRun = await this.dbClient.getTasksToRun(frequency);

      this.logger.debug(
        `Running ${tasksToRun.length} monitoring tasks with frequency ${frequency}`,
      );

      for (const task of tasksToRun) {
        await this.runMonitoringTask(task);
      }
    } catch (error) {
      this.logger.error(
        `Failed to run monitoring tasks: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Run initial monitoring for a new task (without database dependency)
   */
  private async runInitialMonitoring(
    task: Omit<
      MonitoringTask,
      'id' | 'lastRun' | 'nextRun' | 'createdAt' | 'updatedAt' | 'status'
    >,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Running initial monitoring for ${task.competitorDomain}`,
      );

      // Use existing price monitoring service to get current prices
      const userProducts = task.productUrls.map((p) => ({
        name: p.name,
        url: p.url,
        price: p.price,
        currency: p.currency,
      }));

      const results = await this.priceMonitorService.monitorCompetitorPrices(
        task.competitorDomain,
        userProducts,
      );

      this.logger.debug(
        `Initial monitoring completed: found ${results.length} matches`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run initial monitoring: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Run a single monitoring task with database persistence
   */
  private async runMonitoringTask(task: MonitoringTask): Promise<void> {
    try {
      this.logger.debug(
        `Running monitoring task ${task.id} for ${task.competitorDomain}`,
      );

      // Convert productUrls to the format expected by the price monitor service
      const userProducts = task.productUrls.map((p) => ({
        name: p.name,
        url: p.url,
        price: p.price,
        currency: p.currency,
      }));

      // Use the existing price monitoring service for direct website crawling
      const results = await this.priceMonitorService.monitorCompetitorPrices(
        task.competitorDomain,
        userProducts,
      );

      // Store price history for each matched product
      for (const result of results) {
        if (result.matchedProducts && result.matchedProducts.length > 0) {
          for (const match of result.matchedProducts) {
            // Get previous price for change calculation
            const previousPrice = await this.getPreviousPrice(
              task.id,
              match.url || '',
            );
            const currentPrice = this.extractPriceFromMatch(match);
            const changePercentage = this.calculatePriceChange(
              previousPrice,
              currentPrice,
            );

            // Store the price record
            await this.storePriceRecord({
              monitoringTaskId: task.id,
              productName: match.name,
              productUrl: match.url || '',
              price: currentPrice,
              currency: 'USD', // Default currency - should be extracted from the match
              changePercentage,
              previousPrice,
              extractionMethod: 'direct_crawl',
            });

            // Check if we should trigger an alert
            await this.checkAndTriggerAlert(
              task,
              match,
              changePercentage,
              currentPrice,
              previousPrice,
            );
          }
        }
      }

      // Update task's last run timestamp and calculate next run
      const nextRun = this.calculateNextRun(task.frequency);
      await this.updateTaskRunInfo(task.id, nextRun);

      this.logger.debug(
        `Monitoring task ${task.id} completed: processed ${results.length} products`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run monitoring task ${task.id} for ${task.competitorDomain}: ${error.message}`,
        error.stack,
      );

      // Mark task as failed
      await this.updateTaskStatus(task.id, 'failed');
    }
  }

  /**
   * Get previous price for a product to calculate change
   */
  private async getPreviousPrice(
    monitoringTaskId: string,
    productUrl: string,
  ): Promise<number | null> {
    try {
      if (!this.dbClient) return null;

      const latestRecord = await this.dbClient.getLatestPriceForProduct(
        monitoringTaskId,
        productUrl,
      );
      return latestRecord?.price || null;
    } catch (error) {
      this.logger.error(`Failed to get previous price: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract price from match result
   */
  private extractPriceFromMatch(match: {
    price?: number;
    [key: string]: unknown;
  }): number | null {
    // This would extract price from the match object
    // Implementation depends on the structure returned by PriceMonitorService
    return match.price || null;
  }

  /**
   * Calculate price change percentage
   */
  private calculatePriceChange(
    previousPrice: number | null,
    currentPrice: number | null,
  ): number | null {
    if (!previousPrice || !currentPrice) return null;

    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  /**
   * Store price record in database
   */
  private async storePriceRecord(data: {
    monitoringTaskId: string;
    productName: string;
    productUrl: string;
    price: number | null;
    currency: string;
    changePercentage: number | null;
    previousPrice: number | null;
    extractionMethod: string;
  }): Promise<void> {
    try {
      if (!this.dbClient) return;

      await this.dbClient.createPriceRecord(data);
    } catch (error) {
      this.logger.error(
        `Failed to store price record: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update task run information
   */
  private async updateTaskRunInfo(
    taskId: string,
    nextRun: Date,
  ): Promise<void> {
    try {
      if (!this.dbClient) return;

      await this.dbClient.updateMonitoringTask(taskId, {
        lastRun: new Date(),
        nextRun,
        status: 'active',
      });
    } catch (error) {
      this.logger.error(
        `Failed to update task run info: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    status: string,
  ): Promise<void> {
    try {
      if (!this.dbClient) return;

      await this.dbClient.updateMonitoringTask(taskId, { status });
    } catch (error) {
      this.logger.error(
        `Failed to update task status: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check if an alert should be triggered and send notification
   */
  private async checkAndTriggerAlert(
    task: MonitoringTask,
    match: { name: string; url?: string | null },
    changePercentage: number | null,
    currentPrice: number | null,
    previousPrice: number | null,
  ): Promise<void> {
    try {
      if (!changePercentage || !currentPrice || !previousPrice) return;

      // Define alert thresholds (in production, these would be configurable per user)
      const PRICE_INCREASE_THRESHOLD = 10; // 10% increase
      const PRICE_DECREASE_THRESHOLD = -10; // 10% decrease

      let alertType: string | null = null;

      if (changePercentage >= PRICE_INCREASE_THRESHOLD) {
        alertType = 'price_increase';
      } else if (changePercentage <= PRICE_DECREASE_THRESHOLD) {
        alertType = 'price_decrease';
      }

      if (alertType) {
        // Create a mock alert object (in production, this would be stored in DB first)
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

        // Send notification
        await this.notificationService.sendAlert(alert);

        this.logger.log(
          `Alert triggered for user ${task.userId}: ${alertType} of ${changePercentage.toFixed(2)}% for ${match.name}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check/trigger alert: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate next run time based on cron frequency
   */
  private calculateNextRun(frequency: string): Date {
    const now = new Date();

    // Simple calculation - in production, use a proper cron parser
    switch (frequency) {
      case '0 * * * *': // Hourly
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '0 */6 * * *': // Every 6 hours
        return new Date(now.getTime() + 6 * 60 * 60 * 1000);
      case '0 0 * * *': // Daily
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour
    }
  }
}
