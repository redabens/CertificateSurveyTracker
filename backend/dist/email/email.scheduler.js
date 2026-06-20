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
var EmailScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const email_service_1 = require("./email.service");
let EmailScheduler = EmailScheduler_1 = class EmailScheduler {
    emailService;
    logger = new common_1.Logger(EmailScheduler_1.name);
    constructor(emailService) {
        this.emailService = emailService;
    }
    async handleDailyCheck() {
        this.logger.log('Daily cron triggered for certificate status check.');
        try {
            await this.emailService.performCertificateStatusCheck();
        }
        catch (err) {
            this.logger.error('Failed to run daily certificate compliance check: ' + err.message);
        }
    }
};
exports.EmailScheduler = EmailScheduler;
__decorate([
    (0, schedule_1.Cron)('0 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailScheduler.prototype, "handleDailyCheck", null);
exports.EmailScheduler = EmailScheduler = EmailScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], EmailScheduler);
//# sourceMappingURL=email.scheduler.js.map