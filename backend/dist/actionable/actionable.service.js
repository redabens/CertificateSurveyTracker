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
exports.ActionableService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let ActionableService = class ActionableService {
    db;
    constructor(db) {
        this.db = db;
    }
    getByVessel(vesselId) {
        return this.db
            .prepare('SELECT * FROM actionable_items WHERE vessel_id = ?')
            .all(vesselId);
    }
    insert(a) {
        const stmt = this.db.prepare(`
      INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(a.vessel_id ?? null, a.imposed_date ?? null, a.category ?? null, a.report_number ?? null, a.due_date ?? null, a.description ?? null);
        return info.lastInsertRowid;
    }
    updateStatus(id, status) {
        this.db
            .prepare('UPDATE actionable_items SET status = ? WHERE id = ?')
            .run(status, id);
    }
};
exports.ActionableService = ActionableService;
exports.ActionableService = ActionableService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ActionableService);
//# sourceMappingURL=actionable.service.js.map