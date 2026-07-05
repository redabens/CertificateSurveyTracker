import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTransportService } from './email-transport.service';
import { EmailTemplateService } from './email-template.service';
import { EmailScheduler } from './email.scheduler';
import { AlarmModule } from '../alarm/alarm.module';

/**
 * EmailModule — Fournit l'ensemble des services email.
 * DatabaseModule est @Global() → pas besoin de l'importer ici.
 *
 * Providers SRP:
 *   EmailTransportService → couche envoi (SMTP/Brevo/Mock)
 *   EmailTemplateService  → génération HTML/texte
 *   EmailService          → orchestration métier (alertes, OTP, invitations)
 *   EmailScheduler        → planification cron
 */
@Module({
  imports: [AlarmModule],
  providers: [
    EmailTransportService,
    EmailTemplateService,
    EmailService,
    EmailScheduler,
  ],
  exports: [EmailService],
})
export class EmailModule {}
