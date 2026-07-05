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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let AuditService = class AuditService {
    db;
    constructor(db) {
        this.db = db;
    }
    log(entry) {
        try {
            this.db
                .prepare(`INSERT INTO audit_logs
            (user_id, user_email, action, target_type, target_id, target_name, changes, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(entry.user_id, entry.user_email, entry.action, entry.target_type, entry.target_id ?? null, entry.target_name ?? null, entry.changes ? JSON.stringify(entry.changes) : null, new Date().toISOString());
        }
        catch (err) {
            console.error('[AuditService] Failed to write audit log:', err);
        }
    }
    getAll(limit = 200) {
        return this.db
            .prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?')
            .all(limit);
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuditService);
//# sourceMappingURL=audit.service.js.map