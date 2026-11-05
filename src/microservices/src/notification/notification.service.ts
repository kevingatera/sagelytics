import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { DatabaseService } from '../shared/services/database.service';
import { MonitoringAlert } from '@shared/types';
// import type { MonitoringAlert } from '../shared/types';

interface UserNotificationSettings {
  enablePriceAlerts: boolean;
  enableCompetitorUpdates: boolean;
  enableMarketInsights: boolean;
  enableBillingUpdates: boolean;
  schedule: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly databaseService: DatabaseService,
  ) {}

  async sendAlert(alert: MonitoringAlert): Promise<void> {
    try {
      this.logger.debug(
        `Processing alert ${alert.id} for user ${alert.userId}`,
      );

      // Get user notification settings
      const settings = await this.getUserNotificationSettings(alert.userId);

      if (!this.shouldSendAlert(alert, settings)) {
        this.logger.debug(`Alert ${alert.id} skipped due to user preferences`);
        return;
      }

      // Get user email
      const user = await this.databaseService.getUserById(alert.userId);
      if (!user?.email) {
        this.logger.warn(`No email found for user ${alert.userId}`);
        return;
      }

      // Create notification log entry
      const logId = await this.createNotificationLog({
        userId: alert.userId,
        alertId: alert.id,
        notificationType: 'email',
        recipient: user.email,
        subject: this.generateEmailSubject(alert),
        content: this.generateEmailContent(alert),
      });

      // Send email
      await this.emailService.sendPriceAlert({
        to: user.email,
        subject: this.generateEmailSubject(alert),
        content: this.generateEmailContent(alert),
        alert,
      });

      // Update notification status
      await this.updateNotificationStatus(logId, 'sent');

      this.logger.log(`Alert ${alert.id} sent successfully to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send alert ${alert.id}: ${error.message}`,
        error.stack,
      );
      // Update notification status to failed if we have the log ID
      // In a production system, we'd want to retry failed notifications
    }
  }

  private async getUserNotificationSettings(
    userId: string,
  ): Promise<UserNotificationSettings> {
    try {
      const settings =
        await this.databaseService.getUserNotificationSettings(userId);
      return {
        enablePriceAlerts: settings?.enablePriceAlerts ?? true,
        enableCompetitorUpdates: settings?.enableCompetitorUpdates ?? true,
        enableMarketInsights: settings?.enableMarketInsights ?? true,
        enableBillingUpdates: settings?.enableBillingUpdates ?? true,
        schedule: settings?.schedule ?? 'instant',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get notification settings for user ${userId}: ${error.message}`,
      );
      // Return default settings on error
      return {
        enablePriceAlerts: true,
        enableCompetitorUpdates: true,
        enableMarketInsights: true,
        enableBillingUpdates: true,
        schedule: 'instant',
      };
    }
  }

  private shouldSendAlert(
    alert: MonitoringAlert,
    settings: UserNotificationSettings,
  ): boolean {
    // Check if the alert type is enabled
    switch (alert.alertType) {
      case 'price_increase':
      case 'price_decrease':
        return settings.enablePriceAlerts;
      case 'new_product':
        return settings.enableCompetitorUpdates;
      default:
        return true; // Send unknown alert types by default
    }
  }

  private generateEmailSubject(alert: MonitoringAlert): string {
    switch (alert.alertType) {
      case 'price_increase':
        return 'Price Alert: Competitor Price Increased';
      case 'price_decrease':
        return 'Price Alert: Competitor Price Decreased';
      case 'new_product':
        return 'New Competitor Product Detected';
      default:
        return 'Sagelytics Alert';
    }
  }

  private generateEmailContent(alert: MonitoringAlert): string {
    return `
      Alert Type: ${alert.alertType}
      Threshold: ${alert.thresholdValue} (${alert.thresholdType})
      
      This alert was triggered based on your monitoring preferences.
      
      Visit your dashboard to view more details: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
    `;
  }

  private async createNotificationLog(data: {
    userId: string;
    alertId: string;
    notificationType: string;
    recipient: string;
    subject: string;
    content: string;
  }): Promise<string> {
    return await this.databaseService.createNotificationLog({
      ...data,
      status: 'pending',
    });
  }

  private async updateNotificationStatus(
    logId: string,
    status: string,
  ): Promise<void> {
    await this.databaseService.updateNotificationStatus(logId, status);
  }
}
