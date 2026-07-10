import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
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
    private readonly prisma: PrismaService,
    private readonly alarmService: AlarmService,
    private readonly transport: EmailTransportService,
    private readonly templates: EmailTemplateService,
  ) {}

  private mapVesselToResponse(v: any) {
    return {
      id: v.id,
      company_id: v.companyId,
      name: v.name,
      imo_number: v.imoNumber,
      flag: v.flag,
      asset_type: v.assetType,
      owner: v.owner,
      manager: v.manager,
      gross_tonnage: v.grossTonnage,
      deadweight_tonnage: v.deadweightTonnage,
      port_of_registry: v.portOfRegistry,
      call_sign: v.callSign,
      year_built: v.yearBuilt,
      class_society: v.classSociety,
      status: v.status,
    };
  }

  private mapCertificateToResponse(c: any) {
    return {
      id: c.id,
      vessel_id: c.vesselId,
      name: c.name,
      category: c.category,
      organization: c.organization,
      issuing_date: c.issuingDate,
      expiration_date: c.expirationDate,
      due_date: c.dueDate,
      window: c.window,
      alarm_status: c.alarmStatus,
      pdf_url: c.pdfUrl,
      remarks: c.remarks,
    };
  }

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
  async performCertificateStatusCheck(): Promise<{
    checked: number;
    alerts: number;
  }> {
    this.logger.log('Démarrage du contrôle de conformité des certificats...');
    const rawVessels = await this.prisma.vessel.findMany();
    const vessels = rawVessels.map((v) => this.mapVesselToResponse(v));
    let totalChecked = 0;
    let totalAlertsSent = 0;

    for (const vessel of vessels) {
      const emailRows = await this.prisma.vesselEmail.findMany({
        where: { vesselId: vessel.id, isVerified: 1 },
        select: { email: true },
      });
      const emails = emailRows.map((r) => r.email);

      const rawCerts = await this.prisma.certificate.findMany({
        where: { vesselId: vessel.id },
      });
      const certs = rawCerts.map((c) => this.mapCertificateToResponse(c));

      for (const cert of certs) {
        const prevAlarm = cert.alarm_status;
        const newAlarm = this.alarmService.calculate(
          cert.due_date,
          cert.expiration_date,
          cert.window,
        );
        totalChecked++;

        if (this.alarmService.hasChanged(prevAlarm, newAlarm)) {
          await this.prisma.certificate.update({
            where: { id: cert.id },
            data: { alarmStatus: newAlarm },
          });

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
    const rawVessels = await this.prisma.vessel.findMany();
    const vessels = rawVessels.map((v) => this.mapVesselToResponse(v));
    let totalChecked = 0;
    let totalAlertsSent = 0;

    for (const vessel of vessels) {
      const emailRows = await this.prisma.vesselEmail.findMany({
        where: { vesselId: vessel.id, isVerified: 1 },
        select: { email: true },
      });
      const emails = emailRows.map((r) => r.email);

      if (emails.length === 0) continue;

      const rawCerts = await this.prisma.certificate.findMany({
        where: { vesselId: vessel.id },
      });
      const certs = rawCerts.map((c) => this.mapCertificateToResponse(c));

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
    const rawVessel = await this.prisma.vessel.findUnique({
      where: { id: vesselId },
    });
    if (!rawVessel) {
      throw new Error('Navire introuvable');
    }
    const vessel = this.mapVesselToResponse(rawVessel);

    const emailRows = await this.prisma.vesselEmail.findMany({
      where: { vesselId, isVerified: 1 },
      select: { email: true },
    });
    const emails = emailRows.map((r) => r.email);

    if (emails.length === 0) {
      return { alerts: 0 };
    }

    const rawCerts = await this.prisma.certificate.findMany({
      where: { vesselId },
    });
    const certs = rawCerts.map((c) => this.mapCertificateToResponse(c));

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
