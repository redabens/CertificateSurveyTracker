import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('trigger-notifications')
  @UseGuards(JwtAuthGuard)
  async triggerNotifications(@Query('status') status?: string) {
    return this.emailService.sendManualFleetNotifications(status);
  }

  @Get('email-logs')
  @UseGuards(JwtAuthGuard)
  async getEmailLogs() {
    const logs = await this.prisma.emailLog.findMany({
      orderBy: { id: 'desc' },
    });
    return logs.map((log) => ({
      id: log.id,
      vessel_name: log.vesselName,
      certificate_name: log.certificateName,
      alarm_level: log.alarmLevel,
      sent_to: log.sentTo,
      sent_at: log.sentAt,
    }));
  }
}
