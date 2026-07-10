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
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const crew_vessel_guard_1 = require("../auth/crew-vessel.guard");
const audit_service_1 = require("../audit/audit.service");
let ActionableController = class ActionableController {
    actionableService;
    auditService;
    constructor(actionableService, auditService) {
        this.actionableService = actionableService;
        this.auditService = auditService;
    }
    async getByVessel(vesselId) {
        return await this.actionableService.getByVessel(parseInt(vesselId));
    }
    async create(req, vesselId, body) {
        if (!body.description) {
            throw new common_1.BadRequestException('La description est requise');
        }
        const id = await this.actionableService.insert({
            vessel_id: parseInt(vesselId),
            imposed_date: body.imposed_date,
            category: body.category,
            report_number: body.report_number,
            due_date: body.due_date,
            description: body.description,
        });
        await this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'CREATE_ACTIONABLE',
            target_type: 'actionable_item',
            target_id: id,
            target_name: body.description?.substring(0, 80),
        });
        return { id };
    }
    async updateStatus(req, id, body) {
        if (!body.status) {
            throw new common_1.BadRequestException('Le statut est requis');
        }
        await this.actionableService.updateStatus(parseInt(id), body.status);
        await this.auditService.log({
            user_id: req.user.id,
            user_email: req.user.email,
            action: 'UPDATE_ACTIONABLE_STATUS',
            target_type: 'actionable_item',
            target_id: parseInt(id),
            changes: { status: { from: 'previous', to: body.status } },
        });
        return { success: true };
    }
};
exports.ActionableController = ActionableController;
__decorate([
    (0, common_1.Get)('vessels/:vesselId/actionable-items'),
    (0, common_1.UseGuards)(crew_vessel_guard_1.CrewVesselGuard),
    __param(0, (0, common_1.Param)('vesselId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ActionableController.prototype, "getByVessel", null);
__decorate([
    (0, common_1.Post)('vessels/:vesselId/actionable-items'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('vesselId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ActionableController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('actionable-items/:id/status'),
    (0, roles_decorator_1.Roles)('Admin', 'Crew'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ActionableController.prototype, "updateStatus", null);
exports.ActionableController = ActionableController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [actionable_service_1.ActionableService,
        audit_service_1.AuditService])
], ActionableController);
//# sourceMappingURL=actionable.controller.js.map