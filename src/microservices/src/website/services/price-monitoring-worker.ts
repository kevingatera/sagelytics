import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceMonitorService } from './price-monitor.service';

interface MonitoringTask {
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
  frequency: string; // Cron expression
  enabled: boolean;
}

/**
 * This service handles scheduled price monitoring tasks
 * In a production implementation, this would be connected to a database
 * to store and retrieve monitoring tasks
 */
@Injectable()
export class PriceMonitoringWorker {
  private readonly logger = new Logger(PriceMonitoringWorker.name);
  private monitoringTasks: MonitoringTask[] = [];

  constructor(private readonly priceMonitorService: PriceMonitorService) {
    this.logger.log('Price monitoring worker initialized');
  }

  /**
   * Run price monitoring every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyMonitoring() {
    this.logger.debug('Running hourly price monitoring');
    await this.runMonitoringTasks('0 * * * *');
  }

  /**
   * Run price monitoring every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyMonitoring() {
    this.logger.debug('Running daily price monitoring');
    await this.runMonitoringTasks('0 0 * * *');
  }

  /**
   * Add a new monitoring task
   */
  async addMonitoringTask(
    task: Omit<MonitoringTask, 'id' | 'lastRun'>,
  ): Promise<string> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    this.monitoringTasks.push({
      ...task,
      id,
      lastRun: new Date(),
    });

    this.logger.log(
      `Added new monitoring task: ${id} for competitor ${task.competitorDomain}`,
    );

    // Run the task immediately to get initial data
    await this.runMonitoringTask(
      this.monitoringTasks[this.monitoringTasks.length - 1],
    );

    return id;
  }

  /**
   * Remove a monitoring task
   */
  removeMonitoringTask(taskId: string): boolean {
    const initialLength = this.monitoringTasks.length;
    this.monitoringTasks = this.monitoringTasks.filter(
      (task) => task.id !== taskId,
    );

    if (this.monitoringTasks.length < initialLength) {
      this.logger.log(`Removed monitoring task: ${taskId}`);
      return true;
    }

    return false;
  }

  /**
   * Update a monitoring task
   */
  updateMonitoringTask(
    taskId: string,
    updates: Partial<MonitoringTask>,
  ): boolean {
    const taskIndex = this.monitoringTasks.findIndex(
      (task) => task.id === taskId,
    );

    if (taskIndex !== -1) {
      this.monitoringTasks[taskIndex] = {
        ...this.monitoringTasks[taskIndex],
        ...updates,
      };

      this.logger.log(`Updated monitoring task: ${taskId}`);
      return true;
    }

    return false;
  }

  /**
   * Get all monitoring tasks for a user
   */
  getMonitoringTasksForUser(userId: string): MonitoringTask[] {
    return this.monitoringTasks.filter((task) => task.userId === userId);
  }

  /**
   * Run monitoring tasks that match the given frequency
   */
  private async runMonitoringTasks(frequency: string): Promise<void> {
    const tasksToRun = this.monitoringTasks.filter(
      (task) => task.enabled && task.frequency === frequency,
    );

    this.logger.debug(
      `Running ${tasksToRun.length} monitoring tasks with frequency ${frequency}`,
    );

    for (const task of tasksToRun) {
      await this.runMonitoringTask(task);
    }
  }

  /**
   * Run a single monitoring task
   */
  private async runMonitoringTask(task: MonitoringTask): Promise<void> {
    try {
      this.logger.debug(
        `Running monitoring task ${task.id} for ${task.competitorDomain}`,
      );

      // In a real implementation, this would update pricing data in a database
      const results = await this.priceMonitorService.monitorCompetitorPrices(
        task.competitorDomain,
        task.userProducts.map((p) => ({
          name: p.name,
          url: p.url,
          price: p.price,
          currency: p.currency,
        })),
      );

      this.logger.debug(
        `Monitoring task ${task.id} completed: found ${results.length} matches`,
      );

      // Update last run timestamp
      task.lastRun = new Date();

      // In a real implementation, this would:
      // 1. Store the updated results in a database
      // 2. Send notifications for any significant price changes
      // 3. Log the monitoring event
    } catch (error) {
      this.logger.error(
        `Failed to run monitoring task ${task.id} for ${task.competitorDomain}: ${error.message}`,
        error.stack,
      );
    }
  }
}
