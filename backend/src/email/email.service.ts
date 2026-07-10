import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AlarmService, ALARM_LEVELS } from '../alarm/alarm.service';
import { EmailTransportService } from './email-transport.service';
import { EmailTemplateService } from './email-template.service';

/**
 * EmailService — Orchestrateur des notifications email liées aux certificats.
 *
 * SRP: Ce service NE fait QUE coordonner la logique métier email:
 *      contrôle quotidien des alarmes, envoi d'alertes, OTP, invitations.
 *
 *      Il NE construit PAS les templates (→ EmailTemplateService)
 *      Il N'envoie PAS directement (→ EmailTransportService)
 *      Il NE calcule PAS les alarmes (→ AlarmService)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly alarmService: AlarmService,
    private readonly transport: EmailTransportService,
    private readonly templates: EmailTemplateService,
  ) {}

  /** Envoie une alerte de changement d'état sur un certificat */
  async sendCertificateAlert(
    vessel: any,
    emails: string[],
    cert: any,
    prevAlarm: string,
  ): Promise<void> {
    if (emails.length === 0) {
      this.logger.warn(
        `Aucun email vérifié pour le navire ${vessel.name}. Alerte ignorée.`,
      );
      return;
    }
    const { subject, text, html } = this.templates.buildCertificateAlert(
      vessel,
      cert,
      prevAlarm,
    );
    await this.transport.send(
      { to: emails, subject, text, html },
      {
        vessel_name: vessel.name,
        certificate_name: cert.name,
        alarm_level: cert.alarm_status,
      },
    );
  }

  /** Envoie le code OTP pour vérification d'email de navire */
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const { subject, text, html } = this.templates.buildOtpVerification(otp);
    await this.transport.send({ to: email, subject, text, html });
  }

  /** Envoie l'email d'invitation à un nouvel utilisateur */
  async sendUserInvitationEmail(
    email: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const { subject, text, html } = this.templates.buildUserInvitation(
      name,
      otp,
    );
    await this.transport.send({ to: email, subject, text, html });
  }

  /**
   * Contrôle de conformité quotidien: vérifie tous les certificats de tous les navires.
   * Pour chaque certificat dont l'alarm_status a changé → met à jour la DB + envoie alerte.
   * Appelé par EmailScheduler via @Cron.
   */
  /**
   * Contrôle de conformité quotidien: vérifie tous les certificats de tous les navires.
   * Pour chaque certificat dont l'alarm_status a changé → met à jour la DB + envoie alerte.
   * Appelé par EmailScheduler via @Cron.
   */
  async performCertificateStatusCheck(): Promise<{
    checked: number;
    alerts: number;
  }> {
    this.logger.log('Démarrage du contrôle de conformité des certificats...');
    const vessels = await this.db.query('SELECT * FROM vessels');
    let totalChecked = 0;
    let totalAlertsSent = 0;

    for (const vessel of vessels) {
      const emailRows = await this.db.query(
        'SELECT email FROM vessel_emails WHERE vessel_id = ? AND is_verified = 1',
        [vessel.id],
      );
      const emails = emailRows.map((r) => r.email);

      const certs = await this.db.query(
        'SELECT * FROM certificates WHERE vessel_id = ?',
        [vessel.id],
      );

      for (const cert of certs) {
        const prevAlarm = cert.alarm_status;
        const newAlarm = this.alarmService.calculate(
          cert.due_date,
          cert.expiration_date,
          cert.window,
        );
        totalChecked++;

        if (this.alarmService.hasChanged(prevAlarm, newAlarm)) {
          await this.db.execute(
            'UPDATE certificates SET alarm_status = ? WHERE id = ?',
            [newAlarm, cert.id],
          );

          await this.sendCertificateAlert(
            vessel,
            emails,
            { ...cert, alarm_status: newAlarm },
            prevAlarm,
          );
          totalAlertsSent++;
        }
      }
    }

    this.logger.log(
      `Contrôle terminé. Vérifiés: ${totalChecked}, Alertes envoyées: ${totalAlertsSent}`,
    );
    return { checked: totalChecked, alerts: totalAlertsSent };
  }

  private matchesAlarmFilter(alarm: string, filter?: string): boolean {
    if (!filter || filter === 'ALL') return true;
    if (filter === 'RED') {
      return alarm.includes('RED') || alarm.includes('OVERDUE');
    }
    if (filter === 'YELLOW') {
      return alarm.includes('YELLOW');
    }
    if (filter === 'GREEN') {
      return alarm.includes('GREEN');
    }
    return false;
  }

  /**
   * Envoi manuel de notifications pour toute la flotte, filtré éventuellement par statut d'alarme.
   */
  async sendManualFleetNotifications(statusFilter?: string): Promise<{
    checked: number;
    alerts: number;
  }> {
    this.logger.log(
      `Démarrage de l'envoi manuel d'alertes pour la flotte. Filtre: ${
        statusFilter || 'ALL'
      }`,
    );
    const vessels = await this.db.query('SELECT * FROM vessels');
    let totalChecked = 0;
    let totalAlertsSent = 0;

    for (const vessel of vessels) {
      const emailRows = await this.db.query(
        'SELECT email FROM vessel_emails WHERE vessel_id = ? AND is_verified = 1',
        [vessel.id],
      );
      const emails = emailRows.map((r) => r.email);

      if (emails.length === 0) continue;

      const certs = await this.db.query(
        'SELECT * FROM certificates WHERE vessel_id = ?',
        [vessel.id],
      );

      for (const cert of certs) {
        const alarm = this.alarmService.calculate(
          cert.due_date,
          cert.expiration_date,
          cert.window,
        );
        totalChecked++;

        const matchesFilter = this.matchesAlarmFilter(alarm, statusFilter);
        const isWarning =
          alarm !== ALARM_LEVELS.MONITOR && alarm !== ALARM_LEVELS.NA;

        if (matchesFilter && isWarning) {
          await this.sendCertificateAlert(
            vessel,
            emails,
            { ...cert, alarm_status: alarm },
            cert.alarm_status,
          );
          totalAlertsSent++;
        }
      }
    }

    this.logger.log(
      `Envoi manuel flotte terminé. Vérifiés: ${totalChecked}, Alertes envoyées: ${totalAlertsSent}`,
    );
    return { checked: totalChecked, alerts: totalAlertsSent };
  }

  /**
   * Envoi manuel de notifications pour un navire spécifique, filtré éventuellement par statut d'alarme.
   */
  async sendManualVesselNotifications(
    vesselId: number,
    statusFilter?: string,
  ): Promise<{ alerts: number }> {
    this.logger.log(
      `Envoi manuel d'alertes pour le navire ${vesselId}. Filtre: ${
        statusFilter || 'ALL'
      }`,
    );
    const vessel = await this.db.queryOne('SELECT * FROM vessels WHERE id = ?', [vesselId]);
    if (!vessel) {
      throw new Error('Navire introuvable');
    }

    const emailRows = await this.db.query(
      'SELECT email FROM vessel_emails WHERE vessel_id = ? AND is_verified = 1',
      [vesselId],
    );
    const emails = emailRows.map((r) => r.email);

    if (emails.length === 0) {
      return { alerts: 0 };
    }

    const certs = await this.db.query(
      'SELECT * FROM certificates WHERE vessel_id = ?',
      [vesselId],
    );

    let totalAlertsSent = 0;
    for (const cert of certs) {
      const alarm = this.alarmService.calculate(
        cert.due_date,
        cert.expiration_date,
        cert.window,
      );

      const matchesFilter = this.matchesAlarmFilter(alarm, statusFilter);
      const isWarning =
        alarm !== ALARM_LEVELS.MONITOR && alarm !== ALARM_LEVELS.NA;

      if (matchesFilter && isWarning) {
        await this.sendCertificateAlert(
          vessel,
          emails,
          { ...cert, alarm_status: alarm },
          cert.alarm_status,
        );
        totalAlertsSent++;
      }
    }

    return { alerts: totalAlertsSent };
  }
}
