import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private sqlite: DatabaseSync;
  private pool: Pool;
  public useSqlite = false;

  async onModuleInit() {
    const isTest = process.env.NODE_ENV === 'test';
    const useSqliteEnv = process.env.USE_SQLITE === 'true';
    this.useSqlite = isTest || useSqliteEnv || (!process.env.DB_HOST && !process.env.DATABASE_URL);

    if (this.useSqlite) {
      console.log('[Database] Initializing in SQLite mode...');
      const dataDir = process.env.DATA_DIR || process.cwd();
      const dbPath = isTest ? ':memory:' : path.resolve(dataDir, 'vessels.db');
      if (!isTest) fs.mkdirSync(dataDir, { recursive: true });
      this.sqlite = new DatabaseSync(dbPath);
    } else {
      console.log('[Database] Initializing in PostgreSQL mode...');
      const connectionString = process.env.DATABASE_URL;
      this.pool = new Pool(
        connectionString
          ? { connectionString }
          : {
              host: process.env.DB_HOST || 'localhost',
              port: parseInt(process.env.DB_PORT || '5432'),
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD || 'postgres',
              database: process.env.DB_NAME || 'vessel_tracker',
            },
      );
    }

    await this.createTables();
    if (await this.isEmptyUsers()) {
      await this.seedData();
    }
    await this.migrateEmailSettings();
  }

  private async createTables() {
    // 1. Companies Table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);

    // 2. Vessels Table
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

    // 3. Certificates Table
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

    // 4. Actionable Items Table (Lloyd's Register Recommendations)
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

    // 5. Email Notification Settings (Legacy, can still exist)
    await this.exec(`
      CREATE TABLE IF NOT EXISTS email_settings (
        vessel_id INTEGER PRIMARY KEY,
        email1 TEXT,
        email2 TEXT,
        email3 TEXT,
        FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
      )
    `);

    // 6. Audit Trail — Historique de toutes les actions critiques utilisateurs
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

    // 7. Email Dispatch Logs
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

    // 8. Users Table with JWT Auth support
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

    // Ensure must_change_password column exists if table was already created
    try {
      await this.exec(
        `ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 1`,
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (!errMsg.includes('duplicate column name') && !errMsg.includes('already exists') && !errMsg.includes('duplicate column')) {
        console.warn(
          `[Database] Alert to check column 'must_change_password': ${errMsg}`,
        );
      }
    }

    // 9. Vessel Dynamic Emails Table
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

  private async isEmptyUsers(): Promise<boolean> {
    const result = await this.queryOne('SELECT COUNT(*) as count FROM users');
    return !result || parseInt(result.count || '0') === 0;
  }

  private async seedData() {
    console.log('[Database] Seeding initial mock data...');

    // Clear existing to avoid duplicate conflicts
    await this.exec('DELETE FROM users');
    await this.exec('DELETE FROM email_settings');
    await this.exec('DELETE FROM companies');
    await this.exec('DELETE FROM vessels');

    // 1. Seed Companies
    await this.execute('INSERT INTO companies (name, role) VALUES (?, ?)', ['CNAN NORD', 'Admin']); // ID = 1
    await this.execute('INSERT INTO companies (name, role) VALUES (?, ?)', ['Verital Marine Services', 'Partner']); // ID = 2
    await this.execute('INSERT INTO companies (name, role) VALUES (?, ?)', ['Lloyds Register Algiers', 'Auditor']); // ID = 3

    // 2. Seed Vessels
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

    // Seed email settings for vessel 1
    await this.execute(
      'INSERT INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)',
      [
        1,
        'captain@babor.com',
        'manager@babor.com',
        'notifications@babor.com',
      ]
    );

    // 3. Seed Users with bcrypt
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const captainHash = bcrypt.hashSync('captain123', salt);
    const partnerHash = bcrypt.hashSync('partner123', salt);
    const auditorHash = bcrypt.hashSync('auditor123', salt);

    // Admin: Complete fleet manager (CNAN)
    await this.execute(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, ['admin@babor.com', adminHash, 'Mehdi', 'Admin', 1, null]);

    // Crew: Captain of vessel 1
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

    // Partner: Verital Marine Services (can view fleet of CNAN)
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

    // Auditor: Lloyd's Register Algiers (Auditor)
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

  private async migrateEmailSettings() {
    try {
      const res = await this.queryOne('SELECT COUNT(*) as cnt FROM vessel_emails');
      const count = res ? parseInt(res.cnt || '0') : 0;
      if (count > 0) {
        return; // Already populated/migrated
      }

      const rows = await this.query('SELECT * FROM email_settings');
      for (const row of rows) {
        if (row.email1) {
          await this.execute(
            'INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)',
            [row.vessel_id, row.email1]
          );
        }
        if (row.email2) {
          await this.execute(
            'INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)',
            [row.vessel_id, row.email2]
          );
        }
        if (row.email3) {
          await this.execute(
            'INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)',
            [row.vessel_id, row.email3]
          );
        }
      }
    } catch (e) {
      console.warn(
        '[Database] Email settings migration failed:',
        e instanceof Error ? e.message : e,
      );
    }
  }

  // Repository Methods helper (Sync compatibility for tests/seeding, wrapper around async methods)
  public prepare(sql: string) {
    const self = this;
    return {
      all(...params: any[]): any[] {
        if (self.useSqlite) {
          const stmt = self.sqlite.prepare(self.translateSqlToSqlite(sql));
          return stmt.all(...params);
        } else {
          throw new Error('Synchronous .prepare().all() is not supported in PostgreSQL mode.');
        }
      },
      get(...params: any[]): any {
        if (self.useSqlite) {
          const stmt = self.sqlite.prepare(self.translateSqlToSqlite(sql));
          return stmt.get(...params);
        } else {
          throw new Error('Synchronous .prepare().get() is not supported in PostgreSQL mode.');
        }
      },
      run(...params: any[]): any {
        if (self.useSqlite) {
          const stmt = self.sqlite.prepare(self.translateSqlToSqlite(sql));
          return stmt.run(...params);
        } else {
          throw new Error('Synchronous .prepare().run() is not supported in PostgreSQL mode.');
        }
      }
    };
  }

  public exec(sql: string) {
    if (this.useSqlite) {
      this.sqlite.exec(this.translateSqlToSqlite(sql));
    } else {
      throw new Error('Synchronous .exec() is not supported in PostgreSQL mode.');
    }
  }

  // Async unified core API
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.useSqlite) {
      const translatedSql = this.translateSqlToSqlite(sql);
      try {
        const stmt = this.sqlite.prepare(translatedSql);
        const res = stmt.all(...params);
        return res as T[];
      } catch (err) {
        console.error(`[SQLite Query Error] SQL: ${translatedSql}`, err);
        throw err;
      }
    } else {
      const { translatedSql, translatedParams } = this.translateSqlToPostgres(sql, params);
      try {
        const res = await this.pool.query(translatedSql, translatedParams);
        return res.rows as T[];
      } catch (err) {
        console.error(`[Postgres Query Error] SQL: ${translatedSql}`, err);
        throw err;
      }
    }
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    if (this.useSqlite) {
      const translatedSql = this.translateSqlToSqlite(sql);
      try {
        const stmt = this.sqlite.prepare(translatedSql);
        stmt.run(...params);
      } catch (err) {
        console.error(`[SQLite Execute Error] SQL: ${translatedSql}`, err);
        throw err;
      }
    } else {
      const { translatedSql, translatedParams } = this.translateSqlToPostgres(sql, params);
      try {
        await this.pool.query(translatedSql, translatedParams);
      } catch (err) {
        console.error(`[Postgres Execute Error] SQL: ${translatedSql}`, err);
        throw err;
      }
    }
  }

  // SQL translation helpers
  private translateSqlToSqlite(sql: string): string {
    return sql.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  }

  private translateSqlToPostgres(sql: string, params: any[]): { translatedSql: string; translatedParams: any[] } {
    let translatedSql = sql;

    // Map SQLite OR IGNORE / OR REPLACE
    if (translatedSql.includes('INSERT OR IGNORE INTO vessel_emails')) {
      translatedSql = translatedSql.replace('INSERT OR IGNORE INTO vessel_emails', 'INSERT INTO vessel_emails');
      translatedSql += ' ON CONFLICT (vessel_id, email) DO NOTHING';
    }
    if (translatedSql.includes('INSERT OR REPLACE INTO vessel_emails')) {
      translatedSql = translatedSql.replace('INSERT OR REPLACE INTO vessel_emails', 'INSERT INTO vessel_emails');
      translatedSql += ' ON CONFLICT (vessel_id, email) DO UPDATE SET is_verified = EXCLUDED.is_verified, otp_code = EXCLUDED.otp_code, otp_expires = EXCLUDED.otp_expires';
    }

    // Types mapping
    translatedSql = translatedSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');

    // Replace "?" placeholders with "$1", "$2", etc.
    let paramIndex = 1;
    translatedSql = translatedSql.replace(/\?/g, () => `$${paramIndex++}`);

    return {
      translatedSql,
      translatedParams: params,
    };
  }
}
