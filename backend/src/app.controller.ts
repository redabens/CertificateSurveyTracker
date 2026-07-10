import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(
    private readonly emailService: EmailService,
    private readonly db: DatabaseService,
  ) {}

  @Post('trigger-notifications')
  @UseGuards(JwtAuthGuard)
  async triggerNotifications(@Query('status') status?: string) {
    return this.emailService.sendManualFleetNotifications(status);
  }

  @Get('email-logs')
  @UseGuards(JwtAuthGuard)
  async getEmailLogs() {
    return this.db.query('SELECT * FROM email_logs ORDER BY id DESC');
  }
}
