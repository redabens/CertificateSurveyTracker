import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public db: DatabaseSync;

  onModuleInit() {
    // Locate the database at the root of the backend folder or project root
    const dbPath = path.resolve(process.cwd(), 'vessels.db');
    const isNew = !fs.existsSync(dbPath);
    this.db = new DatabaseSync(dbPath);
    this.createTables();
    if (isNew || this.isEmptyUsers()) {
      this.seedData();
    }
  }

  private createTables() {
    // 1. Companies Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);

    // 2. Vessels Table
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

    // 3. Certificates Table
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

    // 4. Actionable Items Table (Lloyd's Register Recommendations)
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

    // 5. Email Notification Settings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_settings (
        vessel_id INTEGER PRIMARY KEY,
        email1 TEXT,
        email2 TEXT,
        email3 TEXT,
        FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
      )
    `);

    // 6. Email Dispatch Logs
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

    // 7. Users Table with JWT Auth support
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        company_id INTEGER,
        vessel_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (vessel_id) REFERENCES vessels(id)
      )
    `);
  }

  private isEmptyUsers(): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const result = stmt.get() as { count: number };
    return result.count === 0;
  }

  private seedData() {
    console.log('[Database] Seeding initial mock data...');

    // Clear existing to avoid duplicate conflicts
    this.db.exec('DELETE FROM users');
    this.db.exec('DELETE FROM email_settings');
    this.db.exec('DELETE FROM companies');
    this.db.exec('DELETE FROM vessels');

    // 1. Seed Companies
    const insertCompany = this.db.prepare('INSERT INTO companies (name, role) VALUES (?, ?)');
    insertCompany.run('CNAN NORD', 'Admin'); // ID = 1
    insertCompany.run('Verital Marine Services', 'Partner'); // ID = 2
    insertCompany.run('Lloyds Register Algiers', 'Auditor'); // ID = 3

    // 2. Seed Vessels
    const insertVessel = this.db.prepare(`
      INSERT INTO vessels (company_id, name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Seed Babor Algérien (ID = 1)
    insertVessel.run(
      1,
      'BABOR ALGERIEN',
      '9477177',
      'Algeria',
      'Products Tanker',
      'CNAN',
      'Verital Marine Services',
      15000,
      25000,
      'Alger',
      '7TBC',
      'Normal'
    );

    // Seed email settings for vessel 1
    this.db.prepare('INSERT INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)').run(
      1,
      'captain@babor.com',
      'manager@babor.com',
      'notifications@babor.com'
    );

    // 3. Seed Users with bcrypt
    const insertUser = this.db.prepare(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const captainHash = bcrypt.hashSync('captain123', salt);
    const partnerHash = bcrypt.hashSync('partner123', salt);
    const auditorHash = bcrypt.hashSync('auditor123', salt);

    // Admin: Complete fleet manager (CNAN)
    insertUser.run('admin@babor.com', adminHash, 'Mehdi', 'Admin', 1, null);
    
    // Crew: Captain of vessel 1
    insertUser.run('captain@babor.com', captainHash, 'Cdt. Babor', 'Crew', 1, 1);
    
    // Partner: Verital Marine Services (can view fleet of CNAN)
    insertUser.run('partner@babor.com', partnerHash, 'Verital Marine Partner', 'Partner', 2, null);
    
    // Auditor: Lloyd's Register Algiers (Auditor)
    insertUser.run('auditor@babor.com', auditorHash, 'Inspecteur LR', 'Auditor', 3, null);

    console.log('[Database] Seed complete.');
  }

  // Repository Methods helper
  public prepare(sql: string) {
    return this.db.prepare(sql);
  }

  public exec(sql: string) {
    return this.db.exec(sql);
  }
}
