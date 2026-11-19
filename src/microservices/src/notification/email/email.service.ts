import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { SMTP_CONFIG, type SmtpConfig } from './smtp-config';

export interface PriceAlertEmail {
  to: string;
  subject: string;
  content: string;
}

export type EmailSendResult =
  | { status: 'sent'; messageId: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;

  constructor(@Optional() @Inject(SMTP_CONFIG) private readonly smtp: SmtpConfig | null) {
    if (smtp) {
      this.transporter = createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.auth,
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST and EMAIL_FROM); price alert emails will be skipped',
      );
    }
  }

  async sendPriceAlert(emailData: PriceAlertEmail): Promise<EmailSendResult> {
    if (!this.smtp || !this.transporter) {
      return { status: 'skipped', reason: 'SMTP is not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.smtp.from,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.content,
      });
      this.logger.log(`Price alert email sent to ${emailData.to}`);
      return { status: 'sent', messageId: info.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send price alert email to ${emailData.to}: ${message}`);
      return { status: 'failed', error: message };
    }
  }
}
