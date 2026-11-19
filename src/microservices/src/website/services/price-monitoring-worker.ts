import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebsiteDiscoveryService } from './website-discovery.service';
import {
  NotificationService,
  type AlertDetails,
} from '../../notification/notification.service';
import {
  DatabaseService,
  type ClaimedMonitoringTask,
  type MonitoringTask,
} from '../../shared/services/database.service';
import {
  calculatePriceChange,
  shouldRecordPrice,
  toStoredChange,
  type PriceObservation,
} from './price-history';
import { assertSafeUrl, isUnsafeUrlError } from '../../shared/net/safe-fetch';
import { envSchema } from '../../env';

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
const HOUR_MS = 60 * 60 * 1000;
const MAX_TASKS_PER_USER = 5;
const TASK_CONCURRENCY = 5;
const TASK_TIMEOUT_MS = 120_000;
const FINISH_TIMEOUT_MS = 5_000;
const LEASE_GRACE_MS = 30_000;

const monitoringEnv = envSchema.pick({
  MONITORING_BATCH_SIZE: true,
  MONITORING_MAX_URLS_PER_TASK: true,
  MONITORING_URL_TIMEOUT_MS: true,
});

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
  private readonly limits = monitoringEnv.parse(process.env);

  constructor(
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly notificationService: NotificationService,
    private readonly database: DatabaseService,
  ) {
    this.logger.log('Price monitoring worker initialized');
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
        leaseMs: TASK_TIMEOUT_MS + FINISH_TIMEOUT_MS + LEASE_GRACE_MS,
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

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async runMonitoringTasks(): Promise<void> {
    const batchSize = this.limits.MONITORING_BATCH_SIZE;
    const leaseMs =
      Math.ceil(batchSize / TASK_CONCURRENCY) *
        (TASK_TIMEOUT_MS + FINISH_TIMEOUT_MS) +
      LEASE_GRACE_MS;
    let tasks: ClaimedMonitoringTask[];
    try {
      tasks = await this.database.claimDueMonitoringTasks(
        batchSize,
        MAX_TASKS_PER_USER,
        leaseMs,
      );
    } catch (error) {
      this.logger.error(
        `Failed to claim monitoring tasks: ${errorMessage(error)}`,
        errorStack(error),
      );
      return;
    }

    this.logger.debug(`Running ${tasks.length} monitoring tasks`);

    for (let i = 0; i < tasks.length; i += TASK_CONCURRENCY) {
      await Promise.all(
        tasks
          .slice(i, i + TASK_CONCURRENCY)
          .map((task) => this.runMonitoringTask(task)),
      );
    }
  }

  private async runMonitoringTask(task: ClaimedMonitoringTask): Promise<void> {
    try {
      const startedAt = Date.now();
      const taskDeadlineAt = Math.min(
        startedAt + TASK_TIMEOUT_MS,
        task.claimedUntil.getTime() - FINISH_TIMEOUT_MS,
      );
      this.logger.debug(
        `Running monitoring task ${task.id} for ${task.competitorDomain}`,
      );

      const eligible = await runBeforeDeadline(taskDeadlineAt, () =>
        this.database.getEligibleMonitoringProductCount(task),
      );
      let cursor = eligible > 0 ? task.urlCursor % eligible : task.urlCursor;
      const attempts = Math.min(
        eligible,
        this.limits.MONITORING_MAX_URLS_PER_TASK,
      );

      for (let i = 0; i < attempts; i += 1) {
        if (Date.now() >= taskDeadlineAt) {
          this.logger.warn(
            `Task ${task.id} hit its deadline and skipped its remaining URLs`,
          );
          break;
        }

        const product = task.productUrls[cursor];
        cursor = (cursor + 1) % eligible;
        const urlDeadlineAt = Math.min(
          taskDeadlineAt,
          Date.now() + this.limits.MONITORING_URL_TIMEOUT_MS,
        );
        try {
          await runBeforeDeadline(urlDeadlineAt, (signal) =>
            this.monitorProduct(task, product, signal, urlDeadlineAt),
          );
        } catch (error) {
          this.logger.warn(
            `Failed to monitor ${product.url} for task ${task.id}: ${errorMessage(error)}`,
          );
        }
      }

      const finishedAt = new Date();
      const nextRun = calculateNextRun(task, startedAt, finishedAt.getTime());
      await runBeforeDeadline(finishedAt.getTime() + FINISH_TIMEOUT_MS, () =>
        this.database.finishMonitoringTask(task, finishedAt, nextRun, cursor),
      );
    } catch (error) {
      this.logger.error(
        `Failed to run monitoring task ${task.id} for ${task.competitorDomain}: ${errorMessage(error)}`,
        errorStack(error),
      );
    }
  }

  /**
   * Read one competitor product page, record its price when it changed or the last
   * row is a day old, and raise an alert on a large move. A failed fetch or an
   * unreadable price records nothing, so the next run compares against real data.
   */
  private async monitorProduct(
    task: MonitoringTask,
    product: MonitoredProduct,
    signal: AbortSignal,
    deadlineAt: number,
  ): Promise<void> {
    const observed = await this.fetchCompetitorPrice(
      product.url,
      signal,
      deadlineAt,
    );
    signal.throwIfAborted();
    if (!observed) {
      this.logger.debug(
        `No price found for ${product.url} (task ${task.id}); nothing recorded`,
      );
      return;
    }

    const latest = await this.getLatestObservation(task.id, product.url);
    signal.throwIfAborted();
    const previousPrice = latest?.price ?? null;
    const changePercentage = calculatePriceChange(
      previousPrice,
      observed.price,
    );
    const currency = observed.currency ?? product.currency ?? 'USD';

    if (shouldRecordPrice(latest, observed.price, new Date())) {
      await this.database.createPriceRecord({
        monitoringTaskId: task.id,
        productName: product.name,
        productUrl: product.url,
        price: observed.price,
        currency,
        changePercentage: toStoredChange(changePercentage),
        previousPrice,
        extractionMethod: 'direct_crawl',
      });
    }

    signal.throwIfAborted();
    await this.checkAndTriggerAlert(task, product, signal, {
      changePercentage,
      currentPrice: observed.price,
      previousPrice,
      currency,
    });
  }

  private async fetchCompetitorPrice(
    productUrl: string,
    signal: AbortSignal,
    deadlineAt: number,
  ): Promise<{ price: number; currency: string | null } | null> {
    // Stored URLs came from users and discovery. Refuse any whose host is not public before
    // discovery (or Spider) sees it; the page fetch re-checks and pins each hop.
    try {
      await assertSafeUrl(productUrl);
    } catch (error) {
      if (isUnsafeUrlError(error)) {
        this.logger.warn(`Skipping monitored URL: ${error.message}`);
        return null;
      }
      throw error;
    }

    signal.throwIfAborted();
    const content = await this.websiteDiscovery.discoverWebsiteContent(
      productUrl,
      {
        signal,
        llmDeadlineAt: deadlineAt,
      },
    );
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

  private async getLatestObservation(
    monitoringTaskId: string,
    productUrl: string,
  ): Promise<PriceObservation | null> {
    const latest = await this.database.getLatestPriceForProduct(
      monitoringTaskId,
      productUrl,
    );
    if (!latest) {
      return null;
    }
    // Postgres numeric columns arrive as strings.
    const value =
      latest.price === null || latest.price === undefined
        ? NaN
        : Number(latest.price);
    return {
      price: Number.isFinite(value) && value > 0 ? value : null,
      recordedAt: latest.recordedAt,
    };
  }

  /**
   * Persist the alert row first so notification logs can reference its real id,
   * then hand it to the notifier. Alerts fire only for moves past the thresholds.
   */
  private async checkAndTriggerAlert(
    task: MonitoringTask,
    product: MonitoredProduct,
    signal: AbortSignal,
    move: {
      changePercentage: number | null;
      currentPrice: number;
      previousPrice: number | null;
      currency: string;
    },
  ): Promise<void> {
    try {
      const { changePercentage, currentPrice, previousPrice, currency } = move;
      if (changePercentage === null || !previousPrice) return;

      let alertType: string | null = null;
      if (changePercentage >= PRICE_INCREASE_THRESHOLD) {
        alertType = 'price_increase';
      } else if (changePercentage <= PRICE_DECREASE_THRESHOLD) {
        alertType = 'price_decrease';
      }
      if (!alertType) return;

      const thresholdValue = Math.round(Math.abs(changePercentage) * 100) / 100;
      const alertId = await this.database.createMonitoringAlert({
        userId: task.userId,
        monitoringTaskId: task.id,
        alertType,
        thresholdValue,
        thresholdType: 'percentage',
        enabled: true,
      });

      signal.throwIfAborted();
      const details: AlertDetails = {
        productName: product.name,
        competitorDomain: task.competitorDomain,
        currency,
        previousPrice,
        currentPrice,
        changePercentage,
      };

      await this.notificationService.sendAlert(
        {
          id: alertId,
          userId: task.userId,
          monitoringTaskId: task.id,
          alertType,
          thresholdValue,
          thresholdType: 'percentage',
          enabled: true,
          createdAt: new Date(),
        },
        details,
      );

      this.logger.log(
        `Alert triggered for user ${task.userId}: ${alertType} of ${changePercentage.toFixed(2)}% for ${product.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to check/trigger alert: ${errorMessage(error)}`,
        errorStack(error),
      );
    }
  }
}

function calculateNextRun(
  task: MonitoringTask,
  startedAt: number,
  finishedAt: number,
): Date {
  const interval =
    task.frequency === '0 0 * * *'
      ? 24 * HOUR_MS
      : task.frequency === '0 */6 * * *'
        ? 6 * HOUR_MS
        : HOUR_MS;
  const slot =
    task.nextRun?.getTime() ?? Math.floor(startedAt / interval) * interval;
  const slotsElapsed = Math.floor((finishedAt - slot) / interval);
  return new Date(slot + Math.max(1, slotsElapsed + 1) * interval);
}

async function runBeforeDeadline<T>(
  deadlineAt: number,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const remainingMs = deadlineAt - Date.now();
  const error = new Error('Monitoring deadline exceeded');
  if (remainingMs <= 0) throw error;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(error);
      reject(error);
    }, remainingMs);
  });
  try {
    return await Promise.race([work(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
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
