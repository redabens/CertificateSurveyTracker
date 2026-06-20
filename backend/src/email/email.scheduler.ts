import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailService } from './email.service';

@Injectable()
export class EmailScheduler {
  private readonly logger = new Logger(EmailScheduler.name);

  constructor(private readonly emailService: EmailService) {}

  @Cron('0 0 * * *')
  async handleDailyCheck() {
    this.logger.log('Daily cron triggered for certificate status check.');
    try {
      await this.emailService.performCertificateStatusCheck();
    } catch (err) {
      this.logger.error(
        'Failed to run daily certificate compliance check: ' + err.message,
      );
    }
  }
}
