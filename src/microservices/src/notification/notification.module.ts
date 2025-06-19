import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from './email/email.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [NotificationService, EmailService],
  exports: [NotificationService],
})
export class NotificationModule {}
