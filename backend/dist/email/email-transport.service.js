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
var EmailTransportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTransportService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
const database_service_1 = require("../database/database.service");
let EmailTransportService = EmailTransportService_1 = class EmailTransportService {
    db;
    logger = new common_1.Logger(EmailTransportService_1.name);
    transporter = null;
    fromAddress;
    isMock;
    constructor(db) {
        this.db = db;
        this.fromAddress =
            process.env.SMTP_FROM || '"Portail CNAN NORD" <alerts@cnan-nord.com>';
        this.initTransporter();
    }
    initTransporter() {
        const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        let transportConfig;
        if (provider === 'brevo') {
            transportConfig = {
                host: 'smtp-relay.brevo.com',
                port: 587,
                secure: false,
                auth: { user, pass },
            };
        }
        else {
            const host = process.env.SMTP_HOST;
            const port = parseInt(process.env.SMTP_PORT || '587', 10);
            transportConfig = {
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            };
        }
        const hasCredentials = user && pass && (provider === 'brevo' || !!transportConfig.host);
        if (hasCredentials) {
            this.transporter = nodemailer.createTransport(transportConfig);
            this.logger.log(`Email transport initialisé: ${provider.toUpperCase()} (utilisateur: ${user})`);
            this.isMock = false;
        }
        else {
            this.transporter = null;
            this.isMock = true;
            this.logger.warn('Aucune configuration email trouvée. Mode MOCK activé (emails loggés en console).');
            this.logger.warn('Pour activer Brevo: définir EMAIL_PROVIDER=brevo, SMTP_USER et SMTP_PASS dans .env');
        }
    }
    async send(options, logMeta) {
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
            }
            catch (err) {
                const msg = err.message;
                this.logger.error(`Échec envoi email à ${toStr}: ${msg}`);
                sentToDisplay = `ECHEC: ${msg}`;
            }
        }
        else {
            sentToDisplay = `[MOCK] ${toStr}`;
            this.logger.log(`[MOCK EMAIL] À: ${toStr} | Sujet: ${options.subject}`);
        }
        if (logMeta) {
            try {
                await this.db.execute(`INSERT INTO email_logs (vessel_name, certificate_name, alarm_level, sent_to, sent_at)
           VALUES (?, ?, ?, ?, ?)`, [
                    logMeta.vessel_name,
                    logMeta.certificate_name,
                    logMeta.alarm_level,
                    sentToDisplay,
                    new Date().toISOString().substring(0, 10),
                ]);
            }
            catch (dbErr) {
                this.logger.error('[EmailTransport] Failed to write email_log:', dbErr);
            }
        }
    }
};
exports.EmailTransportService = EmailTransportService;
exports.EmailTransportService = EmailTransportService = EmailTransportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EmailTransportService);
//# sourceMappingURL=email-transport.service.js.map