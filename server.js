const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cron = require('node-cron');
const db = require('./db');
const { sendCertificateAlert } = require('./helpers/email_service');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// ----------------------------------------------------
// ALARM CALCULATOR HELPER
// ----------------------------------------------------
function calculateAlarmStatus(dueDateStr, expirationDateStr) {
  const targetDateStr = dueDateStr || expirationDateStr;
  if (!targetDateStr) return 'N/A';
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(targetDateStr);
  target.setHours(0,0,0,0);
  
  // Calculate difference in calendar days
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'OVERDUE / IMMEDIATE';
  } else if (diffDays <= 30) {
    return 'RED - <1 MONTH';
  } else if (diffDays <= 90) {
    return 'YELLOW - 1 TO 3 MONTHS';
  } else if (diffDays <= 180) {
    return 'GREEN - 3 TO 6 MONTHS';
  } else {
    return 'MONITOR >6 MONTHS';
  }
}

// Helper to run python script
function runPythonScript(args) {
  return new Promise((resolve, reject) => {
    const pythonCmd = 'python'; // on Windows, python is standard
    const scriptPath = path.join(__dirname, 'helpers', 'excel_handler.py');
    const cmdLine = `"${pythonCmd}" "${scriptPath}" ${args.map(x => `"${x}"`).join(' ')}`;
    
    console.log(`[Server] Running: ${cmdLine}`);
    exec(cmdLine, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Server] python error:`, stderr);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

// Helper to check and update all alarm statuses, sending alerts if shifted
async function performCertificateStatusCheck() {
  console.log('[Scheduler] Running certificate status check...');
  
  // Get all active vessels
  const vessels = db.prepare('SELECT id, name FROM vessels').all();
  
  let totalChecked = 0;
  let totalAlertsSent = 0;

  for (const vessel of vessels) {
    // Get emails settings
    const settings = db.prepare('SELECT email1, email2, email3 FROM email_settings WHERE vessel_id = ?').get(vessel.id) || {};
    const emails = [settings.email1, settings.email2, settings.email3].filter(Boolean);
    
    // Get all certificates
    const certs = db.prepare('SELECT id, name, category, organization, expiration_date, due_date, alarm_status, remarks FROM certificates WHERE vessel_id = ?').all(vessel.id);
    
    for (const cert of certs) {
      const prevAlarm = cert.alarm_status;
      const newAlarm = calculateAlarmStatus(cert.due_date, cert.expiration_date);
      totalChecked++;

      if (prevAlarm !== newAlarm) {
        // Update alarm status in DB
        db.prepare('UPDATE certificates SET alarm_status = ? WHERE id = ?').run(newAlarm, cert.id);
        
        // Trigger Email alert if transition warrants it
        const updatedCert = { ...cert, alarm_status: newAlarm };
        await sendCertificateAlert(vessel, emails, updatedCert, prevAlarm);
        totalAlertsSent++;
      }
    }
  }
  
  console.log(`[Scheduler] Check complete. ${totalChecked} certificates analyzed, ${totalAlertsSent} email alerts sent.`);
  return { checked: totalChecked, alerts: totalAlertsSent };
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// User Login Check
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Identifiants incorrects' });
  }
});

// GET all vessels with aggregated counts
app.get('/api/vessels', (req, res) => {
  const vessels = db.prepare('SELECT * FROM vessels').all();
  
  const results = vessels.map(v => {
    // Count certificates by status
    const certs = db.prepare('SELECT alarm_status, due_date, expiration_date FROM certificates WHERE vessel_id = ?').all(v.id);
    
    let red = 0, yellow = 0, green = 0, normal = 0;
    certs.forEach(c => {
      // recalculate dynamically to be 100% accurate
      const status = calculateAlarmStatus(c.due_date, c.expiration_date);
      if (status.includes('RED') || status.includes('OVERDUE')) red++;
      else if (status.includes('YELLOW')) yellow++;
      else if (status.includes('GREEN')) green++;
      else normal++;
    });

    // Update overall status of vessel
    let overall = 'Normal';
    if (red > 0) overall = 'Imminent';
    else if (yellow > 0) overall = 'Attention';
    else if (green > 0) overall = 'Suivi';
    
    db.prepare('UPDATE vessels SET status = ? WHERE id = ?').run(overall, v.id);

    return {
      ...v,
      status: overall,
      counts: { red, yellow, green, normal, total: certs.length }
    };
  });
  
  res.json(results);
});

// POST Upload Excel and Import Vessel
app.post('/api/vessels/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Veuillez téléverser un fichier Excel' });
  }
  
  const tempPath = req.file.path;
  
  try {
    // Parse using python
    const stdout = await runPythonScript(['parse', tempPath]);
    const parsed = JSON.parse(stdout);
    
    const vInfo = parsed.vessel;
    const certs = parsed.certificates;
    const actionable = parsed.actionable_items;
    
    // Check if vessel already exists
    const existing = db.prepare('SELECT id FROM vessels WHERE name = ?').get(vInfo.name);
    if (existing) {
      // Clean up uploaded file
      fs.unlinkSync(tempPath);
      return res.status(400).json({ error: `Le navire "${vInfo.name}" existe déjà dans le système` });
    }

    // Insert Vessel
    const insertVessel = db.prepare(`
      INSERT INTO vessels (name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const runVessel = insertVessel.run(
      vInfo.name,
      vInfo.imo_number,
      vInfo.flag,
      vInfo.asset_type,
      vInfo.owner,
      vInfo.company, // Using the 'company' sheet cell as manager
      vInfo.gross_tonnage,
      vInfo.dwt,
      vInfo.port_of_registry,
      vInfo.call_sign,
      vInfo.overall_status
    );
    const vesselId = runVessel.lastInsertRowid;
    
    // Insert Email Settings (Default empty)
    db.prepare('INSERT INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)').run(vesselId, '', '', '');

    // Insert Certificates
    const insertCert = db.prepare(`
      INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const c of certs) {
      // Calculate initial alarm status
      const alarm = calculateAlarmStatus(c.due_date, c.expiration_date);
      insertCert.run(
        vesselId,
        c.name,
        c.category,
        c.organization,
        c.issuing_date,
        c.expiration_date,
        c.due_date,
        c.window,
        alarm,
        c.remarks
      );
    }
    
    // Insert Actionable Items
    const insertAction = db.prepare(`
      INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `);
    
    for (const a of actionable) {
      insertAction.run(
        vesselId,
        a.imposed_date,
        a.category,
        a.report_number,
        a.due_date,
        a.description
      );
    }
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    res.status(201).json({ success: true, vesselId: vesselId, name: vInfo.name });
  } catch (err) {
    console.error('[Import Error]', err);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    res.status(500).json({ error: 'Erreur lors du traitement du fichier Excel: ' + err.message });
  }
});

// POST Manual Vessel Creation
app.post('/api/vessels/manual', (req, res) => {
  const { name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Le nom du navire est requis' });
  }
  
  try {
    const run = db.prepare(`
      INSERT INTO vessels (name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal')
    `).run(name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign);
    
    const vesselId = run.lastInsertRowid;
    db.prepare('INSERT INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)').run(vesselId, '', '', '');
    
    res.status(201).json({ id: vesselId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a Vessel
app.delete('/api/vessels/:id', (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM vessels WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Certificates of a Vessel
app.get('/api/vessels/:id/certificates', (req, res) => {
  const vesselId = req.params.id;
  try {
    const certs = db.prepare('SELECT * FROM certificates WHERE vessel_id = ?').all(vesselId);
    // recalculate dynamically on retrieval to ensure accurate color alerts
    const results = certs.map(c => ({
      ...c,
      alarm_status: calculateAlarmStatus(c.due_date, c.expiration_date)
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Create Certificate manually
app.post('/api/vessels/:id/certificates', (req, res) => {
  const vesselId = req.params.id;
  const { name, category, organization, issuing_date, expiration_date, due_date, window, remarks } = req.body;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'Le nom et la catégorie sont requis' });
  }
  
  try {
    const alarm = calculateAlarmStatus(due_date, expiration_date);
    const run = db.prepare(`
      INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(vesselId, name, category, organization, issuing_date, expiration_date, due_date, window, alarm, remarks);
    
    res.status(201).json({ id: run.lastInsertRowid, alarm_status: alarm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT Update Certificate dates and details
app.put('/api/certificates/:id', async (req, res) => {
  const certId = req.params.id;
  const { organization, issuing_date, expiration_date, due_date, window, remarks } = req.body;
  
  try {
    // Get previous state
    const prevCert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(certId);
    if (!prevCert) {
      return res.status(404).json({ error: 'Certificat non trouvé' });
    }
    
    const newAlarm = calculateAlarmStatus(due_date, expiration_date);
    
    // Update DB
    db.prepare(`
      UPDATE certificates 
      SET organization = ?, issuing_date = ?, expiration_date = ?, due_date = ?, window = ?, alarm_status = ?, remarks = ?
      WHERE id = ?
    `).run(organization, issuing_date, expiration_date, due_date, window, newAlarm, remarks, certId);
    
    // Retrieve vessel name and emails
    const vessel = db.prepare('SELECT id, name FROM vessels WHERE id = ?').get(prevCert.vessel_id);
    const settings = db.prepare('SELECT email1, email2, email3 FROM email_settings WHERE vessel_id = ?').get(vessel.id) || {};
    const emails = [settings.email1, settings.email2, settings.email3].filter(Boolean);
    
    // Send email alert immediately if status changed
    const updatedCert = { id: certId, name: prevCert.name, organization, due_date, expiration_date, alarm_status: newAlarm };
    if (prevCert.alarm_status !== newAlarm) {
      await sendCertificateAlert(vessel, emails, updatedCert, prevCert.alarm_status);
    }
    
    res.json({ success: true, alarm_status: newAlarm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Certificate
app.delete('/api/certificates/:id', (req, res) => {
  const certId = req.params.id;
  try {
    db.prepare('DELETE FROM certificates WHERE id = ?').run(certId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Actionable items of a Vessel
app.get('/api/vessels/:id/actionable-items', (req, res) => {
  const vesselId = req.params.id;
  try {
    const items = db.prepare('SELECT * FROM actionable_items WHERE vessel_id = ?').all(vesselId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Create Actionable Item manually
app.post('/api/vessels/:id/actionable-items', (req, res) => {
  const vesselId = req.params.id;
  const { imposed_date, category, report_number, due_date, description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'La description est requise' });
  }
  try {
    const run = db.prepare(`
      INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `).run(vesselId, imposed_date, category, report_number, due_date, description);
    res.status(201).json({ id: run.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT Toggle status of actionable item
app.put('/api/actionable-items/:id/status', (req, res) => {
  const id = req.params.id;
  const { status } = req.body; // 'Pending' or 'Completed'
  try {
    db.prepare('UPDATE actionable_items SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET settings (emails)
app.get('/api/vessels/:id/settings', (req, res) => {
  const vesselId = req.params.id;
  try {
    let settings = db.prepare('SELECT email1, email2, email3 FROM email_settings WHERE vessel_id = ?').get(vesselId);
    if (!settings) {
      db.prepare('INSERT INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)').run(vesselId, '', '', '');
      settings = { email1: '', email2: '', email3: '' };
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update settings (emails)
app.put('/api/vessels/:id/settings', (req, res) => {
  const vesselId = req.params.id;
  const { email1, email2, email3 } = req.body;
  try {
    db.prepare(`
      INSERT INTO email_settings (vessel_id, email1, email2, email3) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(vessel_id) DO UPDATE SET email1=excluded.email1, email2=excluded.email2, email3=excluded.email3
    `).run(vesselId, email1 || '', email2 || '', email3 || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET email notification logs
app.get('/api/email-logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT el.*, v.name as vessel_name 
      FROM email_logs el 
      JOIN vessels v ON el.vessel_id = v.id 
      ORDER BY el.sent_at DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Trigger notifications manually
app.post('/api/trigger-notifications', async (req, res) => {
  try {
    const results = await performCertificateStatusCheck();
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Export Vessel to Styled Excel
app.get('/api/vessels/:id/export', async (req, res) => {
  const vesselId = req.params.id;
  
  const templatePath = path.join(__dirname, 'MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx');
  
  // Ensure the base template exists
  if (!fs.existsSync(templatePath)) {
    return res.status(500).json({ error: 'Fichier gabarit de base introuvable. Impossible d\'exporter.' });
  }
  
  try {
    // 1. Fetch data from DB
    const vessel = db.prepare('SELECT * FROM vessels WHERE id = ?').get(vesselId);
    if (!vessel) {
      return res.status(404).json({ error: 'Navire non trouvé' });
    }
    
    const certificates = db.prepare('SELECT * FROM certificates WHERE vessel_id = ?').all(vesselId);
    const actionableItems = db.prepare('SELECT * FROM actionable_items WHERE vessel_id = ?').all(vesselId);
    const settings = db.prepare('SELECT email1, email2, email3 FROM email_settings WHERE vessel_id = ?').get(vesselId) || {};
    
    // Map certificates to align alarms
    const mappedCerts = certificates.map(c => ({
      ...c,
      alarm_status: calculateAlarmStatus(c.due_date, c.expiration_date)
    }));

    const exportData = {
      vessel: {
        name: vessel.name,
        imo_number: vessel.imo_number,
        flag: vessel.flag,
        report_date: new Date().toISOString().substring(0, 10),
        company: vessel.manager,
        year_built: vessel.year_built,
        date_of_build: vessel.year_built ? `${vessel.year_built}-01-01` : '',
        class_status: 'Classed',
        asset_type: vessel.asset_type,
        classification_society: vessel.class_society || 'Lloyd\'s Register (LR)',
        overall_status: vessel.status,
        dwt: vessel.deadweight_tonnage,
        owner: vessel.owner,
        gross_tonnage: vessel.gross_tonnage,
        port_of_registry: vessel.port_of_registry,
        call_sign: vessel.call_sign
      },
      emails: [settings.email1, settings.email2, settings.email3].filter(Boolean),
      certificates: mappedCerts,
      actionable_items: actionableItems
    };

    // Save temporary JSON
    const tempJsonPath = path.join(__dirname, `uploads/export_${vesselId}.json`);
    const tempOutExcelPath = path.join(__dirname, `uploads/export_${vessel.name.replace(/\s+/g, '_')}.xlsx`);
    
    fs.writeFileSync(tempJsonPath, JSON.stringify(exportData, null, 2));

    // 2. Call python formatter
    await runPythonScript(['format', templatePath, tempOutExcelPath, tempJsonPath]);
    
    // 3. Send file
    res.download(tempOutExcelPath, `${vessel.name}_Certificate_Tracker.xlsx`, (err) => {
      // Cleanup files
      if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
      if (fs.existsSync(tempOutExcelPath)) fs.unlinkSync(tempOutExcelPath);
      
      if (err) {
        console.error('[Export Download Error]', err);
      }
    });
  } catch (err) {
    console.error('[Export Error]', err);
    res.status(500).json({ error: 'Erreur lors de la génération de l\'export Excel: ' + err.message });
  }
});

// Copy template to root so it can be used for export
const localTemplatePath = path.join(__dirname, 'MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx');
const srcTemplatePath = path.join('c:\\Users\\redab\\Desktop\\CertificatsSurvey\\MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx');
if (!fs.existsSync(localTemplatePath) && fs.existsSync(srcTemplatePath)) {
  fs.copyFileSync(srcTemplatePath, localTemplatePath);
  console.log('[Server] Copied Excel template to project root.');
}

// ----------------------------------------------------
// DAILY CRON JOB (Every night at midnight)
// ----------------------------------------------------
cron.schedule('0 0 * * *', () => {
  performCertificateStatusCheck().catch(err => console.error('[Cron Error]', err));
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`[Server] Maritime Certificate Tracking Platform running at http://localhost:${PORT}`);
});
