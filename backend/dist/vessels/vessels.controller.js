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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VesselsController = void 0;
const common_1 = require("@nestjs/common");
const vessels_service_1 = require("./vessels.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const alarm_service_1 = require("../alarm/alarm.service");
const audit_service_1 = require("../audit/audit.service");
const email_service_1 = require("../email/email.service");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const fs = __importStar(require("fs"));
let VesselsController = class VesselsController {
    vesselsService;
    emailService;
    alarmService;
    auditService;
    constructor(vesselsService, emailService, alarmService, auditService) {
        this.vesselsService = vesselsService;
        this.emailService = emailService;
        this.alarmService = alarmService;
        this.auditService = auditService;
    }
    async getAll(req) {
        const vessels = this.vesselsService.getAll(req.user.id, req.user.role);
        return vessels.map((v) => {
            const certs = this.vesselsService['db']
                .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
                .all(v.id);
            const alarmLevels = certs.map((c) => {
                const computed = this.alarmService.calculate(c.due_date, c.expiration_date, c.window);
                if (this.alarmService.hasChanged(c.alarm_status, computed)) {
                    this.vesselsService['db']
                        .prepare('UPDATE certificates SET alarm_status = ? WHERE id = ?')
                        .run(computed, c.id);
                }
                return computed;
            });
            const overall = this.alarmService.computeVesselStatus(alarmLevels);
            this.vesselsService.updateStatus(v.id, overall);
            const overdue = alarmLevels.filter((a) => a.includes('OVERDUE')).length;
            const red = alarmLevels.filter((a) => a.includes('RED')).length;
            const yellow = alarmLevels.filter((a) => a.includes('YELLOW')).length;
            const green = alarmLevels.filter((a) => a.includes('GREEN')).length;
            const normal = alarmLevels.filter((a) => a.includes('MONITOR')).length;
            return {
                ...v,
                status: overall,
                counts: { overdue, red, yellow, green, normal, total: certs.length },
            };
        });
    }
    async createManual(req, body) {
        if (!body.name) {
            throw new common_1.BadRequestException('Le nom du navire est requis');
        }
        const id = this.vesselsService.insert(body);
        this.vesselsService['db']
            .prepare('INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)')
            .run(id, req.user.email);
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'CREATE_VESSEL',
            target_type: 'vessel',
            target_id: id,
            target_name: body.name,
        });
        return { id, name: body.name };
    }
    async delete(req, id) {
        const vessel = this.vesselsService.getById(parseInt(id));
        this.vesselsService.delete(parseInt(id));
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'DELETE_VESSEL',
            target_type: 'vessel',
            target_id: parseInt(id),
            target_name: vessel?.name,
        });
        return { success: true };
    }
    async importExcel(req, file) {
        if (!file) {
            throw new common_1.BadRequestException('Veuillez téléverser un fichier Excel');
        }
        try {
            const stdout = await this.vesselsService.runPythonScript([
                'parse',
                file.path,
            ]);
            const parsed = JSON.parse(stdout);
            const vInfo = parsed.vessel;
            const certs = parsed.certificates;
            const actionable = parsed.actionable_items;
            const existing = this.vesselsService.getByName(vInfo.name);
            if (existing) {
                fs.unlinkSync(file.path);
                throw new common_1.BadRequestException(`Le navire "${vInfo.name}" existe déjà dans le système`);
            }
            if (vInfo.imo_number) {
                const existingImo = this.vesselsService.getByImo(String(vInfo.imo_number));
                if (existingImo) {
                    fs.unlinkSync(file.path);
                    throw new common_1.BadRequestException(`Le navire avec le numéro IMO "${vInfo.imo_number}" existe déjà ("${existingImo.name}")`);
                }
            }
            const vesselId = this.vesselsService.insert({
                company_id: 2,
                name: vInfo.name,
                imo_number: vInfo.imo_number,
                flag: vInfo.flag,
                asset_type: vInfo.asset_type,
                owner: vInfo.owner,
                manager: vInfo.company,
                gross_tonnage: vInfo.gross_tonnage,
                deadweight_tonnage: vInfo.dwt,
                port_of_registry: vInfo.port_of_registry,
                call_sign: vInfo.call_sign,
                status: vInfo.overall_status,
            });
            this.vesselsService['db']
                .prepare('INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)')
                .run(vesselId, req.user.email);
            const insertCert = this.vesselsService['db'].prepare(`
        INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            for (const c of certs) {
                const alarm = this.alarmService.calculate(c.due_date, c.expiration_date, c.window);
                insertCert.run(vesselId, c.name, c.category, c.organization, c.issuing_date, c.expiration_date, c.due_date, c.window, alarm, c.remarks);
            }
            const insertAct = this.vesselsService['db'].prepare(`
        INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
            for (const a of actionable) {
                insertAct.run(vesselId, a.imposed_date, a.category, a.report_number, a.due_date, a.description);
            }
            fs.unlinkSync(file.path);
            this.auditService.log({
                user_id: req.user.id,
                user_email: req.user.email,
                action: 'IMPORT_VESSEL',
                target_type: 'vessel',
                target_id: vesselId,
                target_name: vInfo.name,
            });
            return { success: true, vesselId, name: vInfo.name };
        }
        catch (err) {
            if (file && fs.existsSync(file.path))
                fs.unlinkSync(file.path);
            throw new common_1.BadRequestException('Erreur lors du traitement du fichier Excel: ' + err.message);
        }
    }
    async exportExcel(req, id, res) {
        const lang = req.query.lang || 'en';
        const { excelPath, jsonPath, fileName } = await this.vesselsService.generateExcelExport(parseInt(id), lang);
        res.download(excelPath, fileName, (err) => {
            if (fs.existsSync(jsonPath))
                fs.unlinkSync(jsonPath);
            if (fs.existsSync(excelPath))
                fs.unlinkSync(excelPath);
            if (err)
                console.error('[Export Error]', err);
        });
    }
    async getEmails(vesselId) {
        return this.vesselsService['db']
            .prepare('SELECT vessel_id, email, is_verified FROM vessel_emails WHERE vessel_id = ?')
            .all(parseInt(vesselId));
    }
    async addEmail(req, vesselId, body) {
        if (!body.email) {
            throw new common_1.BadRequestException("L'adresse e-mail est requise");
        }
        const email = body.email.toLowerCase().trim();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        this.vesselsService['db']
            .prepare(`INSERT OR REPLACE INTO vessel_emails (vessel_id, email, is_verified, otp_code, otp_expires)
         VALUES (?, ?, 0, ?, ?)`)
            .run(parseInt(vesselId), email, otp, expires);
        await this.emailService.sendOtpEmail(email, otp);
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'ADD_VESSEL_EMAIL',
            target_type: 'email',
            target_id: parseInt(vesselId),
            target_name: email,
        });
        const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
        const isProd = process.env.NODE_ENV === 'production';
        return {
            success: true,
            email,
            devOtp: smtpConfigured || isProd ? undefined : otp,
        };
    }
    async verifyEmail(req, vesselId, body) {
        if (!body.email || !body.code) {
            throw new common_1.BadRequestException("L'e-mail et le code de vérification sont requis");
        }
        const email = body.email.toLowerCase().trim();
        const code = body.code.trim();
        const record = this.vesselsService['db']
            .prepare('SELECT * FROM vessel_emails WHERE vessel_id = ? AND email = ?')
            .get(parseInt(vesselId), email);
        if (!record) {
            throw new common_1.BadRequestException('Adresse e-mail non trouvée pour ce navire');
        }
        if (record.is_verified) {
            return { success: true, message: 'E-mail déjà vérifié' };
        }
        if (record.otp_code !== code) {
            throw new common_1.BadRequestException('Code de vérification incorrect');
        }
        if (record.otp_expires && new Date(record.otp_expires) < new Date()) {
            throw new common_1.BadRequestException('Code de vérification expiré');
        }
        this.vesselsService['db']
            .prepare('UPDATE vessel_emails SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE vessel_id = ? AND email = ?')
            .run(parseInt(vesselId), email);
        return { success: true };
    }
    async removeEmail(req, vesselId, emailFromQuery, body) {
        const emailToDelete = emailFromQuery || body?.email;
        if (!emailToDelete) {
            throw new common_1.BadRequestException("L'e-mail à supprimer est requis");
        }
        const email = emailToDelete.toLowerCase().trim();
        this.vesselsService['db']
            .prepare('DELETE FROM vessel_emails WHERE vessel_id = ? AND email = ?')
            .run(parseInt(vesselId), email);
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'REMOVE_VESSEL_EMAIL',
            target_type: 'email',
            target_id: parseInt(vesselId),
            target_name: email,
        });
        return { success: true };
    }
    async triggerVesselNotifications(req, vesselId, status) {
        const result = await this.emailService.sendManualVesselNotifications(parseInt(vesselId), status);
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'TRIGGER_MANUAL_NOTIFICATION',
            target_type: 'vessel',
            target_id: parseInt(vesselId),
            target_name: `Status filter: ${status || 'ALL'}`,
        });
        return { success: true, ...result };
    }
};
exports.VesselsController = VesselsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Post)('manual'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "createManual", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, roles_decorator_1.Roles)('Admin'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, cb) => {
                cb(null, `import-${Date.now()}-${file.originalname}`);
            },
        }),
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "importExcel", null);
__decorate([
    (0, common_1.Get)(':id/export'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "exportExcel", null);
__decorate([
    (0, common_1.Get)(':id/emails'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "getEmails", null);
__decorate([
    (0, common_1.Post)(':id/emails'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "addEmail", null);
__decorate([
    (0, common_1.Post)(':id/emails/verify'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Delete)(':id/emails'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('email')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "removeEmail", null);
__decorate([
    (0, common_1.Post)(':id/trigger-notifications'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "triggerVesselNotifications", null);
exports.VesselsController = VesselsController = __decorate([
    (0, common_1.Controller)('vessels'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [vessels_service_1.VesselsService,
        email_service_1.EmailService,
        alarm_service_1.AlarmService,
        audit_service_1.AuditService])
], VesselsController);
//# sourceMappingURL=vessels.controller.js.map