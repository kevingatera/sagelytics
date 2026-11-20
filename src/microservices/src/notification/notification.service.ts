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

export interface AlertDetails {
  productName: string;
  competitorDomain: string;
  currency: string;
  previousPrice: number;
  currentPrice: number;
  changePercentage: number;
}

export type AlertDeliveryStatus = 'sent' | 'failed' | 'skipped';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Deliver an alert by email and record the outcome in sg_notification_logs.
   * An alert with no user email has no recipient, so nothing is logged for it.
   */
  async sendAlert(
    alert: MonitoringAlert,
    details?: AlertDetails,
  ): Promise<AlertDeliveryStatus> {
    let logId: string | null = null;

    try {
      this.logger.debug(`Processing alert ${alert.id} for user ${alert.userId}`);

      const user = await this.databaseService.getUserById(alert.userId);
      if (!user?.email) {
        this.logger.warn(`No email found for user ${alert.userId}; alert ${alert.id} not delivered`);
        return 'skipped';
      }

      const subject = this.generateEmailSubject(alert);
      const content = this.generateEmailContent(alert, details);
      const settings = await this.getUserNotificationSettings(alert.userId);

      if (!this.shouldSendAlert(alert, settings)) {
        await this.databaseService.createNotificationLog({
          userId: alert.userId,
          alertId: alert.id,
          notificationType: 'email',
          recipient: user.email,
          subject,
          content,
          status: 'skipped',
          errorMessage: 'Alert type disabled in notification settings',
        });
        this.logger.debug(`Alert ${alert.id} skipped due to user preferences`);
        return 'skipped';
      }

      logId = await this.databaseService.createNotificationLog({
        userId: alert.userId,
        alertId: alert.id,
        notificationType: 'email',
        recipient: user.email,
        subject,
        content,
        status: 'pending',
      });

      const result = await this.emailService.sendPriceAlert({
        to: user.email,
        subject,
        content,
      });

      if (result.status === 'sent') {
        await this.databaseService.updateNotificationStatus(logId, 'sent');
        this.logger.log(`Alert ${alert.id} sent to ${user.email}`);
        return 'sent';
      }

      const reason = result.status === 'skipped' ? result.reason : result.error;
      await this.databaseService.updateNotificationStatus(logId, result.status, reason);
      this.logger.warn(`Alert ${alert.id} ${result.status}: ${reason}`);
      return result.status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send alert ${alert.id}: ${message}`, error instanceof Error ? error.stack : undefined);

      if (logId) {
        await this.databaseService
          .updateNotificationStatus(logId, 'failed', message)
          .catch((statusError: unknown) =>
            this.logger.error(
              `Failed to record failed status for alert ${alert.id}: ${statusError instanceof Error ? statusError.message : String(statusError)}`,
            ),
          );
      }
      return 'failed';
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

  private generateEmailContent(alert: MonitoringAlert, details?: AlertDetails): string {
    const lines: string[] = [];

    if (details) {
      const change = details.changePercentage;
      const sign = change > 0 ? '+' : '';
      lines.push(
        `${details.productName} (${details.competitorDomain}) moved from ${details.currency} ${details.previousPrice.toFixed(2)} to ${details.currency} ${details.currentPrice.toFixed(2)} (${sign}${change.toFixed(1)}%).`,
      );
    }

    lines.push(
      `Alert type: ${alert.alertType}`,
      `Threshold: ${alert.thresholdValue} (${alert.thresholdType})`,
      '',
      'This alert was triggered based on your monitoring preferences.',
      '',
      `Visit your dashboard to view more details: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    );

    return lines.join('\n');
  }
}
