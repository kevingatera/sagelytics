import { db } from '../index';
import { userNotificationSettings } from '../schema';
import { eq } from 'drizzle-orm';
import type { UserNotificationSetting } from '../schema';

export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSetting | null> {
  const result = await db.query.userNotificationSettings.findFirst({
    where: eq(userNotificationSettings.userId, userId),
  });
  return result ?? null;
}

export async function createUserNotificationSettings(userId: string): Promise<UserNotificationSetting> {
  const [settings] = await db.insert(userNotificationSettings).values({
    userId,
  }).returning();
  
  return settings!;
}

export async function updateUserNotificationSettings(
  userId: string, 
  updates: Partial<Pick<UserNotificationSetting, 'enablePriceAlerts' | 'enableCompetitorUpdates' | 'enableMarketInsights' | 'enableBillingUpdates' | 'schedule'>>
): Promise<UserNotificationSetting> {
  const [settings] = await db.update(userNotificationSettings)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(userNotificationSettings.userId, userId))
    .returning();
    
  return settings!;
}

export async function getOrCreateUserNotificationSettings(userId: string): Promise<UserNotificationSetting> {
  let settings = await getUserNotificationSettings(userId);
  
  if (!settings) {
    settings = await createUserNotificationSettings(userId);
  }
  
  return settings;
}

export async function getNotificationLogs(userId: string, limit = 50) {
  // Import from monitoring queries since notification logs are there
  const { getNotificationLogs: getLogsFromMonitoring } = await import('./monitoring');
  return await getLogsFromMonitoring(userId, limit);
} 