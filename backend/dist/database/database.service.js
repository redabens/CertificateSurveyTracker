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
const pg_1 = require("pg");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const bcrypt = __importStar(require("bcryptjs"));
let DatabaseService = class DatabaseService {
    sqlite;
    pool;
    useSqlite = false;
    async onModuleInit() {
        const isTest = process.env.NODE_ENV === 'test';
        const useSqliteEnv = process.env.USE_SQLITE === 'true';
        this.useSqlite = isTest || useSqliteEnv || (!process.env.DB_HOST && !process.env.DATABASE_URL);
        if (this.useSqlite) {
            console.log('[Database] Initializing in SQLite mode...');
            const dataDir = process.env.DATA_DIR || process.cwd();
            const dbPath = isTest ? ':memory:' : path.resolve(dataDir, 'vessels.db');
            if (!isTest)
                fs.mkdirSync(dataDir, { recursive: true });
            this.sqlite = new node_sqlite_1.DatabaseSync(dbPath);
        }
        else {
            console.log('[Database] Initializing in PostgreSQL mode...');
            const connectionString = process.env.DATABASE_URL;
            this.pool = new pg_1.Pool(connectionString
                ? { connectionString }
                : {
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || '5432'),
                    user: process.env.DB_USER || 'postgres',
                    password: process.env.DB_PASSWORD || 'postgres',
                    database: process.env.DB_NAME || 'vessel_tracker',
                });
        }
        await this.createTables();
        if (await this.isEmptyUsers()) {
            await this.seedData();
        }
        await this.migrateEmailSettings();
    }
    async createTables() {
        await this.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);
        await this.exec(`
      CREATE TABLE IF NOT EXISTS vessels (
        id SERIAL PRIMARY KEY,
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
        await this.exec(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
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
        await this.exec(`
      CREATE TABLE IF NOT EXISTS actionable_items (
        id SERIAL PRIMARY KEY,
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
        await this.exec(`
      CREATE TABLE IF NOT EXISTS email_settings (
        vessel_id INTEGER PRIMARY KEY,
        email1 TEXT,
        email2 TEXT,
        email3 TEXT,
        FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
      )
    `);
        await this.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
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
        await this.exec(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        vessel_name TEXT NOT NULL,
        certificate_name TEXT NOT NULL,
        alarm_level TEXT NOT NULL,
        sent_to TEXT NOT NULL,
        sent_at TEXT NOT NULL
      )
    `);
        await this.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
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
            await this.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 1`);
        }
        catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            if (!errMsg.includes('duplicate column name') && !errMsg.includes('already exists') && !errMsg.includes('duplicate column')) {
                console.warn(`[Database] Alert to check column 'must_change_password': ${errMsg}`);
            }
        }
        await this.exec(`
      CREATE TABLE IF NOT EXISTS vessel_emails (
        id SERIAL PRIMARY KEY,
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
    async isEmptyUsers() {
        const result = await this.queryOne('SELECT COUNT(*) as count FROM users');
        return !result || parseInt(result.count || '0') === 0;
    }
    async seedData() {
        console.log('[Database] Seeding initial mock data...');
        await this.exec('DELETE FROM users');
        await this.exec('DELETE FROM email_settings');
        await this.exec('DELETE FROM companies');
        await this.exec('DELETE FROM vessels');
        await this.execute('INSERT INTO companies (name, role) VALUES (?, ?)', ['CNAN NORD', 'Admin']);
        await this.execute('INSERT INTO companies (name, role) VALUES (?, ?)', ['Verital Marine Services', 'Partner']);
        await this.execute('INSERT INTO companies (name, role) VALUES (?, ?)', ['Lloyds Register Algiers', 'Auditor']);
        await this.execute(`
      INSERT INTO vessels (company_id, name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            1,
            'BABOR ALGERIEN',
            '9477189',
            'Algeria',
            'Products Tanker',
            'CNAN',
            'Verital Marine Services',
            15000,
            25000,
            'Alger',
            '7TBC',
            'Normal',
        ]);
        await this.execute('INSERT INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)', [
            1,
            'captain@babor.com',
            'manager@babor.com',
            'notifications@babor.com',
        ]);
        const salt = bcrypt.genSaltSync(10);
        const adminHash = bcrypt.hashSync('admin123', salt);
        const captainHash = bcrypt.hashSync('captain123', salt);
        const partnerHash = bcrypt.hashSync('partner123', salt);
        const auditorHash = bcrypt.hashSync('auditor123', salt);
        await this.execute(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, ['admin@babor.com', adminHash, 'Mehdi', 'Admin', 1, null]);
        await this.execute(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [
            'captain@babor.com',
            captainHash,
            'Cdt. Babor',
            'Crew',
            1,
            1,
        ]);
        await this.execute(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [
            'partner@babor.com',
            partnerHash,
            'Verital Marine Partner',
            'Partner',
            2,
            null,
        ]);
        await this.execute(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [
            'auditor@babor.com',
            auditorHash,
            'Inspecteur LR',
            'Auditor',
            3,
            null,
        ]);
        console.log('[Database] Seed complete.');
    }
    async migrateEmailSettings() {
        try {
            const res = await this.queryOne('SELECT COUNT(*) as cnt FROM vessel_emails');
            const count = res ? parseInt(res.cnt || '0') : 0;
            if (count > 0) {
                return;
            }
            const rows = await this.query('SELECT * FROM email_settings');
            for (const row of rows) {
                if (row.email1) {
                    await this.execute('INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)', [row.vessel_id, row.email1]);
                }
                if (row.email2) {
                    await this.execute('INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)', [row.vessel_id, row.email2]);
                }
                if (row.email3) {
                    await this.execute('INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)', [row.vessel_id, row.email3]);
                }
            }
        }
        catch (e) {
            console.warn('[Database] Email settings migration failed:', e instanceof Error ? e.message : e);
        }
    }
    prepare(sql) {
        const self = this;
        return {
            all(...params) {
                if (self.useSqlite) {
                    const stmt = self.sqlite.prepare(self.translateSqlToSqlite(sql));
                    return stmt.all(...params);
                }
                else {
                    throw new Error('Synchronous .prepare().all() is not supported in PostgreSQL mode.');
                }
            },
            get(...params) {
                if (self.useSqlite) {
                    const stmt = self.sqlite.prepare(self.translateSqlToSqlite(sql));
                    return stmt.get(...params);
                }
                else {
                    throw new Error('Synchronous .prepare().get() is not supported in PostgreSQL mode.');
                }
            },
            run(...params) {
                if (self.useSqlite) {
                    const stmt = self.sqlite.prepare(self.translateSqlToSqlite(sql));
                    return stmt.run(...params);
                }
                else {
                    throw new Error('Synchronous .prepare().run() is not supported in PostgreSQL mode.');
                }
            }
        };
    }
    exec(sql) {
        if (this.useSqlite) {
            this.sqlite.exec(this.translateSqlToSqlite(sql));
        }
        else {
            throw new Error('Synchronous .exec() is not supported in PostgreSQL mode.');
        }
    }
    async query(sql, params = []) {
        if (this.useSqlite) {
            const translatedSql = this.translateSqlToSqlite(sql);
            try {
                const stmt = this.sqlite.prepare(translatedSql);
                const res = stmt.all(...params);
                return res;
            }
            catch (err) {
                console.error(`[SQLite Query Error] SQL: ${translatedSql}`, err);
                throw err;
            }
        }
        else {
            const { translatedSql, translatedParams } = this.translateSqlToPostgres(sql, params);
            try {
                const res = await this.pool.query(translatedSql, translatedParams);
                return res.rows;
            }
            catch (err) {
                console.error(`[Postgres Query Error] SQL: ${translatedSql}`, err);
                throw err;
            }
        }
    }
    async queryOne(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows.length > 0 ? rows[0] : null;
    }
    async execute(sql, params = []) {
        if (this.useSqlite) {
            const translatedSql = this.translateSqlToSqlite(sql);
            try {
                const stmt = this.sqlite.prepare(translatedSql);
                stmt.run(...params);
            }
            catch (err) {
                console.error(`[SQLite Execute Error] SQL: ${translatedSql}`, err);
                throw err;
            }
        }
        else {
            const { translatedSql, translatedParams } = this.translateSqlToPostgres(sql, params);
            try {
                await this.pool.query(translatedSql, translatedParams);
            }
            catch (err) {
                console.error(`[Postgres Execute Error] SQL: ${translatedSql}`, err);
                throw err;
            }
        }
    }
    translateSqlToSqlite(sql) {
        return sql.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    }
    translateSqlToPostgres(sql, params) {
        let translatedSql = sql;
        if (translatedSql.includes('INSERT OR IGNORE INTO vessel_emails')) {
            translatedSql = translatedSql.replace('INSERT OR IGNORE INTO vessel_emails', 'INSERT INTO vessel_emails');
            translatedSql += ' ON CONFLICT (vessel_id, email) DO NOTHING';
        }
        if (translatedSql.includes('INSERT OR REPLACE INTO vessel_emails')) {
            translatedSql = translatedSql.replace('INSERT OR REPLACE INTO vessel_emails', 'INSERT INTO vessel_emails');
            translatedSql += ' ON CONFLICT (vessel_id, email) DO UPDATE SET is_verified = EXCLUDED.is_verified, otp_code = EXCLUDED.otp_code, otp_expires = EXCLUDED.otp_expires';
        }
        translatedSql = translatedSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
        let paramIndex = 1;
        translatedSql = translatedSql.replace(/\?/g, () => `$${paramIndex++}`);
        return {
            translatedSql,
            translatedParams: params,
        };
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map