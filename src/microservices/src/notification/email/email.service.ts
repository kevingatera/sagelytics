import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmailData {
  to: string;
  subject: string;
  content: string;
  alert: unknown;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPriceAlert(emailData: EmailData): Promise<void> {
    try {
      this.logger.debug(`Sending price alert email to ${emailData.to}`);

      // For now, just log the email content
      // In production, integrate with Nodemailer, SES, or another email service
      this.logger.log(`
        Email Details:
        To: ${emailData.to}
        Subject: ${emailData.subject}
        Content: ${emailData.content}
      `);

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.log(`Email sent successfully to ${emailData.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${emailData.to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
