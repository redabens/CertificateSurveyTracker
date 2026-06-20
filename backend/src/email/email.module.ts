import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailScheduler } from './email.scheduler';

@Module({
  providers: [EmailService, EmailScheduler],
  exports: [EmailService],
})
export class EmailModule {}
