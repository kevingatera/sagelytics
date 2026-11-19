import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { validateEnv } from '../../env';

// Import the schema from the main app
// We'll need to create a shared schema or import it properly
export interface MonitoringTask {
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
  frequency: string;
  enabled: boolean;
  status: string;
  discoverySource: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimedMonitoringTask extends MonitoringTask {
  claimedUntil: Date;
}

export interface PriceRecord {
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

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db: ReturnType<typeof drizzle> | null = null;
  private conn: postgres.Sql | null = null;

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      const env = validateEnv(process.env);

      this.logger.debug('Connecting to database...');
      this.conn = postgres(env.DATABASE_URL);
      this.db = drizzle(this.conn);

      // Test the connection
      await this.conn`SELECT 1`;
      this.logger.log('Database connection established successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error.message);
      throw error;
    }
  }

  async createMonitoringTask(data: {
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
    leaseMs: number;
  }): Promise<ClaimedMonitoringTask> {
    if (!this.conn) throw new Error('Database not connected');

    const [task] = await this.conn`
      INSERT INTO sg_monitoring_tasks (
        user_id, competitor_domain, product_urls, frequency, enabled, discovery_source, claimed_until
      ) VALUES (
        ${data.userId}, 
        ${data.competitorDomain}, 
        ${JSON.stringify(data.productUrls)}, 
        ${data.frequency}, 
        ${data.enabled ?? true}, 
        ${data.discoverySource ?? 'perplexity'},
        date_trunc('milliseconds', statement_timestamp()) + ${data.leaseMs} * interval '1 millisecond'
      )
      RETURNING *
    `;

    return {
      id: task.id,
      userId: task.user_id,
      competitorDomain: task.competitor_domain,
      productUrls: task.product_urls,
      frequency: task.frequency,
      enabled: task.enabled,
      status: task.status,
      discoverySource: task.discovery_source,
      lastRun: task.last_run,
      nextRun: task.next_run,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      claimedUntil: task.claimed_until,
    };
  }

  async getMonitoringTasksByUser(userId: string): Promise<MonitoringTask[]> {
    if (!this.conn) throw new Error('Database not connected');

    const tasks = await this.conn`
      SELECT * FROM sg_monitoring_tasks 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return tasks.map((task) => ({
      id: task.id,
      userId: task.user_id,
      competitorDomain: task.competitor_domain,
      productUrls: task.product_urls,
      frequency: task.frequency,
      enabled: task.enabled,
      status: task.status,
      discoverySource: task.discovery_source,
      lastRun: task.last_run,
      nextRun: task.next_run,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));
  }

  async claimDueMonitoringTasks(
    limit: number,
    perUserLimit: number,
    leaseMs: number,
  ): Promise<ClaimedMonitoringTask[]> {
    if (!this.conn) throw new Error('Database not connected');

    const tasks = await this.conn`
      WITH ranked AS (
        SELECT id, coalesce(next_run, created_at) AS due_at,
          row_number() OVER (
            PARTITION BY user_id ORDER BY coalesce(next_run, created_at), id
          ) AS user_rank
        FROM sg_monitoring_tasks
        WHERE enabled = true
          AND status = 'active'
          AND (next_run IS NULL OR next_run <= statement_timestamp() AT TIME ZONE 'UTC')
          AND (claimed_until IS NULL OR claimed_until <= statement_timestamp())
      ), due AS (
        SELECT task.id, ranked.due_at
        FROM ranked JOIN sg_monitoring_tasks task ON task.id = ranked.id
        WHERE ranked.user_rank <= ${perUserLimit}
          AND task.enabled = true
          AND task.status = 'active'
          AND (task.next_run IS NULL OR task.next_run <= statement_timestamp() AT TIME ZONE 'UTC')
          AND (task.claimed_until IS NULL OR task.claimed_until <= statement_timestamp())
        ORDER BY ranked.due_at, task.id
        LIMIT ${limit}
        FOR UPDATE OF task SKIP LOCKED
      ), claimed AS (
        UPDATE sg_monitoring_tasks task
        SET claimed_until = date_trunc('milliseconds', statement_timestamp()) + ${leaseMs} * interval '1 millisecond'
        FROM due
        WHERE task.id = due.id
        RETURNING task.*, due.due_at
      )
      SELECT *, next_run AT TIME ZONE 'UTC' AS scheduled_at
      FROM claimed ORDER BY due_at, id
    `;

    return tasks.map((task) => ({
      id: task.id,
      userId: task.user_id,
      competitorDomain: task.competitor_domain,
      productUrls: task.product_urls,
      frequency: task.frequency,
      enabled: task.enabled,
      status: task.status,
      discoverySource: task.discovery_source,
      lastRun: task.last_run,
      nextRun: task.scheduled_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      claimedUntil: task.claimed_until,
    }));
  }

  async finishMonitoringTask(
    task: ClaimedMonitoringTask,
    lastRun: Date,
    nextRun: Date,
  ): Promise<void> {
    if (!this.conn) throw new Error('Database not connected');

    await this.conn`
      UPDATE sg_monitoring_tasks
      SET last_run = ${lastRun}::timestamptz AT TIME ZONE 'UTC',
        next_run = ${nextRun}::timestamptz AT TIME ZONE 'UTC',
        claimed_until = NULL, updated_at = NOW()
      WHERE id = ${task.id}
        AND claimed_until = ${task.claimedUntil}
        AND claimed_until > clock_timestamp()
    `;
  }

  async updateMonitoringTask(
    taskId: string,
    updates: Partial<MonitoringTask>,
  ): Promise<MonitoringTask> {
    if (!this.conn) throw new Error('Database not connected');

    // Use individual update queries for simplicity
    let task;

    if (updates.enabled !== undefined) {
      [task] = await this.conn`
        UPDATE sg_monitoring_tasks 
        SET enabled = ${updates.enabled}, updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    if (updates.frequency !== undefined) {
      [task] = await this.conn`
        UPDATE sg_monitoring_tasks 
        SET frequency = ${updates.frequency}, updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    if (updates.status !== undefined) {
      [task] = await this.conn`
        UPDATE sg_monitoring_tasks 
        SET status = ${updates.status}, updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    if (updates.lastRun !== undefined) {
      [task] = await this.conn`
        UPDATE sg_monitoring_tasks 
        SET last_run = ${updates.lastRun}, updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    if (updates.nextRun !== undefined) {
      [task] = await this.conn`
        UPDATE sg_monitoring_tasks 
        SET next_run = ${updates.nextRun}, updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    if (updates.productUrls !== undefined) {
      [task] = await this.conn`
        UPDATE sg_monitoring_tasks 
        SET product_urls = ${JSON.stringify(updates.productUrls)}, updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    // If no updates were made, just update the timestamp
    if (!task) {
      [task] = await this.conn`
        UPDATE sg_monitoring_tasks 
        SET updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;
    }

    return {
      id: task.id,
      userId: task.user_id,
      competitorDomain: task.competitor_domain,
      productUrls: task.product_urls,
      frequency: task.frequency,
      enabled: task.enabled,
      status: task.status,
      discoverySource: task.discovery_source,
      lastRun: task.last_run,
      nextRun: task.next_run,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  }

  async deleteMonitoringTask(taskId: string): Promise<void> {
    if (!this.conn) throw new Error('Database not connected');

    await this.conn`
      DELETE FROM sg_monitoring_tasks 
      WHERE id = ${taskId}
    `;
  }

  async createPriceRecord(data: {
    monitoringTaskId: string;
    productName: string;
    productUrl: string;
    price?: number | null;
    currency?: string;
    changePercentage?: number | null;
    previousPrice?: number | null;
    extractionMethod?: string;
  }): Promise<void> {
    if (!this.conn) throw new Error('Database not connected');

    await this.conn`
      INSERT INTO sg_price_history (
        monitoring_task_id, product_name, product_url, price, currency,
        change_percentage, previous_price, extraction_method
      ) VALUES (
        ${data.monitoringTaskId},
        ${data.productName},
        ${data.productUrl},
        ${data.price ?? null},
        ${data.currency ?? 'USD'},
        ${data.changePercentage ?? null},
        ${data.previousPrice ?? null},
        ${data.extractionMethod ?? 'direct_crawl'}
      )
    `;
  }

  async getLatestPriceForProduct(
    monitoringTaskId: string,
    productUrl: string,
  ): Promise<PriceRecord | null> {
    if (!this.conn) throw new Error('Database not connected');

    const [record] = await this.conn`
      SELECT * FROM sg_price_history 
      WHERE monitoring_task_id = ${monitoringTaskId} 
        AND product_url = ${productUrl}
      ORDER BY recorded_at DESC 
      LIMIT 1
    `;

    if (!record) return null;

    return {
      id: record.id,
      monitoringTaskId: record.monitoring_task_id,
      productName: record.product_name,
      productUrl: record.product_url,
      price: record.price,
      currency: record.currency,
      recordedAt: record.recorded_at,
      changePercentage: record.change_percentage,
      previousPrice: record.previous_price,
      extractionMethod: record.extraction_method,
    };
  }

  /**
   * Oldest-first price rows for a product URL, capped at `limit` most recent rows.
   * Only rows recorded by `userId`'s own monitoring tasks are returned, so a URL that
   * another user monitors reads the same as one nobody monitors: an empty series.
   */
  async getPriceSeriesForUser(
    userId: string,
    productUrl: string,
    limit = 365,
  ): Promise<Array<{ recordedAt: Date; price: number; changePercentage: number | null }>> {
    if (!this.conn) throw new Error('Database not connected');

    const rows = await this.conn`
      SELECT ph.recorded_at, ph.price, ph.change_percentage
      FROM sg_price_history ph
      INNER JOIN sg_monitoring_tasks mt ON mt.id = ph.monitoring_task_id
      WHERE mt.user_id = ${userId}
        AND ph.product_url = ${productUrl}
        AND ph.price IS NOT NULL
      ORDER BY ph.recorded_at DESC
      LIMIT ${limit}
    `;

    return rows
      .map((row) => ({
        recordedAt: row.recorded_at as Date,
        price: Number(row.price),
        changePercentage:
          row.change_percentage === null || row.change_percentage === undefined
            ? null
            : Number(row.change_percentage),
      }))
      .reverse();
  }

  async createMonitoringAlert(data: {
    userId: string;
    monitoringTaskId: string;
    alertType: string;
    thresholdValue?: number | null;
    thresholdType?: string;
    enabled?: boolean;
  }): Promise<string> {
    if (!this.conn) throw new Error('Database not connected');

    const [alert] = await this.conn`
      INSERT INTO sg_monitoring_alerts (
        user_id, monitoring_task_id, alert_type, threshold_value, threshold_type, enabled
      ) VALUES (
        ${data.userId},
        ${data.monitoringTaskId},
        ${data.alertType},
        ${data.thresholdValue ?? null},
        ${data.thresholdType ?? null},
        ${data.enabled ?? true}
      )
      RETURNING id
    `;

    return alert.id;
  }

  async getUserById(
    userId: string,
  ): Promise<{ id: string; email: string } | null> {
    if (!this.conn) throw new Error('Database not connected');

    const [user] = await this.conn`
      SELECT id, email FROM sg_user 
      WHERE id = ${userId}
    `;

    return user ? { id: user.id, email: user.email } : null;
  }

  async getUserNotificationSettings(userId: string): Promise<{
    enablePriceAlerts: boolean;
    enableCompetitorUpdates: boolean;
    enableMarketInsights: boolean;
    enableBillingUpdates: boolean;
    schedule: string;
  } | null> {
    if (!this.conn) throw new Error('Database not connected');

    const [settings] = await this.conn`
      SELECT * FROM sg_user_notification_settings 
      WHERE user_id = ${userId}
    `;

    return settings
      ? {
          enablePriceAlerts: settings.enable_price_alerts,
          enableCompetitorUpdates: settings.enable_competitor_updates,
          enableMarketInsights: settings.enable_market_insights,
          enableBillingUpdates: settings.enable_billing_updates,
          schedule: settings.schedule,
        }
      : null;
  }

  async createNotificationLog(data: {
    userId: string;
    alertId: string;
    notificationType: string;
    recipient: string;
    subject: string;
    content: string;
    status: string;
    errorMessage?: string;
  }): Promise<string> {
    if (!this.conn) throw new Error('Database not connected');

    const [log] = await this.conn`
      INSERT INTO sg_notification_logs (
        user_id, alert_id, notification_type, recipient, subject, content, status, error_message
      ) VALUES (
        ${data.userId}, ${data.alertId}, ${data.notificationType}, 
        ${data.recipient}, ${data.subject}, ${data.content}, ${data.status}, ${data.errorMessage ?? null}
      )
      RETURNING id
    `;

    return log.id;
  }

  async updateNotificationStatus(
    logId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    if (!this.conn) throw new Error('Database not connected');

    await this.conn`
      UPDATE sg_notification_logs 
      SET status = ${status},
          sent_at = ${status === 'sent' ? new Date() : null},
          error_message = ${errorMessage ?? null}
      WHERE id = ${logId}
    `;
  }

  async onModuleDestroy() {
    if (this.conn) {
      await this.conn.end();
      this.logger.debug('Database connection closed');
    }
  }
}
