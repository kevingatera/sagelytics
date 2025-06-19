import { db } from '~/server/db';
import { 
  monitoringTasks, 
  priceHistory, 
  monitoringAlerts, 
  notificationLogs,
  type MonitoringTask,
  type PriceHistory,
  type MonitoringAlert,
  type NotificationLog
} from '~/server/db/schema';
import { eq, and, desc, asc, gte, lte, isNull, or } from 'drizzle-orm';

// Monitoring Tasks
export async function createMonitoringTask(data: {
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
}) {
  const [task] = await db.insert(monitoringTasks).values({
    userId: data.userId,
    competitorDomain: data.competitorDomain,
    productUrls: data.productUrls,
    frequency: data.frequency,
    enabled: data.enabled ?? true,
    discoverySource: data.discoverySource ?? 'perplexity',
  }).returning();

  return task;
}

export async function getMonitoringTasksByUser(userId: string) {
  return await db.query.monitoringTasks.findMany({
    where: eq(monitoringTasks.userId, userId),
    orderBy: [desc(monitoringTasks.createdAt)],
    with: {
      priceHistory: {
        orderBy: [desc(priceHistory.recordedAt)],
        limit: 5, // Latest 5 price records per task
      },
      alerts: true,
    },
  });
}

export async function getMonitoringTaskById(taskId: string) {
  return await db.query.monitoringTasks.findFirst({
    where: eq(monitoringTasks.id, taskId),
    with: {
      priceHistory: {
        orderBy: [desc(priceHistory.recordedAt)],
      },
      alerts: true,
    },
  });
}

export async function updateMonitoringTask(
  taskId: string, 
  updates: Partial<Pick<MonitoringTask, 'enabled' | 'frequency' | 'status' | 'lastRun' | 'nextRun' | 'productUrls'>>
) {
  const [task] = await db.update(monitoringTasks)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(monitoringTasks.id, taskId))
    .returning();

  return task;
}

export async function deleteMonitoringTask(taskId: string) {
  await db.delete(monitoringTasks)
    .where(eq(monitoringTasks.id, taskId));
}

export async function getTasksToRun(frequency?: string) {
  const now = new Date();
  
  let whereCondition = and(
    eq(monitoringTasks.enabled, true),
    eq(monitoringTasks.status, 'active'),
    or(
      isNull(monitoringTasks.nextRun),
      lte(monitoringTasks.nextRun, now)
    )
  );

  if (frequency) {
    whereCondition = and(
      whereCondition,
      eq(monitoringTasks.frequency, frequency)
    );
  }

  return await db.query.monitoringTasks.findMany({
    where: whereCondition,
    orderBy: [asc(monitoringTasks.lastRun)],
  });
}

// Price History
export async function createPriceRecord(data: {
  monitoringTaskId: string;
  productName: string;
  productUrl: string;
  price?: number;
  currency?: string;
  changePercentage?: number;
  previousPrice?: number;
  extractionMethod?: string;
}) {
  const [record] = await db.insert(priceHistory).values({
    monitoringTaskId: data.monitoringTaskId,
    productName: data.productName,
    productUrl: data.productUrl,
    price: data.price?.toString(),
    currency: data.currency,
    changePercentage: data.changePercentage?.toString(),
    previousPrice: data.previousPrice?.toString(),
    extractionMethod: data.extractionMethod ?? 'direct_crawl',
  }).returning();

  return record;
}

export async function getPriceHistory(
  monitoringTaskId: string,
  productUrl?: string,
  limit = 50
) {
  const conditions = [eq(priceHistory.monitoringTaskId, monitoringTaskId)];
  
  if (productUrl) {
    conditions.push(eq(priceHistory.productUrl, productUrl));
  }

  return await db.query.priceHistory.findMany({
    where: and(...conditions),
    orderBy: [desc(priceHistory.recordedAt)],
    limit,
  });
}

export async function getLatestPriceForProduct(monitoringTaskId: string, productUrl: string) {
  return await db.query.priceHistory.findFirst({
    where: and(
      eq(priceHistory.monitoringTaskId, monitoringTaskId),
      eq(priceHistory.productUrl, productUrl)
    ),
    orderBy: [desc(priceHistory.recordedAt)],
  });
}

export async function getPriceHistoryInRange(
  monitoringTaskId: string,
  startDate: Date,
  endDate: Date,
  productUrl?: string
) {
  const conditions = [
    eq(priceHistory.monitoringTaskId, monitoringTaskId),
    gte(priceHistory.recordedAt, startDate),
    lte(priceHistory.recordedAt, endDate)
  ];

  if (productUrl) {
    conditions.push(eq(priceHistory.productUrl, productUrl));
  }

  return await db.query.priceHistory.findMany({
    where: and(...conditions),
    orderBy: [asc(priceHistory.recordedAt)],
  });
}

// Monitoring Alerts
export async function createMonitoringAlert(data: {
  userId: string;
  monitoringTaskId?: string;
  alertType: string;
  thresholdValue?: number;
  thresholdType?: string;
  enabled?: boolean;
}) {
  const [alert] = await db.insert(monitoringAlerts).values({
    userId: data.userId,
    monitoringTaskId: data.monitoringTaskId,
    alertType: data.alertType,
    thresholdValue: data.thresholdValue?.toString(),
    thresholdType: data.thresholdType,
    enabled: data.enabled ?? true,
  }).returning();

  return alert;
}

export async function getAlertsByUser(userId: string) {
  return await db.query.monitoringAlerts.findMany({
    where: eq(monitoringAlerts.userId, userId),
    orderBy: [desc(monitoringAlerts.createdAt)],
    with: {
      monitoringTask: true,
      notificationLogs: {
        orderBy: [desc(notificationLogs.createdAt)],
        limit: 5,
      },
    },
  });
}

export async function updateMonitoringAlert(
  alertId: string,
  updates: {
    enabled?: boolean;
    thresholdValue?: number;
    thresholdType?: string;
  }
) {
  const updateData: {
    enabled?: boolean;
    thresholdValue?: string;
    thresholdType?: string;
  } = {};

  if (updates.enabled !== undefined) {
    updateData.enabled = updates.enabled;
  }
  if (updates.thresholdValue !== undefined) {
    updateData.thresholdValue = updates.thresholdValue.toString();
  }
  if (updates.thresholdType !== undefined) {
    updateData.thresholdType = updates.thresholdType;
  }

  const [alert] = await db.update(monitoringAlerts)
    .set(updateData)
    .where(eq(monitoringAlerts.id, alertId))
    .returning();

  return alert;
}

export async function deleteMonitoringAlert(alertId: string) {
  await db.delete(monitoringAlerts)
    .where(eq(monitoringAlerts.id, alertId));
}

// Notification Logs
export async function createNotificationLog(data: {
  userId: string;
  alertId?: string;
  notificationType: string;
  recipient: string;
  subject?: string;
  content?: string;
  status?: string;
}) {
  const [log] = await db.insert(notificationLogs).values({
    userId: data.userId,
    alertId: data.alertId,
    notificationType: data.notificationType,
    recipient: data.recipient,
    subject: data.subject,
    content: data.content,
    status: data.status ?? 'pending',
  }).returning();

  return log;
}

export async function updateNotificationStatus(
  logId: string,
  status: string,
  errorMessage?: string
) {
  const updates: Partial<NotificationLog> = {
    status,
    errorMessage,
  };

  if (status === 'sent') {
    updates.sentAt = new Date();
  }

  const [log] = await db.update(notificationLogs)
    .set(updates)
    .where(eq(notificationLogs.id, logId))
    .returning();

  return log;
}

export async function getNotificationLogs(
  userId: string,
  limit = 50
) {
  return await db.query.notificationLogs.findMany({
    where: eq(notificationLogs.userId, userId),
    orderBy: [desc(notificationLogs.createdAt)],
    limit,
    with: {
      alert: {
        with: {
          monitoringTask: true,
        },
      },
    },
  });
} 