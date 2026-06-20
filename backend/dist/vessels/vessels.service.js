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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VesselsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let VesselsService = class VesselsService {
    db;
    constructor(db) {
        this.db = db;
    }
    getAll(userId, role) {
        if (role === 'Admin') {
            return this.db.prepare('SELECT * FROM vessels').all();
        }
        else if (role === 'Crew') {
            const user = this.db
                .prepare('SELECT vessel_id FROM users WHERE id = ?')
                .get(userId);
            if (!user || !user.vessel_id)
                return [];
            return this.db
                .prepare('SELECT * FROM vessels WHERE id = ?')
                .all(user.vessel_id);
        }
        else if (role === 'Partner') {
            return this.db
                .prepare('SELECT * FROM vessels WHERE company_id = 1 OR manager = "Verital Marine Services"')
                .all();
        }
        else {
            return this.db.prepare('SELECT * FROM vessels').all();
        }
    }
    getById(id) {
        const vessel = this.db
            .prepare('SELECT * FROM vessels WHERE id = ?')
            .get(id);
        if (!vessel) {
            throw new common_1.NotFoundException('Navire non trouvé');
        }
        return vessel;
    }
    getByName(name) {
        return this.db
            .prepare('SELECT * FROM vessels WHERE name = ?')
            .get(name);
    }
    insert(v) {
        const stmt = this.db.prepare(`
      INSERT INTO vessels (company_id, name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(v.company_id ?? 2, v.name ?? null, v.imo_number ?? null, v.flag ?? null, v.asset_type ?? null, v.owner ?? null, v.manager ?? null, v.gross_tonnage ?? 0, v.deadweight_tonnage ?? 0, v.port_of_registry ?? null, v.call_sign ?? null, v.status ?? 'Normal');
        return info.lastInsertRowid;
    }
    updateStatus(id, status) {
        this.db
            .prepare('UPDATE vessels SET status = ? WHERE id = ?')
            .run(status, id);
    }
    delete(id) {
        this.db.prepare('DELETE FROM vessels WHERE id = ?').run(id);
    }
    runPythonScript(args) {
        return new Promise((resolve, reject) => {
            const pythonCmd = 'python';
            const scriptPath = path.resolve(process.cwd(), 'helpers', 'excel_handler.py');
            const cmdLine = `"${pythonCmd}" "${scriptPath}" ${args.map((x) => `"${x}"`).join(' ')}`;
            (0, child_process_1.exec)(cmdLine, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[VesselsService] python error:`, stderr);
                    return reject(error);
                }
                resolve(stdout);
            });
        });
    }
    async generateExcelExport(vesselId, lang) {
        const vessel = this.getById(vesselId);
        const certificates = this.db
            .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
            .all();
        const actionableItems = this.db
            .prepare('SELECT * FROM actionable_items WHERE vessel_id = ?')
            .all();
        const settings = this.db
            .prepare('SELECT * FROM email_settings WHERE vessel_id = ?')
            .get(vesselId) || {};
        const calculateAlarm = (dueDateStr, expDateStr) => {
            const target = dueDateStr || expDateStr;
            if (!target)
                return 'N/A';
            const diff = Math.ceil((new Date(target).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24));
            if (diff < 0)
                return 'OVERDUE / IMMEDIATE';
            if (diff <= 30)
                return 'RED - <1 MONTH';
            if (diff <= 90)
                return 'YELLOW - 1 TO 3 MONTHS';
            if (diff <= 180)
                return 'GREEN - 3 TO 6 MONTHS';
            return 'MONITOR >6 MONTHS';
        };
        const mappedCerts = certificates.map((c) => ({
            ...c,
            alarm_status: calculateAlarm(c.due_date, c.expiration_date),
        }));
        const exportData = {
            lang: lang || 'en',
            vessel: {
                name: vessel.name,
                imo_number: vessel.imo_number,
                flag: vessel.flag,
                report_date: new Date().toISOString().substring(0, 10),
                company: vessel.manager,
                year_built: vessel.year_built,
                class_status: 'Classed',
                asset_type: vessel.asset_type,
                overall_status: vessel.status,
                dwt: vessel.deadweight_tonnage,
                owner: vessel.owner,
                gross_tonnage: vessel.gross_tonnage,
                port_of_registry: vessel.port_of_registry,
                call_sign: vessel.call_sign,
            },
            emails: [settings.email1, settings.email2, settings.email3].filter(Boolean),
            certificates: mappedCerts,
            actionable_items: actionableItems,
        };
        const templatePath = path.resolve(process.cwd(), 'MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx');
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const tempJsonPath = path.resolve(uploadsDir, `export_${vesselId}.json`);
        const tempOutExcelPath = path.resolve(uploadsDir, `export_${vessel.name.replace(/\s+/g, '_')}.xlsx`);
        fs.writeFileSync(tempJsonPath, JSON.stringify(exportData, null, 2));
        await this.runPythonScript([
            'format',
            templatePath,
            tempOutExcelPath,
            tempJsonPath,
        ]);
        return {
            excelPath: tempOutExcelPath,
            jsonPath: tempJsonPath,
            fileName: `${vessel.name}_Certificate_Tracker.xlsx`,
        };
    }
};
exports.VesselsService = VesselsService;
exports.VesselsService = VesselsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], VesselsService);
//# sourceMappingURL=vessels.service.js.map