import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../database/database.service';

export interface MailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}

export interface EmailLogMeta {
  vessel_name: string;
  certificate_name: string;
  alarm_level: string;
}

/**
 * EmailTransportService — Gère la couche de transport email (SMTP / Brevo / Mock).
 *
 * SRP: Ce service NE fait QUE gérer l'envoi technique des emails.
 *      Il ne construit PAS les templates (→ EmailTemplateService).
 *      Il ne connaît PAS la logique métier des certificats (→ EmailService).
 *
 * ─── Configuration via variables d'environnement ──────────────────────────
 *
 * MODE BREVO (recommandé — gratuit jusqu'à 300 emails/jour):
 *   EMAIL_PROVIDER=brevo
 *   SMTP_USER=votre-email@domaine.com       ← email du compte Brevo
 *   SMTP_PASS=xsmtp-XXXXXXXXXXXXXXXX        ← clé SMTP depuis Brevo > SMTP & API > SMTP
 *   SMTP_FROM="Portail CNAN NORD" <alerts@cnan-nord.com>
 *
 *   Étapes Brevo:
 *     1. Créer un compte sur https://www.brevo.com (gratuit)
 *     2. Aller dans Paramètres > SMTP & API > onglet SMTP
 *     3. Cliquer "Générer une nouvelle clé SMTP"
 *     4. Copier la clé dans SMTP_PASS
 *
 * MODE SMTP GÉNÉRIQUE:
 *   EMAIL_PROVIDER=smtp
 *   SMTP_HOST=mail.votre-serveur.com
 *   SMTP_PORT=587
 *   SMTP_USER=user@domaine.com
 *   SMTP_PASS=mot-de-passe
 *
 * MODE MOCK (défaut si aucun credential):
 *   Emails logués en console uniquement. Aucun email réel envoyé.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Injectable()
export class EmailTransportService {
  private readonly logger = new Logger(EmailTransportService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly isMock: boolean;

  constructor(private readonly db: DatabaseService) {
    this.fromAddress =
      process.env.SMTP_FROM || '"Portail CNAN NORD" <alerts@cnan-nord.com>';
    this.initTransporter();
  }

  private initTransporter(): void {
    const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let transportConfig: nodemailer.TransportOptions;

    if (provider === 'brevo') {
      transportConfig = {
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user, pass },
      } as nodemailer.TransportOptions;
    } else {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      transportConfig = {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      } as nodemailer.TransportOptions;
    }

    const hasCredentials =
      user && pass && (provider === 'brevo' || !!(transportConfig as any).host);

    if (hasCredentials) {
      this.transporter = nodemailer.createTransport(transportConfig);
      this.logger.log(
        `Email transport initialisé: ${provider.toUpperCase()} (utilisateur: ${user})`,
      );
      (this as any).isMock = false;
    } else {
      this.transporter = null;
      (this as any).isMock = true;
      this.logger.warn(
        'Aucune configuration email trouvée. Mode MOCK activé (emails loggés en console).',
      );
      this.logger.warn(
        'Pour activer Brevo: définir EMAIL_PROVIDER=brevo, SMTP_USER et SMTP_PASS dans .env',
      );
    }
  }

  /**
   * Envoie un email via le transporteur configuré.
   * Si logMeta est fourni, enregistre l'envoi dans email_logs.
   */
  async send(options: MailOptions, logMeta?: EmailLogMeta): Promise<void> {
    const toStr = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;
    let sentToDisplay = toStr;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: toStr,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        this.logger.log(`Email envoyé à: ${toStr} | Sujet: ${options.subject}`);
      } catch (err) {
        const msg = (err as Error).message;
        this.logger.error(`Échec envoi email à ${toStr}: ${msg}`);
        sentToDisplay = `ECHEC: ${msg}`;
        // Ne pas propager pour les alertes (non-critique)
      }
    } else {
      sentToDisplay = `[MOCK] ${toStr}`;
      this.logger.log(`[MOCK EMAIL] À: ${toStr} | Sujet: ${options.subject}`);
    }

    if (logMeta) {
      try {
        this.db
          .prepare(
            `INSERT INTO email_logs (vessel_name, certificate_name, alarm_level, sent_to, sent_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            logMeta.vessel_name,
            logMeta.certificate_name,
            logMeta.alarm_level,
            sentToDisplay,
            new Date().toISOString().substring(0, 10),
          );
      } catch (dbErr) {
        this.logger.error('[EmailTransport] Failed to write email_log:', dbErr);
      }
    }
  }
}
