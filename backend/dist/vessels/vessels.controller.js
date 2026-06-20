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
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const fs = __importStar(require("fs"));
function calculateAlarmStatus(dueDateStr, expirationDateStr) {
    const target = dueDateStr || expirationDateStr;
    if (!target)
        return 'N/A';
    const diff = Math.ceil((new Date(target).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0)
        return 'OVERDUE / IMMEDIATE';
    if (diff <= 30)
        return 'RED - <1 MONTH';
    if (diff <= 90)
        return 'YELLOW - 1 TO 3 MONTHS';
    if (diff <= 180)
        return 'GREEN - 3 TO 6 MONTHS';
    return 'MONITOR >6 MONTHS';
}
let VesselsController = class VesselsController {
    vesselsService;
    constructor(vesselsService) {
        this.vesselsService = vesselsService;
    }
    async getAll(req) {
        const vessels = this.vesselsService.getAll(req.user.id, req.user.role, req.user.companyId);
        return vessels.map(v => {
            const certs = this.vesselsService['db'].prepare('SELECT * FROM certificates WHERE vessel_id = ?').all(v.id);
            let red = 0, yellow = 0, green = 0, normal = 0;
            certs.forEach(c => {
                const alarm = calculateAlarmStatus(c.due_date, c.expiration_date);
                if (alarm.includes('RED') || alarm.includes('OVERDUE'))
                    red++;
                else if (alarm.includes('YELLOW'))
                    yellow++;
                else if (alarm.includes('GREEN'))
                    green++;
                else
                    normal++;
            });
            let overall = 'Normal';
            if (red > 0)
                overall = 'Imminent';
            else if (yellow > 0)
                overall = 'Attention';
            else if (green > 0)
                overall = 'Suivi';
            this.vesselsService.updateStatus(v.id, overall);
            return {
                ...v,
                status: overall,
                counts: { red, yellow, green, normal, total: certs.length }
            };
        });
    }
    async createManual(req, body) {
        if (req.user.role !== 'Admin') {
            throw new common_1.ForbiddenException('Action interdite pour votre profil');
        }
        if (!body.name) {
            throw new common_1.BadRequestException('Le nom du navire est requis');
        }
        const id = this.vesselsService.insert(body);
        this.vesselsService['db'].prepare('INSERT OR IGNORE INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)').run(id, '', '', '');
        return { id, name: body.name };
    }
    async delete(req, id) {
        if (req.user.role !== 'Admin') {
            throw new common_1.ForbiddenException('Action interdite pour votre profil');
        }
        this.vesselsService.delete(parseInt(id));
        return { success: true };
    }
    async importExcel(req, file) {
        if (req.user.role !== 'Admin') {
            if (file && fs.existsSync(file.path))
                fs.unlinkSync(file.path);
            throw new common_1.ForbiddenException('Action interdite pour votre profil');
        }
        if (!file) {
            throw new common_1.BadRequestException('Veuillez téléverser un fichier Excel');
        }
        try {
            const stdout = await this.vesselsService.runPythonScript(['parse', file.path]);
            const parsed = JSON.parse(stdout);
            const vInfo = parsed.vessel;
            const certs = parsed.certificates;
            const actionable = parsed.actionable_items;
            const existing = this.vesselsService.getByName(vInfo.name);
            if (existing) {
                fs.unlinkSync(file.path);
                throw new common_1.BadRequestException(`Le navire "${vInfo.name}" existe déjà dans le système`);
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
                status: vInfo.overall_status
            });
            this.vesselsService['db'].prepare('INSERT OR IGNORE INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)').run(vesselId, '', '', '');
            const insertCert = this.vesselsService['db'].prepare(`
        INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            for (const c of certs) {
                const alarm = calculateAlarmStatus(c.due_date, c.expiration_date);
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
            if (err) {
                console.error('[Export Error]', err);
            }
        });
    }
    async getSettings(vesselId) {
        let settings = this.vesselsService['db'].prepare('SELECT * FROM email_settings WHERE vessel_id = ?').get(parseInt(vesselId));
        if (!settings) {
            this.vesselsService['db'].prepare('INSERT OR IGNORE INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)').run(parseInt(vesselId), '', '', '');
            settings = { email1: '', email2: '', email3: '' };
        }
        return settings;
    }
    async updateSettings(req, vesselId, body) {
        if (req.user.role !== 'Admin') {
            throw new common_1.ForbiddenException('Action interdite pour votre profil');
        }
        this.vesselsService['db'].prepare(`
      INSERT OR REPLACE INTO email_settings (vessel_id, email1, email2, email3)
      VALUES (?, ?, ?, ?)
    `).run(parseInt(vesselId), body.email1 || '', body.email2 || '', body.email3 || '');
        return { success: true };
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
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "createManual", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, cb) => {
                cb(null, `import-${Date.now()}-${file.originalname}`);
            }
        })
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
    (0, common_1.Get)(':id/settings'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)(':id/settings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], VesselsController.prototype, "updateSettings", null);
exports.VesselsController = VesselsController = __decorate([
    (0, common_1.Controller)('vessels'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [vessels_service_1.VesselsService])
], VesselsController);
//# sourceMappingURL=vessels.controller.js.map