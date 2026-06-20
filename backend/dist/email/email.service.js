"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    db;
    logger = new common_1.Logger(EmailService_1.name);
    transporter;
    constructor(db) {
        this.db = db;
        this.initTransporter();
    }
    initTransporter() {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '') || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.logger.log(`SMTP configured for: ${host}:${port}`);
        }
        else {
            this.transporter = null;
            this.logger.warn('SMTP host/credentials not configured. Falling back to MOCK email logs.');
        }
    }
    async sendCertificateAlert(vessel, emails, cert, prevAlarm) {
        const today = new Date().toISOString().substring(0, 10);
        const alarmLevel = cert.alarm_status;
        const emailList = emails.join(', ');
        if (!emailList) {
            this.logger.warn(`No notification emails set for vessel: ${vessel.name}. Alert skipped.`);
            return;
        }
        const subject = `[BABOR TRACKER ALERT] ${vessel.name} - Certificate Status Shift to ${alarmLevel}`;
        const textContent = `
      Vessel: ${vessel.name}
      IMO: ${vessel.imo_number}
      Technical Manager: ${vessel.manager}

      Certificate: ${cert.name}
      Previous status: ${prevAlarm}
      Current status: ${alarmLevel}
      Expiration date: ${cert.expiration_date || 'N/A'}
      Survey due date: ${cert.due_date || 'N/A'}
      Remarks: ${cert.remarks || 'None'}

      Please check the Babor Tracker platform for details.
    `;
        const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #1a202c;">
        <div style="background-color: #1a202c; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">🚢 Babor Tracker - Alerte Maritime</h2>
        </div>
        <div style="padding: 24px; line-height: 1.6;">
          <h3 style="color: #dd6b20; margin-top: 0;">Changement de Statut d'Alerte détecté</h3>
          <p>Le certificat <strong>${cert.name}</strong> du navire <strong>${vessel.name}</strong> a changé de statut.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold; width: 40%;">Navire</td><td style="padding: 8px;">${vessel.name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">IMO</td><td style="padding: 8px;">${vessel.imo_number || 'N/A'}</td></tr>
            <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Certificat / Survey</td><td style="padding: 8px;">${cert.name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Statut Précédent</td><td style="padding: 8px; color: #718096;">${prevAlarm}</td></tr>
            <tr style="background: #fffaf0;"><td style="padding: 8px; font-weight: bold;">Nouveau Statut</td><td style="padding: 8px; font-weight: bold; color: ${alarmLevel.includes('RED') ? '#e53e3e' : '#dd6b20'};">${alarmLevel}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Date d'Expiration</td><td style="padding: 8px;">${cert.expiration_date || 'N/A'}</td></tr>
            <tr style="background: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Échéance / Date de Visite</td><td style="padding: 8px; font-weight: bold;">${cert.due_date || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Remarques</td><td style="padding: 8px; font-style: italic; color: #718096;">${cert.remarks || '-'}</td></tr>
          </table>

          <p style="font-size: 13px; color: #718096; margin-top: 24px;">Cette alerte automatique a été déclenchée à la suite du calcul quotidien du statut de conformité.</p>
        </div>
        <div style="background-color: #edf2f7; padding: 12px; text-align: center; font-size: 11px; color: #718096;">
          &copy; 2026 CNAN NORD / Verital Marine. Tous droits réservés.
        </div>
      </div>
    `;
        let success = false;
        let sentToDisplay = emailList;
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Babor Tracker Alerts" <alerts@babor.com>',
                    to: emailList,
                    subject,
                    text: textContent,
                    html: htmlContent,
                });
                success = true;
                this.logger.log(`Email alert sent successfully to: ${emailList}`);
            }
            catch (err) {
                this.logger.error(`Failed to send email to ${emailList}: ${err.message}`);
                sentToDisplay = `Echec: ${err.message}`;
            }
        }
        else {
            success = true;
            sentToDisplay = `Mock Sent: ${emailList}`;
            this.logger.log(`[MOCK EMAIL] Dispatching alert for ${cert.name} (Vessel: ${vessel.name}) to ${emailList}`);
        }
        this.db.prepare(`
      INSERT INTO email_logs (vessel_name, certificate_name, alarm_level, sent_to, sent_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(vessel.name, cert.name, alarmLevel, sentToDisplay, today);
    }
    calculateAlarmStatus(dueDateStr, expirationDateStr) {
        const targetDateStr = dueDateStr || expirationDateStr;
        if (!targetDateStr)
            return 'N/A';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(targetDateStr);
        target.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return 'OVERDUE / IMMEDIATE';
        }
        else if (diffDays <= 30) {
            return 'RED - <1 MONTH';
        }
        else if (diffDays <= 90) {
            return 'YELLOW - 1 TO 3 MONTHS';
        }
        else if (diffDays <= 180) {
            return 'GREEN - 3 TO 6 MONTHS';
        }
        else {
            return 'MONITOR >6 MONTHS';
        }
    }
    async performCertificateStatusCheck() {
        this.logger.log('Starting daily certificate compliance and alarm status check...');
        const vessels = this.db.prepare('SELECT * FROM vessels').all();
        let totalChecked = 0;
        let totalAlertsSent = 0;
        for (const vessel of vessels) {
            const settings = this.db.prepare('SELECT * FROM email_settings WHERE vessel_id = ?').get(vessel.id) || {};
            const emails = [settings.email1, settings.email2, settings.email3].filter(Boolean);
            const certs = this.db.prepare('SELECT * FROM certificates WHERE vessel_id = ?').all();
            for (const cert of certs) {
                const prevAlarm = cert.alarm_status;
                const newAlarm = this.calculateAlarmStatus(cert.due_date, cert.expiration_date);
                totalChecked++;
                if (prevAlarm !== newAlarm) {
                    this.db.prepare('UPDATE certificates SET alarm_status = ? WHERE id = ?').run(newAlarm, cert.id);
                    const updatedCert = { ...cert, alarm_status: newAlarm };
                    await this.sendCertificateAlert(vessel, emails, updatedCert, prevAlarm);
                    totalAlertsSent++;
                }
            }
        }
        this.logger.log(`Compliance check completed. Checked: ${totalChecked}, Alerts sent: ${totalAlertsSent}`);
        return { checked: totalChecked, alerts: totalAlertsSent };
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EmailService);
//# sourceMappingURL=email.service.js.map