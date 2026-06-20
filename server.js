const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = require('./db');
const { sendCertificateAlert } = require('./helpers/email_service');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'babor_secret_key';

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for PDF file uploads
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pdfDir = path.join(__dirname, 'public', 'uploads', 'pdf');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    cb(null, pdfDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés.'));
    }
  }
});

// Configure Multer for Excel file uploads
const uploadExcel = multer({ dest: 'uploads/' });

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Ensure public/uploads/pdf exists
const pdfUploadDir = path.join(__dirname, 'public', 'uploads', 'pdf');
if (!fs.existsSync(pdfUploadDir)) {
  fs.mkdirSync(pdfUploadDir, { recursive: true });
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
    const pythonCmd = 'python';
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
  
  // Get all vessels (bypass filtering for admin scheduler task)
  const vessels = db.vessels.getAll(null, 'Admin', null);
  
  let totalChecked = 0;
  let totalAlertsSent = 0;

  for (const vessel of vessels) {
    // Get emails settings
    const settings = db.emailSettings.getByVessel(vessel.id) || {};
    const emails = [settings.email1, settings.email2, settings.email3].filter(Boolean);
    
    // Get all certificates
    const certs = db.certificates.getByVessel(vessel.id);
    
    for (const cert of certs) {
      const prevAlarm = cert.alarm_status;
      const newAlarm = calculateAlarmStatus(cert.due_date, cert.expiration_date);
      totalChecked++;

      if (prevAlarm !== newAlarm) {
        // Update alarm status in DB
        db.raw.prepare('UPDATE certificates SET alarm_status = ? WHERE id = ?').run(newAlarm, cert.id);
        
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
// JWT AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Alternative: extract token from query parameters (for direct file downloads/exports)
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) return res.status(401).json({ error: 'Accès refusé. Veuillez vous connecter.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    req.user = user; // Contains: id, role, companyId
    next();
  });
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail et mot de passe requis' });
  }

  const user = db.users.getByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  // Check password hash
  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  // Generate Token
  const token = jwt.sign(
    { id: user.id, role: user.role, companyId: user.company_id },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      vessel_id: user.vessel_id
    }
  });
});

// ----------------------------------------------------
// VESSELS ROUTES
// ----------------------------------------------------
app.get('/api/vessels', authenticateToken, (req, res) => {
  try {
    const vessels = db.vessels.getAll(req.user.id, req.user.role, req.user.companyId);
    
    const results = vessels.map(v => {
      // Count certificates by status
      const certs = db.certificates.getByVessel(v.id);
      
      let red = 0, yellow = 0, green = 0, normal = 0;
      certs.forEach(c => {
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
      
      db.vessels.updateStatus(v.id, overall);

      return {
        ...v,
        status: overall,
        counts: { red, yellow, green, normal, total: certs.length }
      };
    });
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Upload Excel and Import Vessel
app.post('/api/vessels/import', authenticateToken, uploadExcel.single('file'), async (req, res) => {
  // Permission constraint: Only Admin
  if (req.user.role !== 'Admin') {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Veuillez téléverser un fichier Excel' });
  }
  
  const tempPath = req.file.path;
  
  try {
    const stdout = await runPythonScript(['parse', tempPath]);
    const parsed = JSON.parse(stdout);
    
    const vInfo = parsed.vessel;
    const certs = parsed.certificates;
    const actionable = parsed.actionable_items;
    
    // Check if vessel already exists
    const existing = db.vessels.getByName(vInfo.name);
    if (existing) {
      fs.unlinkSync(tempPath);
      return res.status(400).json({ error: `Le navire "${vInfo.name}" existe déjà dans le système` });
    }

    // Insert Vessel (assign default company_id = 2 for Verital)
    const vesselId = db.vessels.insert({
      company_id: 2,
      name: vInfo.name,
      imo_number: vInfo.imo_number,
      flag: vInfo.flag,
      asset_type: vInfo.asset_type,
      owner: vInfo.owner,
      manager: vInfo.company,
      gross_tonnage: vInfo.gross_tonnage,
      deadweight_tonnage: vInfo.dwt,
      port_of_registry: vInfo.port_of_registry,
      call_sign: vInfo.call_sign,
      status: vInfo.overall_status
    });
    
    // Insert Email Settings
    db.emailSettings.update(vesselId, '', '', '');

    // Insert Certificates
    for (const c of certs) {
      const alarm = calculateAlarmStatus(c.due_date, c.expiration_date);
      db.certificates.insert({
        vessel_id: vesselId,
        name: c.name,
        category: c.category,
        organization: c.organization,
        issuing_date: c.issuing_date,
        expiration_date: c.expiration_date,
        due_date: c.due_date,
        window: c.window,
        alarm_status: alarm,
        remarks: c.remarks
      });
    }
    
    // Insert Actionable Items
    for (const a of actionable) {
      db.actionableItems.insert({
        vessel_id: vesselId,
        imposed_date: a.imposed_date,
        category: a.category,
        report_number: a.report_number,
        due_date: a.due_date,
        description: a.description
      });
    }
    
    fs.unlinkSync(tempPath);
    res.status(201).json({ success: true, vesselId: vesselId, name: vInfo.name });
  } catch (err) {
    console.error('[Import Error]', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: 'Erreur lors du traitement du fichier Excel: ' + err.message });
  }
});

// POST Manual Vessel Creation
app.post('/api/vessels/manual', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  const { name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Le nom du navire est requis' });
  }
  
  try {
    const vesselId = db.vessels.insert({
      company_id: 2, // Default to demo company
      name,
      imo_number,
      flag,
      asset_type,
      owner,
      manager,
      gross_tonnage: parseInt(gross_tonnage) || 0,
      deadweight_tonnage: parseInt(deadweight_tonnage) || 0,
      port_of_registry,
      call_sign,
      status: 'Normal'
    });
    
    db.emailSettings.update(vesselId, '', '', '');
    res.status(201).json({ id: vesselId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a Vessel
app.delete('/api/vessels/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  const id = req.params.id;
  try {
    db.vessels.delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CERTIFICATES ROUTES
// ----------------------------------------------------
app.get('/api/vessels/:id/certificates', authenticateToken, (req, res) => {
  const vesselId = req.params.id;
  
  // Role verification (Crew can only read their vessel)
  if (req.user.role === 'Crew') {
    const crewUser = db.raw.prepare('SELECT vessel_id FROM users WHERE id = ?').get(req.user.id);
    if (!crewUser || crewUser.vessel_id != vesselId) {
      return res.status(403).json({ error: 'Accès refusé pour ce navire' });
    }
  }

  try {
    const certs = db.certificates.getByVessel(vesselId);
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
app.post('/api/vessels/:id/certificates', authenticateToken, (req, res) => {
  const vesselId = req.params.id;
  const { name, category, organization, issuing_date, expiration_date, due_date, window, remarks } = req.body;
  
  // Permission verification
  // Crew can only create 'Servicing' certificates
  if (req.user.role === 'Crew' && category !== 'Servicing') {
    return res.status(403).json({ error: 'Seuls les certificats d\'entretien (Servicing) peuvent être gérés par l\'équipage' });
  }
  // Partner & Auditor cannot write
  if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
    return res.status(403).json({ error: 'Action en lecture seule' });
  }

  if (!name || !category) {
    return res.status(400).json({ error: 'Le nom et la catégorie sont requis' });
  }
  
  try {
    const alarm = calculateAlarmStatus(due_date, expiration_date);
    const certId = db.certificates.insert({
      vessel_id: parseInt(vesselId),
      name,
      category,
      organization,
      issuing_date,
      expiration_date,
      due_date,
      window,
      alarm_status: alarm,
      remarks
    });
    
    res.status(201).json({ id: certId, alarm_status: alarm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT Update Certificate
app.put('/api/certificates/:id', authenticateToken, async (req, res) => {
  const certId = req.params.id;
  const { organization, issuing_date, expiration_date, due_date, window, remarks } = req.body;
  
  // Partner & Auditor cannot write
  if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
    return res.status(403).json({ error: 'Action en lecture seule' });
  }

  try {
    const prevCert = db.certificates.getById(certId);
    if (!prevCert) {
      return res.status(404).json({ error: 'Certificat non trouvé' });
    }

    // Crew can only edit Servicing certificates
    if (req.user.role === 'Crew' && prevCert.category !== 'Servicing') {
      return res.status(403).json({ error: 'Seuls les certificats d\'entretien (Servicing) peuvent être modifiés par l\'équipage' });
    }
    
    const newAlarm = calculateAlarmStatus(due_date, expiration_date);
    
    db.certificates.update(certId, {
      organization,
      issuing_date,
      expiration_date,
      due_date,
      window,
      alarm_status: newAlarm,
      remarks
    });
    
    // Trigger notification if status transitioned
    if (prevCert.alarm_status !== newAlarm) {
      const vessel = db.vessels.getById(prevCert.vessel_id);
      const settings = db.emailSettings.getByVessel(vessel.id) || {};
      const emails = [settings.email1, settings.email2, settings.email3].filter(Boolean);
      
      const updatedCert = { id: certId, name: prevCert.name, organization, due_date, expiration_date, alarm_status: newAlarm };
      await sendCertificateAlert(vessel, emails, updatedCert, prevCert.alarm_status);
    }
    
    res.json({ success: true, alarm_status: newAlarm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Upload PDF File for Certificate (Epic 4)
app.post('/api/certificates/:id/upload', authenticateToken, uploadPdf.single('pdf'), async (req, res) => {
  // Read-only profiles check
  if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  const certId = req.params.id;
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier PDF téléversé' });
  }

  try {
    const cert = db.certificates.getById(certId);
    if (!cert) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Certificat non trouvé' });
    }

    // Crew check
    if (req.user.role === 'Crew' && cert.category !== 'Servicing') {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'L\'équipage ne peut modifier que les PDF d\'entretien' });
    }

    // Save path in public dir: /uploads/pdf/filename
    const relativePath = `/uploads/pdf/${req.file.filename}`;
    db.certificates.updatePdfUrl(certId, relativePath);

    res.json({ success: true, pdf_url: relativePath });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// DELETE Certificate
app.delete('/api/certificates/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  const certId = req.params.id;
  try {
    db.certificates.delete(certId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ACTIONABLE ITEMS ROUTES
// ----------------------------------------------------
app.get('/api/vessels/:id/actionable-items', authenticateToken, (req, res) => {
  const vesselId = req.params.id;
  try {
    const items = db.actionableItems.getByVessel(vesselId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vessels/:id/actionable-items', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  const vesselId = req.params.id;
  const { imposed_date, category, report_number, due_date, description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'La description est requise' });
  }
  try {
    const itemId = db.actionableItems.insert({
      vessel_id: parseInt(vesselId),
      imposed_date,
      category,
      report_number,
      due_date,
      description
    });
    res.status(201).json({ id: itemId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/actionable-items/:id/status', authenticateToken, (req, res) => {
  // Partner & Auditor cannot modify status
  if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  const id = req.params.id;
  const { status } = req.body;
  try {
    db.actionableItems.updateStatus(id, status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// EMAIL SETTINGS ROUTES
// ----------------------------------------------------
app.get('/api/vessels/:id/settings', authenticateToken, (req, res) => {
  const vesselId = req.params.id;
  try {
    let settings = db.emailSettings.getByVessel(vesselId);
    if (!settings) {
      db.emailSettings.update(vesselId, '', '', '');
      settings = { email1: '', email2: '', email3: '' };
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vessels/:id/settings', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Action interdite pour votre profil' });
  }

  const vesselId = req.params.id;
  const { email1, email2, email3 } = req.body;
  try {
    db.emailSettings.update(vesselId, email1, email2, email3);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET email notification logs
app.get('/api/email-logs', authenticateToken, (req, res) => {
  try {
    const logs = db.emailLogs.getAll();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Trigger notifications manually
app.post('/api/trigger-notifications', authenticateToken, async (req, res) => {
  try {
    const results = await performCertificateStatusCheck();
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// EXPORTS ROUTES (BILINGUAL SUPPORT - Epic 5)
// ----------------------------------------------------
app.get('/api/vessels/:id/export', authenticateToken, async (req, res) => {
  const vesselId = req.params.id;
  const lang = req.query.lang || 'en'; // Read lang parameter from frontend locale selection
  
  const templatePath = path.join(__dirname, 'MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx');
  if (!fs.existsSync(templatePath)) {
    return res.status(500).json({ error: 'Fichier gabarit de base introuvable. Impossible d\'exporter.' });
  }
  
  try {
    const vessel = db.vessels.getById(vesselId);
    if (!vessel) {
      return res.status(404).json({ error: 'Navire non trouvé' });
    }
    
    const certificates = db.certificates.getByVessel(vesselId);
    const actionableItems = db.actionableItems.getByVessel(vesselId);
    const settings = db.emailSettings.getByVessel(vesselId) || {};
    
    // Map certificates to align alarms
    const mappedCerts = certificates.map(c => ({
      ...c,
      alarm_status: calculateAlarmStatus(c.due_date, c.expiration_date)
    }));

    const exportData = {
      lang: lang, // Send active UI language to Python formatter script
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

    // Save temporary files
    const tempJsonPath = path.join(__dirname, `uploads/export_${vesselId}.json`);
    const tempOutExcelPath = path.join(__dirname, `uploads/export_${vessel.name.replace(/\s+/g, '_')}.xlsx`);
    
    fs.writeFileSync(tempJsonPath, JSON.stringify(exportData, null, 2));

    // Call python formatter
    await runPythonScript(['format', templatePath, tempOutExcelPath, tempJsonPath]);
    
    // Send file
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
