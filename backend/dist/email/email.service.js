"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const alarm_service_1 = require("../alarm/alarm.service");
const email_transport_service_1 = require("./email-transport.service");
const email_template_service_1 = require("./email-template.service");
let EmailService = EmailService_1 = class EmailService {
    db;
    alarmService;
    transport;
    templates;
    logger = new common_1.Logger(EmailService_1.name);
    constructor(db, alarmService, transport, templates) {
        this.db = db;
        this.alarmService = alarmService;
        this.transport = transport;
        this.templates = templates;
    }
    async sendCertificateAlert(vessel, emails, cert, prevAlarm) {
        if (emails.length === 0) {
            this.logger.warn(`Aucun email vérifié pour le navire ${vessel.name}. Alerte ignorée.`);
            return;
        }
        const { subject, text, html } = this.templates.buildCertificateAlert(vessel, cert, prevAlarm);
        await this.transport.send({ to: emails, subject, text, html }, {
            vessel_name: vessel.name,
            certificate_name: cert.name,
            alarm_level: cert.alarm_status,
        });
    }
    async sendOtpEmail(email, otp) {
        const { subject, text, html } = this.templates.buildOtpVerification(otp);
        await this.transport.send({ to: email, subject, text, html });
    }
    async sendUserInvitationEmail(email, name, otp) {
        const { subject, text, html } = this.templates.buildUserInvitation(name, otp);
        await this.transport.send({ to: email, subject, text, html });
    }
    async performCertificateStatusCheck() {
        this.logger.log('Démarrage du contrôle de conformité des certificats...');
        const vessels = await this.db.query('SELECT * FROM vessels');
        let totalChecked = 0;
        let totalAlertsSent = 0;
        for (const vessel of vessels) {
            const emailRows = await this.db.query('SELECT email FROM vessel_emails WHERE vessel_id = ? AND is_verified = 1', [vessel.id]);
            const emails = emailRows.map((r) => r.email);
            const certs = await this.db.query('SELECT * FROM certificates WHERE vessel_id = ?', [vessel.id]);
            for (const cert of certs) {
                const prevAlarm = cert.alarm_status;
                const newAlarm = this.alarmService.calculate(cert.due_date, cert.expiration_date, cert.window);
                totalChecked++;
                if (this.alarmService.hasChanged(prevAlarm, newAlarm)) {
                    await this.db.execute('UPDATE certificates SET alarm_status = ? WHERE id = ?', [newAlarm, cert.id]);
                    await this.sendCertificateAlert(vessel, emails, { ...cert, alarm_status: newAlarm }, prevAlarm);
                    totalAlertsSent++;
                }
            }
        }
        this.logger.log(`Contrôle terminé. Vérifiés: ${totalChecked}, Alertes envoyées: ${totalAlertsSent}`);
        return { checked: totalChecked, alerts: totalAlertsSent };
    }
    matchesAlarmFilter(alarm, filter) {
        if (!filter || filter === 'ALL')
            return true;
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
    async sendManualFleetNotifications(statusFilter) {
        this.logger.log(`Démarrage de l'envoi manuel d'alertes pour la flotte. Filtre: ${statusFilter || 'ALL'}`);
        const vessels = await this.db.query('SELECT * FROM vessels');
        let totalChecked = 0;
        let totalAlertsSent = 0;
        for (const vessel of vessels) {
            const emailRows = await this.db.query('SELECT email FROM vessel_emails WHERE vessel_id = ? AND is_verified = 1', [vessel.id]);
            const emails = emailRows.map((r) => r.email);
            if (emails.length === 0)
                continue;
            const certs = await this.db.query('SELECT * FROM certificates WHERE vessel_id = ?', [vessel.id]);
            for (const cert of certs) {
                const alarm = this.alarmService.calculate(cert.due_date, cert.expiration_date, cert.window);
                totalChecked++;
                const matchesFilter = this.matchesAlarmFilter(alarm, statusFilter);
                const isWarning = alarm !== alarm_service_1.ALARM_LEVELS.MONITOR && alarm !== alarm_service_1.ALARM_LEVELS.NA;
                if (matchesFilter && isWarning) {
                    await this.sendCertificateAlert(vessel, emails, { ...cert, alarm_status: alarm }, cert.alarm_status);
                    totalAlertsSent++;
                }
            }
        }
        this.logger.log(`Envoi manuel flotte terminé. Vérifiés: ${totalChecked}, Alertes envoyées: ${totalAlertsSent}`);
        return { checked: totalChecked, alerts: totalAlertsSent };
    }
    async sendManualVesselNotifications(vesselId, statusFilter) {
        this.logger.log(`Envoi manuel d'alertes pour le navire ${vesselId}. Filtre: ${statusFilter || 'ALL'}`);
        const vessel = await this.db.queryOne('SELECT * FROM vessels WHERE id = ?', [vesselId]);
        if (!vessel) {
            throw new Error('Navire introuvable');
        }
        const emailRows = await this.db.query('SELECT email FROM vessel_emails WHERE vessel_id = ? AND is_verified = 1', [vesselId]);
        const emails = emailRows.map((r) => r.email);
        if (emails.length === 0) {
            return { alerts: 0 };
        }
        const certs = await this.db.query('SELECT * FROM certificates WHERE vessel_id = ?', [vesselId]);
        let totalAlertsSent = 0;
        for (const cert of certs) {
            const alarm = this.alarmService.calculate(cert.due_date, cert.expiration_date, cert.window);
            const matchesFilter = this.matchesAlarmFilter(alarm, statusFilter);
            const isWarning = alarm !== alarm_service_1.ALARM_LEVELS.MONITOR && alarm !== alarm_service_1.ALARM_LEVELS.NA;
            if (matchesFilter && isWarning) {
                await this.sendCertificateAlert(vessel, emails, { ...cert, alarm_status: alarm }, cert.alarm_status);
                totalAlertsSent++;
            }
        }
        return { alerts: totalAlertsSent };
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        alarm_service_1.AlarmService,
        email_transport_service_1.EmailTransportService,
        email_template_service_1.EmailTemplateService])
], EmailService);
//# sourceMappingURL=email.service.js.map