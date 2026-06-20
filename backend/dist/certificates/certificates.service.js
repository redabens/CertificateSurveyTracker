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
exports.CertificatesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let CertificatesService = class CertificatesService {
    db;
    constructor(db) {
        this.db = db;
    }
    getByVessel(vesselId) {
        return this.db
            .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
            .all(vesselId);
    }
    getById(id) {
        return this.db
            .prepare('SELECT * FROM certificates WHERE id = ?')
            .get(id);
    }
    insert(c) {
        const stmt = this.db.prepare(`
      INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(c.vessel_id, c.name, c.category, c.organization, c.issuing_date, c.expiration_date, c.due_date, c.window, c.alarm_status || 'N/A', c.remarks);
        return info.lastInsertRowid;
    }
    update(id, c) {
        this.db
            .prepare(`
      UPDATE certificates
      SET organization = ?, issuing_date = ?, expiration_date = ?, due_date = ?, window = ?, alarm_status = ?, remarks = ?
      WHERE id = ?
    `)
            .run(c.organization, c.issuing_date, c.expiration_date, c.due_date, c.window, c.alarm_status || 'N/A', c.remarks, id);
    }
    updatePdfUrl(id, pdfUrl) {
        this.db
            .prepare('UPDATE certificates SET pdf_url = ? WHERE id = ?')
            .run(pdfUrl, id);
    }
    delete(id) {
        this.db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
    }
};
exports.CertificatesService = CertificatesService;
exports.CertificatesService = CertificatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CertificatesService);
//# sourceMappingURL=certificates.service.js.map