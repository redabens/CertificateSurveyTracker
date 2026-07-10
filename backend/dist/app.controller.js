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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("./email/email.service");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
const database_service_1 = require("./database/database.service");
let AppController = class AppController {
    emailService;
    db;
    constructor(emailService, db) {
        this.emailService = emailService;
        this.db = db;
    }
    async triggerNotifications(status) {
        return this.emailService.sendManualFleetNotifications(status);
    }
    async getEmailLogs() {
        return this.db.query('SELECT * FROM email_logs ORDER BY id DESC');
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Post)('trigger-notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "triggerNotifications", null);
__decorate([
    (0, common_1.Get)('email-logs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getEmailLogs", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        database_service_1.DatabaseService])
], AppController);
//# sourceMappingURL=app.controller.js.map