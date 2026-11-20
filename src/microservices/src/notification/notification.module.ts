import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from './email/email.service';
import { SMTP_CONFIG, loadSmtpConfig } from './email/smtp-config';
import { SharedModule } from '../shared/shared.module';
import { validateEnv } from '../env';

@Module({
  imports: [SharedModule],
  providers: [
    NotificationService,
    EmailService,
    {
      provide: SMTP_CONFIG,
      useFactory: () => loadSmtpConfig(validateEnv(process.env)),
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
