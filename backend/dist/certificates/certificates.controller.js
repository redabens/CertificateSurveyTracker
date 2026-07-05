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
exports.CertificatesController = void 0;
const common_1 = require("@nestjs/common");
const certificates_service_1 = require("./certificates.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const crew_vessel_guard_1 = require("../auth/crew-vessel.guard");
const alarm_service_1 = require("../alarm/alarm.service");
const audit_service_1 = require("../audit/audit.service");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let CertificatesController = class CertificatesController {
    certsService;
    alarmService;
    auditService;
    constructor(certsService, alarmService, auditService) {
        this.certsService = certsService;
        this.alarmService = alarmService;
        this.auditService = auditService;
    }
    async getByVessel(req, vesselId) {
        const certs = this.certsService.getByVessel(parseInt(vesselId));
        return certs.map((c) => ({
            ...c,
            alarm_status: this.alarmService.calculate(c.due_date, c.expiration_date),
        }));
    }
    async create(req, vesselId, body) {
        if (!body.name || !body.category) {
            throw new common_1.BadRequestException('Le nom et la catégorie sont requis');
        }
        this.certsService.assertCrewCanAccess(req.user.role, body.category, 'créer');
        const alarm = this.alarmService.calculate(body.due_date, body.expiration_date);
        const certId = this.certsService.insert({
            vessel_id: parseInt(vesselId),
            name: body.name,
            category: body.category,
            organization: body.organization,
            issuing_date: body.issuing_date,
            expiration_date: body.expiration_date,
            due_date: body.due_date,
            window: body.window,
            alarm_status: alarm,
            remarks: body.remarks,
        });
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'CREATE_CERTIFICATE',
            target_type: 'certificate',
            target_id: certId,
            target_name: body.name,
        });
        return { id: certId, alarm_status: alarm };
    }
    async update(req, id, body) {
        const prevCert = this.certsService.getById(parseInt(id));
        if (!prevCert) {
            throw new common_1.NotFoundException('Certificat non trouvé');
        }
        this.certsService.assertCrewCanAccess(req.user.role, prevCert.category, 'modifier');
        const alarm = this.alarmService.calculate(body.due_date, body.expiration_date);
        const changes = {};
        for (const field of [
            'expiration_date',
            'due_date',
            'organization',
            'remarks',
            'window',
        ]) {
            if (body[field] !== undefined && body[field] !== prevCert[field]) {
                changes[field] = { from: prevCert[field], to: body[field] };
            }
        }
        this.certsService.update(parseInt(id), { ...body, alarm_status: alarm });
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'UPDATE_CERTIFICATE',
            target_type: 'certificate',
            target_id: parseInt(id),
            target_name: prevCert.name,
            changes: Object.keys(changes).length > 0 ? changes : undefined,
        });
        return { success: true, alarm_status: alarm };
    }
    async delete(req, id) {
        const cert = this.certsService.getById(parseInt(id));
        this.certsService.delete(parseInt(id));
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'DELETE_CERTIFICATE',
            target_type: 'certificate',
            target_id: parseInt(id),
            target_name: cert?.name,
        });
        return { success: true };
    }
    async uploadPdf(req, id, file) {
        const cert = this.certsService.getById(parseInt(id));
        if (!cert) {
            if (file && fs.existsSync(file.path))
                fs.unlinkSync(file.path);
            throw new common_1.NotFoundException('Certificat non trouvé');
        }
        try {
            this.certsService.assertCrewCanAccess(req.user.role, cert.category, 'uploader un PDF');
        }
        catch (err) {
            if (file && fs.existsSync(file.path))
                fs.unlinkSync(file.path);
            throw err;
        }
        if (!file) {
            throw new common_1.BadRequestException('Aucun fichier PDF téléversé');
        }
        const relativePath = `/uploads/pdf/${file.filename}`;
        this.certsService.updatePdfUrl(parseInt(id), relativePath);
        this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'UPLOAD_PDF',
            target_type: 'certificate',
            target_id: parseInt(id),
            target_name: cert.name,
        });
        return { success: true, pdf_url: relativePath };
    }
};
exports.CertificatesController = CertificatesController;
__decorate([
    (0, common_1.Get)('vessels/:vesselId/certificates'),
    (0, common_1.UseGuards)(crew_vessel_guard_1.CrewVesselGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('vesselId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CertificatesController.prototype, "getByVessel", null);
__decorate([
    (0, common_1.Post)('vessels/:vesselId/certificates'),
    (0, roles_decorator_1.Roles)('Admin', 'Crew'),
    (0, common_1.UseGuards)(crew_vessel_guard_1.CrewVesselGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('vesselId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CertificatesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('certificates/:id'),
    (0, roles_decorator_1.Roles)('Admin', 'Crew'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CertificatesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('certificates/:id'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CertificatesController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('certificates/:id/upload'),
    (0, roles_decorator_1.Roles)('Admin', 'Crew'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('pdf', {
        storage: (0, multer_1.diskStorage)({
            destination: (req, file, cb) => {
                const uploadDir = path.resolve(process.cwd(), 'uploads', 'pdf');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `cert-${uniqueSuffix}${path.extname(file.originalname)}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/pdf') {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Seuls les fichiers PDF sont acceptés.'), false);
            }
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CertificatesController.prototype, "uploadPdf", null);
exports.CertificatesController = CertificatesController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [certificates_service_1.CertificatesService,
        alarm_service_1.AlarmService,
        audit_service_1.AuditService])
], CertificatesController);
//# sourceMappingURL=certificates.controller.js.map