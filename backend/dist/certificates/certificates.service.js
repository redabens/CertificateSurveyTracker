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
    async getByVessel(vesselId) {
        return this.db.query('SELECT * FROM certificates WHERE vessel_id = ?', [vesselId]);
    }
    async getById(id) {
        return this.db.queryOne('SELECT * FROM certificates WHERE id = ?', [id]);
    }
    async insert(c) {
        const row = await this.db.queryOne(`
      INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
            c.vessel_id ?? null,
            c.name ?? null,
            c.category ?? null,
            c.organization ?? null,
            c.issuing_date ?? null,
            c.expiration_date ?? null,
            c.due_date ?? null,
            c.window ?? null,
            c.alarm_status ?? 'N/A',
            c.remarks ?? null,
        ]);
        return row ? row.id : 0;
    }
    async update(id, c) {
        await this.db.execute(`UPDATE certificates
       SET organization = ?, issuing_date = ?, expiration_date = ?, due_date = ?,
           window = ?, alarm_status = ?, remarks = ?
       WHERE id = ?`, [
            c.organization ?? null,
            c.issuing_date ?? null,
            c.expiration_date ?? null,
            c.due_date ?? null,
            c.window ?? null,
            c.alarm_status ?? 'N/A',
            c.remarks ?? null,
            id,
        ]);
    }
    async updatePdfUrl(id, pdfUrl) {
        await this.db.execute('UPDATE certificates SET pdf_url = ? WHERE id = ?', [pdfUrl, id]);
    }
    async delete(id) {
        await this.db.execute('DELETE FROM certificates WHERE id = ?', [id]);
    }
    assertCrewCanAccess(role, category, action) {
        if (role === 'Crew' && category !== 'Servicing') {
            throw new common_1.ForbiddenException(`L'équipage ne peut ${action} que des certificats d'entretien (Servicing). Catégorie demandée: ${category}.`);
        }
    }
};
exports.CertificatesService = CertificatesService;
exports.CertificatesService = CertificatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CertificatesService);
//# sourceMappingURL=certificates.service.js.map