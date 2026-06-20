const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'vessels.db');
const db = new DatabaseSync(dbPath);

// Initialize DB schema
function initDatabase() {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Table: Vessels
  db.exec(`
    CREATE TABLE IF NOT EXISTS vessels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      imo_number TEXT,
      flag TEXT,
      asset_type TEXT,
      owner TEXT,
      manager TEXT,
      gross_tonnage INTEGER,
      deadweight_tonnage INTEGER,
      port_of_registry TEXT,
      call_sign TEXT,
      status TEXT DEFAULT 'Normal'
    );
  `);

  // Table: Certificates
  db.exec(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Class', 'Flag', 'Servicing'
      organization TEXT,
      issuing_date TEXT,
      expiration_date TEXT,
      due_date TEXT,
      window TEXT,
      alarm_status TEXT DEFAULT 'MONITOR >6 MONTHS',
      remarks TEXT,
      FOREIGN KEY(vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
    );
  `);

  // Table: Actionable Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS actionable_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_id INTEGER NOT NULL,
      imposed_date TEXT,
      category TEXT,
      report_number TEXT,
      due_date TEXT,
      description TEXT,
      status TEXT DEFAULT 'Pending', -- 'Pending', 'Completed'
      FOREIGN KEY(vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
    );
  `);

  // Table: Email Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_settings (
      vessel_id INTEGER PRIMARY KEY,
      email1 TEXT,
      email2 TEXT,
      email3 TEXT,
      FOREIGN KEY(vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
    );
  `);

  // Table: Email Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_id INTEGER NOT NULL,
      certificate_name TEXT,
      alarm_level TEXT, -- 'GREEN', 'YELLOW', 'RED'
      sent_to TEXT,
      sent_at TEXT,
      FOREIGN KEY(vessel_id) REFERENCES vessels(id) ON DELETE CASCADE
    );
  `);

  // Table: Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL -- 'Admin', 'Crew', 'Partner', 'Auditor'
    );
  `);

  // Seed default users if empty
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = userCountStmt.get().count;
  if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)');
    insertUser.run('admin@babor.com', 'admin123', 'Mehdi (Ship Manager)', 'Admin');
    insertUser.run('captain@babor.com', 'captain123', 'Commandant Babor', 'Crew');
    insertUser.run('partner@babor.com', 'partner123', 'Verital Marine Services', 'Partner');
    insertUser.run('auditor@babor.com', 'auditor123', 'Inspecteur Lloyd\'s', 'Auditor');
    console.log('Database users seeded successfully.');
  }
}

initDatabase();

module.exports = db;
