import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { validateEnv } from '../../env';

// Import the schema from the main app
// We'll need to create a shared schema or import it properly
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
  frequency: string;
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
  }): Promise<MonitoringTask> {
    if (!this.conn) throw new Error('Database not connected');

    const [task] = await this.conn`
      INSERT INTO sg_monitoring_tasks (
        user_id, competitor_domain, product_urls, frequency, enabled, discovery_source
      ) VALUES (
        ${data.userId}, 
        ${data.competitorDomain}, 
        ${JSON.stringify(data.productUrls)}, 
        ${data.frequency}, 
        ${data.enabled ?? true}, 
        ${data.discoverySource ?? 'perplexity'}
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

  async getTasksToRun(frequency?: string): Promise<MonitoringTask[]> {
    if (!this.conn) throw new Error('Database not connected');

    const now = new Date();

    let query;
    if (frequency) {
      query = this.conn`
        SELECT * FROM sg_monitoring_tasks 
        WHERE enabled = true 
          AND status = 'active'
          AND frequency = ${frequency}
          AND (next_run IS NULL OR next_run <= ${now})
        ORDER BY last_run ASC NULLS FIRST
      `;
    } else {
      query = this.conn`
        SELECT * FROM sg_monitoring_tasks 
        WHERE enabled = true 
          AND status = 'active'
          AND (next_run IS NULL OR next_run <= ${now})
        ORDER BY last_run ASC NULLS FIRST
      `;
    }

    const tasks = await query;

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
  }): Promise<string> {
    if (!this.conn) throw new Error('Database not connected');

    const [log] = await this.conn`
      INSERT INTO sg_notification_logs (
        user_id, alert_id, notification_type, recipient, subject, content, status
      ) VALUES (
        ${data.userId}, ${data.alertId}, ${data.notificationType}, 
        ${data.recipient}, ${data.subject}, ${data.content}, ${data.status}
      )
      RETURNING id
    `;

    return log.id;
  }

  async updateNotificationStatus(logId: string, status: string): Promise<void> {
    if (!this.conn) throw new Error('Database not connected');

    await this.conn`
      UPDATE sg_notification_logs 
      SET status = ${status}, sent_at = ${status === 'sent' ? new Date() : null}
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
