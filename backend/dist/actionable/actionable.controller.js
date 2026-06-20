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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionableController = void 0;
const common_1 = require("@nestjs/common");
const actionable_service_1 = require("./actionable.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ActionableController = class ActionableController {
    actionableService;
    constructor(actionableService) {
        this.actionableService = actionableService;
    }
    async getByVessel(req, vesselId) {
        if (req.user.role === 'Crew' && req.user.vessel_id != vesselId) {
            throw new common_1.ForbiddenException('Accès refusé pour ce navire');
        }
        return this.actionableService.getByVessel(parseInt(vesselId));
    }
    async create(req, vesselId, body) {
        if (req.user.role !== 'Admin') {
            throw new common_1.ForbiddenException('Action interdite pour votre profil');
        }
        if (!body.description) {
            throw new common_1.BadRequestException('La description est requise');
        }
        const id = this.actionableService.insert({
            vessel_id: parseInt(vesselId),
            imposed_date: body.imposed_date,
            category: body.category,
            report_number: body.report_number,
            due_date: body.due_date,
            description: body.description,
        });
        return { id };
    }
    async updateStatus(req, id, body) {
        if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
            throw new common_1.ForbiddenException('Action interdite pour votre profil');
        }
        if (!body.status) {
            throw new common_1.BadRequestException('Le statut est requis');
        }
        this.actionableService.updateStatus(parseInt(id), body.status);
        return { success: true };
    }
};
exports.ActionableController = ActionableController;
__decorate([
    (0, common_1.Get)('vessels/:vesselId/actionable-items'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('vesselId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ActionableController.prototype, "getByVessel", null);
__decorate([
    (0, common_1.Post)('vessels/:vesselId/actionable-items'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('vesselId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ActionableController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('actionable-items/:id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ActionableController.prototype, "updateStatus", null);
exports.ActionableController = ActionableController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [actionable_service_1.ActionableService])
], ActionableController);
//# sourceMappingURL=actionable.controller.js.map