const nodemailer = require('nodemailer');
const db = require('../db');

// Create SMTP Transporter
// Supports environment variables, defaults to local mock mode
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || null, // Fill in with actual user
    pass: process.env.SMTP_PASS || null  // Fill in with actual password
  }
});

/**
 * Send alert email for a certificate status shift
 * @param {object} vessel - The vessel details { id, name }
 * @param {string[]} emails - Array of up to 3 email addresses
 * @param {object} cert - The certificate details { name, alarm_status, due_date }
 * @param {string} prevAlarm - The previous alarm status
 */
async function sendCertificateAlert(vessel, emails, cert, prevAlarm) {
  const activeEmails = emails.filter(e => e && e.trim() !== "");
  if (activeEmails.length === 0) {
    console.log(`[Email Service] No emails configured for vessel ${vessel.name}. Skip sending.`);
    return;
  }

  const alarm = cert.alarm_status;
  let subject = "";
  let body = "";
  let priority = "normal";

  // Determine email content based on alarm status
  if (alarm === 'GREEN - 3 TO 6 MONTHS') {
    subject = `[BABOR TRACKER] [RAPPEL] Certificat en statut VERT - ${vessel.name}`;
    body = `Bonjour,

Le certificat suivant pour le navire "${vessel.name}" est entré dans la fenêtre d'attention de 6 mois (Statut VERT) :

- Certificat : ${cert.name}
- Société d'émission : ${cert.organization || 'N/A'}
- Date d'échéance : ${cert.due_date || cert.expiration_date || 'Non spécifiée'}
- Statut Actuel : VERT - Échéance dans 3 à 6 mois (Précédemment : ${prevAlarm || 'N/A'})

Veuillez commencer à anticiper les démarches nécessaires.

--
Babor Tracker - Système Automatique de Veille Réglementaire`;
  } else if (alarm === 'YELLOW - 1 TO 3 MONTHS') {
    subject = `[BABOR TRACKER] [AVERTISSEMENT] Certificat en statut JAUNE - ${vessel.name}`;
    body = `Bonjour,

ATTENTION : Le certificat suivant pour le navire "${vessel.name}" est entré dans la fenêtre de planification de 3 mois (Statut JAUNE) :

- Certificat : ${cert.name}
- Société d'émission : ${cert.organization || 'N/A'}
- Date d'échéance : ${cert.due_date || cert.expiration_date || 'Non spécifiée'}
- Statut Actuel : JAUNE - Échéance dans 1 à 3 mois (Précédemment : ${prevAlarm || 'N/A'})

Il est vivement conseillé de contacter l'inspecteur et de planifier la visite de conformité.

--
Babor Tracker - Système Automatique de Veille Réglementaire`;
    priority = "high";
  } else if (alarm === 'RED - <1 MONTH' || alarm === 'OVERDUE / IMMEDIATE') {
    const isOverdue = alarm === 'OVERDUE / IMMEDIATE';
    subject = `[BABOR TRACKER] [URGENT] Certificat ${isOverdue ? 'EXPIRÉ' : 'critique à moins de 30 jours'} (Statut ROUGE) - ${vessel.name}`;
    body = `Bonjour,

URGENT / CRITIQUE : Alerte de niveau ROUGE déclenchée pour le navire "${vessel.name}" !

Le certificat suivant ${isOverdue ? 'est maintenant EXPIRÉ / HORS DÉLAIS' : 'expire dans moins de 30 jours'} :

- Certificat : ${cert.name}
- Société d'émission : ${cert.organization || 'N/A'}
- Date d'échéance : ${cert.due_date || cert.expiration_date || 'Non spécifiée'}
- Statut Actuel : ${isOverdue ? 'EXPIRÉ / HORS DÉLAIS' : 'ROUGE - Moins de 30 jours restants'} (Précédemment : ${prevAlarm || 'N/A'})

Action immédiate impérative pour éviter l'immobilisation réglementaire du navire.

--
Babor Tracker - Système Automatique de Veille Réglementaire`;
    priority = "high";
  } else {
    // If it goes back to normal, no need to send email unless requested,
    // but let's log it.
    return;
  }

  const recipients = activeEmails.join(', ');
  
  // Log to console
  console.log(`[Email Service] Sending alert to [${recipients}] for cert "${cert.name}" [${alarm}] on vessel "${vessel.name}"`);

  // Try sending
  try {
    // If SMTP is not fully configured (user/pass null), we simulate successful send
    if (!transporter.auth || !transporter.auth.user) {
      console.log(`[Email Service] [MOCK MODE] Email sent successfully (SMTP credentials not configured).`);
      logEmailToDb(vessel.id, cert.name, alarm, recipients);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Babor Tracker" <tracker@babor.com>',
      to: activeEmails,
      subject: subject,
      text: body,
      headers: {
        'X-Priority': priority === 'high' ? '1' : '3',
        'X-MSMail-Priority': priority === 'high' ? 'High' : 'Normal'
      }
    });

    console.log(`[Email Service] Email sent successfully via SMTP.`);
    logEmailToDb(vessel.id, cert.name, alarm, recipients);
  } catch (error) {
    console.error(`[Email Service] Failed to send email:`, error);
    // Even if it fails, log the attempt with failure remark in the db log
    logEmailToDb(vessel.id, cert.name, alarm, `${recipients} (Echec: ${error.message})`);
  }
}

function logEmailToDb(vesselId, certName, alarmLevel, recipients) {
  try {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.emailLogs.insert({
      vessel_id: vesselId,
      certificate_name: certName,
      alarm_level: alarmLevel,
      sent_to: recipients,
      sent_at: now
    });
  } catch (err) {
    console.error(`[Email Service] Failed to log email to DB:`, err);
  }
}

module.exports = {
  sendCertificateAlert
};
