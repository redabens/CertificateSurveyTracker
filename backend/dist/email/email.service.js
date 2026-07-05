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
        const vessels = this.db.prepare('SELECT * FROM vessels').all();
        let totalChecked = 0;
        let totalAlertsSent = 0;
        for (const vessel of vessels) {
            const emails = this.db
                .prepare('SELECT email FROM vessel_emails WHERE vessel_id = ? AND is_verified = 1')
                .all(vessel.id).map((r) => r.email);
            const certs = this.db
                .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
                .all(vessel.id);
            for (const cert of certs) {
                const prevAlarm = cert.alarm_status;
                const newAlarm = this.alarmService.calculate(cert.due_date, cert.expiration_date);
                totalChecked++;
                if (this.alarmService.hasChanged(prevAlarm, newAlarm)) {
                    this.db
                        .prepare('UPDATE certificates SET alarm_status = ? WHERE id = ?')
                        .run(newAlarm, cert.id);
                    await this.sendCertificateAlert(vessel, emails, { ...cert, alarm_status: newAlarm }, prevAlarm);
                    totalAlertsSent++;
                }
            }
        }
        this.logger.log(`Contrôle terminé. Vérifiés: ${totalChecked}, Alertes envoyées: ${totalAlertsSent}`);
        return { checked: totalChecked, alerts: totalAlertsSent };
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