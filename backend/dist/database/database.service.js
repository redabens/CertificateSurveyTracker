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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const node_sqlite_1 = require("node:sqlite");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const bcrypt = __importStar(require("bcryptjs"));
let DatabaseService = class DatabaseService {
    db;
    onModuleInit() {
        const isTest = process.env.NODE_ENV === 'test';
        const dataDir = process.env.DATA_DIR || process.cwd();
        const dbPath = isTest ? ':memory:' : path.resolve(dataDir, 'vessels.db');
        if (!isTest)
            fs.mkdirSync(dataDir, { recursive: true });
        const isNew = isTest || !fs.existsSync(dbPath);
        this.db = new node_sqlite_1.DatabaseSync(dbPath);
        this.createTables();
        if (isNew || this.isEmptyUsers()) {
            this.seedData();
        }
        this.migrateEmailSettings();
    }
    createTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS vessels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        name TEXT NOT NULL,
        imo_number TEXT UNIQUE,
        flag TEXT,
        asset_type TEXT,
        owner TEXT,
        manager TEXT,
        gross_tonnage INTEGER,
        deadweight_tonnage INTEGER,
        port_of_registry TEXT,
        call_sign TEXT,
        year_built INTEGER,
        class_society TEXT,
        status TEXT DEFAULT 'Normal',
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vessel_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        organization TEXT,
        issuing_date TEXT,
        expiration_date TEXT,
        due_date TEXT,
        window TEXT,
        alarm_status TEXT DEFAULT 'N/A',
        pdf_url TEXT,
        remarks TEXT,
        FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS actionable_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vessel_id INTEGER NOT NULL,
        item_id TEXT,
        imposed_date TEXT,
        category TEXT,
        report_number TEXT,
        due_date TEXT,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_settings (
        vessel_id INTEGER PRIMARY KEY,
        email1 TEXT,
        email2 TEXT,
        email3 TEXT,
        FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        target_name TEXT,
        changes TEXT,
        timestamp TEXT NOT NULL
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vessel_name TEXT NOT NULL,
        certificate_name TEXT NOT NULL,
        alarm_level TEXT NOT NULL,
        sent_to TEXT NOT NULL,
        sent_at TEXT NOT NULL
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        company_id INTEGER,
        vessel_id INTEGER,
        must_change_password INTEGER DEFAULT 1,
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (vessel_id) REFERENCES vessels(id)
      )
    `);
        try {
            this.db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 1`);
        }
        catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            if (!errMsg.includes('duplicate column name')) {
                console.warn(`[Database] Alert to check column 'must_change_password': ${errMsg}`);
            }
        }
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS vessel_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vessel_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        otp_code TEXT,
        otp_expires TEXT,
        FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE,
        UNIQUE(vessel_id, email)
      )
    `);
    }
    isEmptyUsers() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
        const result = stmt.get();
        return result.count === 0;
    }
    seedData() {
        console.log('[Database] Seeding initial mock data...');
        this.db.exec('DELETE FROM users');
        this.db.exec('DELETE FROM email_settings');
        this.db.exec('DELETE FROM companies');
        this.db.exec('DELETE FROM vessels');
        const insertCompany = this.db.prepare('INSERT INTO companies (name, role) VALUES (?, ?)');
        insertCompany.run('CNAN NORD', 'Admin');
        insertCompany.run('Verital Marine Services', 'Partner');
        insertCompany.run('Lloyds Register Algiers', 'Auditor');
        const insertVessel = this.db.prepare(`
      INSERT INTO vessels (company_id, name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        insertVessel.run(1, 'BABOR ALGERIEN', '9477189', 'Algeria', 'Products Tanker', 'CNAN', 'Verital Marine Services', 15000, 25000, 'Alger', '7TBC', 'Normal');
        this.db
            .prepare('INSERT INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)')
            .run(1, 'captain@babor.com', 'manager@babor.com', 'notifications@babor.com');
        const insertUser = this.db.prepare(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
        const salt = bcrypt.genSaltSync(10);
        const adminHash = bcrypt.hashSync('admin123', salt);
        const captainHash = bcrypt.hashSync('captain123', salt);
        const partnerHash = bcrypt.hashSync('partner123', salt);
        const auditorHash = bcrypt.hashSync('auditor123', salt);
        insertUser.run('admin@babor.com', adminHash, 'Mehdi', 'Admin', 1, null);
        insertUser.run('captain@babor.com', captainHash, 'Cdt. Babor', 'Crew', 1, 1);
        insertUser.run('partner@babor.com', partnerHash, 'Verital Marine Partner', 'Partner', 2, null);
        insertUser.run('auditor@babor.com', auditorHash, 'Inspecteur LR', 'Auditor', 3, null);
        console.log('[Database] Seed complete.');
    }
    migrateEmailSettings() {
        try {
            const count = this.db
                .prepare('SELECT COUNT(*) as cnt FROM vessel_emails')
                .get().cnt;
            if (count > 0) {
                return;
            }
            const rows = this.db
                .prepare('SELECT * FROM email_settings')
                .all();
            const insert = this.db.prepare('INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)');
            for (const row of rows) {
                if (row.email1)
                    insert.run(row.vessel_id, row.email1);
                if (row.email2)
                    insert.run(row.vessel_id, row.email2);
                if (row.email3)
                    insert.run(row.vessel_id, row.email3);
            }
        }
        catch (e) {
            console.warn('[Database] Email settings migration failed:', e instanceof Error ? e.message : e);
        }
    }
    prepare(sql) {
        return this.db.prepare(sql);
    }
    exec(sql) {
        return this.db.exec(sql);
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map