import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('trigger-notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager')
  async triggerNotifications(@Query('status') status?: string) {
    return this.emailService.sendManualFleetNotifications(status);
  }

  @Get('email-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager')
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
