const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'vessels.db');
const db = new DatabaseSync(dbPath);

// Initialize DB schema
function initDatabase() {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Table: Companies
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      contact_email TEXT
    );
  `);

  // Table: Vessels
  db.exec(`
    CREATE TABLE IF NOT EXISTS vessels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
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
      status TEXT DEFAULT 'Normal',
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL
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
      pdf_url TEXT,
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
      password TEXT NOT NULL, -- Will store bcrypt hashes
      full_name TEXT,
      role TEXT NOT NULL, -- 'Admin', 'Crew', 'Partner', 'Auditor'
      company_id INTEGER,
      vessel_id INTEGER,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL,
      FOREIGN KEY(vessel_id) REFERENCES vessels(id) ON DELETE SET NULL
    );
  `);

  // Seed default companies if empty
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
  if (companyCount === 0) {
    const insertCompany = db.prepare('INSERT INTO companies (id, name, contact_email) VALUES (?, ?, ?)');
    insertCompany.run(1, 'CNAN Group', 'cnan@babor.com');
    insertCompany.run(2, 'Verital Marine Services LLC', 'verital@babor.com');
    console.log('Database companies seeded.');
  }

  // Seed default users if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Hash passwords using bcrypt
    const saltRounds = 10;
    const adminHash = bcrypt.hashSync('admin123', saltRounds);
    const captainHash = bcrypt.hashSync('captain123', saltRounds);
    const partnerHash = bcrypt.hashSync('partner123', saltRounds);
    const auditorHash = bcrypt.hashSync('auditor123', saltRounds);

    insertUser.run('admin@babor.com', adminHash, 'Mehdi (Ship Manager)', 'Admin', null, null);
    insertUser.run('captain@babor.com', captainHash, 'Commandant Babor', 'Crew', 2, null); // Will map to first vessel dynamically
    insertUser.run('partner@babor.com', partnerHash, 'Verital Marine Services', 'Partner', 2, null); // Associated with company id 2
    insertUser.run('auditor@babor.com', auditorHash, 'Inspecteur Lloyd\'s', 'Auditor', null, null);
    console.log('Database users seeded with encrypted passwords.');
  }
}

initDatabase();

// ----------------------------------------------------
// REPOSITORY PATTERN DATA ACCESS LAYER
// ----------------------------------------------------
const repositories = {
  // Connection raw object for direct operations if needed
  raw: db,

  vessels: {
    getAll(userId, role, companyId) {
      if (role === 'Partner') {
        // Partner sees only their company's vessels
        return db.prepare('SELECT * FROM vessels WHERE company_id = ?').all(companyId);
      } else if (role === 'Crew') {
        // Crew sees only their specific vessel
        const crewUser = db.prepare('SELECT vessel_id FROM users WHERE id = ?').get(userId);
        if (crewUser && crewUser.vessel_id) {
          return db.prepare('SELECT * FROM vessels WHERE id = ?').all(crewUser.vessel_id);
        }
        return [];
      }
      // Admin and Auditor see all vessels
      return db.prepare('SELECT * FROM vessels').all();
    },

    getById(id) {
      return db.prepare('SELECT * FROM vessels WHERE id = ?').get(id);
    },

    getByName(name) {
      return db.prepare('SELECT * FROM vessels WHERE name = ?').get(name);
    },

    insert(v) {
      const stmt = db.prepare(`
        INSERT INTO vessels (company_id, name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        v.company_id || null,
        v.name,
        v.imo_number || '',
        v.flag || '',
        v.asset_type || '',
        v.owner || '',
        v.manager || '',
        v.gross_tonnage || 0,
        v.deadweight_tonnage || 0,
        v.port_of_registry || '',
        v.call_sign || '',
        v.status || 'Normal'
      );
      return res.lastInsertRowid;
    },

    updateStatus(id, status) {
      db.prepare('UPDATE vessels SET status = ? WHERE id = ?').run(status, id);
    },

    delete(id) {
      db.prepare('DELETE FROM vessels WHERE id = ?').run(id);
    }
  },

  certificates: {
    getByVessel(vesselId) {
      return db.prepare('SELECT * FROM certificates WHERE vessel_id = ?').all(vesselId);
    },

    getById(id) {
      return db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    },

    insert(c) {
      const stmt = db.prepare(`
        INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks, pdf_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        c.vessel_id,
        c.name,
        c.category,
        c.organization || '',
        c.issuing_date || '',
        c.expiration_date || '',
        c.due_date || '',
        c.window || '',
        c.alarm_status || 'MONITOR >6 MONTHS',
        c.remarks || '',
        c.pdf_url || null
      );
      return res.lastInsertRowid;
    },

    update(id, c) {
      const stmt = db.prepare(`
        UPDATE certificates 
        SET organization = ?, issuing_date = ?, expiration_date = ?, due_date = ?, window = ?, alarm_status = ?, remarks = ?
        WHERE id = ?
      `);
      stmt.run(
        c.organization || '',
        c.issuing_date || '',
        c.expiration_date || '',
        c.due_date || '',
        c.window || '',
        c.alarm_status || 'MONITOR >6 MONTHS',
        c.remarks || '',
        id
      );
    },

    updatePdfUrl(id, pdfUrl) {
      db.prepare('UPDATE certificates SET pdf_url = ? WHERE id = ?').run(pdfUrl, id);
    },

    delete(id) {
      db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
    }
  },

  actionableItems: {
    getByVessel(vesselId) {
      return db.prepare('SELECT * FROM actionable_items WHERE vessel_id = ?').all(vesselId);
    },

    insert(a) {
      const stmt = db.prepare(`
        INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        a.vessel_id,
        a.imposed_date || '',
        a.category || '',
        a.report_number || '',
        a.due_date || '',
        a.description || '',
        a.status || 'Pending'
      );
      return res.lastInsertRowid;
    },

    updateStatus(id, status) {
      db.prepare('UPDATE actionable_items SET status = ? WHERE id = ?').run(status, id);
    }
  },

  emailSettings: {
    getByVessel(vesselId) {
      return db.prepare('SELECT * FROM email_settings WHERE vessel_id = ?').get(vesselId);
    },

    update(vesselId, email1, email2, email3) {
      db.prepare(`
        INSERT INTO email_settings (vessel_id, email1, email2, email3)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(vessel_id) DO UPDATE SET email1=excluded.email1, email2=excluded.email2, email3=excluded.email3
      `).run(vesselId, email1 || '', email2 || '', email3 || '');
    }
  },

  emailLogs: {
    getAll() {
      return db.prepare(`
        SELECT el.*, v.name as vessel_name 
        FROM email_logs el 
        JOIN vessels v ON el.vessel_id = v.id 
        ORDER BY el.sent_at DESC 
        LIMIT 100
      `).all();
    },

    insert(l) {
      const stmt = db.prepare(`
        INSERT INTO email_logs (vessel_id, certificate_name, alarm_level, sent_to, sent_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        l.vessel_id,
        l.certificate_name,
        l.alarm_level,
        l.sent_to,
        l.sent_at
      );
    }
  },

  users: {
    getByEmail(email) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }
  }
};

module.exports = repositories;
