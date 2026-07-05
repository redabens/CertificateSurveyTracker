"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateService = void 0;
const common_1 = require("@nestjs/common");
let EmailTemplateService = class EmailTemplateService {
    buildCertificateAlert(vessel, cert, prevAlarm) {
        const alarmLevel = cert.alarm_status;
        const isRed = alarmLevel.includes('RED') || alarmLevel.includes('OVERDUE');
        const alarmColor = isRed ? '#e53e3e' : '#dd6b20';
        const subject = `[ALERTE PORTAIL CNAN NORD] ${vessel.name} — Changement de statut: ${alarmLevel}`;
        const text = [
            `Navire: ${vessel.name}`,
            `IMO: ${vessel.imo_number || 'N/A'}`,
            `Gestionnaire technique: ${vessel.manager || 'N/A'}`,
            ``,
            `Certificat: ${cert.name}`,
            `Statut précédent: ${prevAlarm}`,
            `Nouveau statut: ${alarmLevel}`,
            `Date d'expiration: ${cert.expiration_date || 'N/A'}`,
            `Échéance visite: ${cert.due_date || 'N/A'}`,
            `Remarques: ${cert.remarks || 'Aucune'}`,
            ``,
            `Veuillez vérifier les détails sur le Portail Certificats CNAN NORD.`,
        ].join('\n');
        const html = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;color:#1a202c;">
        <div style="background-color:#1a202c;color:#ffffff;padding:20px;text-align:center;">
          <h2 style="margin:0;font-size:20px;">🚢 Portail Certificats CNAN NORD — Alerte Maritime</h2>
        </div>
        <div style="padding:24px;line-height:1.6;">
          <h3 style="color:#dd6b20;margin-top:0;">Changement de statut d'alarme détecté</h3>
          <p>Le certificat <strong>${cert.name}</strong> du navire <strong>${vessel.name}</strong> a changé de statut.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
            <tr style="background:#f7fafc;"><td style="padding:8px;font-weight:bold;width:40%;">Navire</td><td style="padding:8px;">${vessel.name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">IMO</td><td style="padding:8px;">${vessel.imo_number || 'N/A'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;font-weight:bold;">Gestionnaire</td><td style="padding:8px;">${vessel.manager || 'N/A'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Certificat / Survey</td><td style="padding:8px;">${cert.name}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;font-weight:bold;">Statut précédent</td><td style="padding:8px;color:#718096;">${prevAlarm}</td></tr>
            <tr style="background:#fffaf0;"><td style="padding:8px;font-weight:bold;">Nouveau statut</td><td style="padding:8px;font-weight:bold;color:${alarmColor};">${alarmLevel}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Date d'expiration</td><td style="padding:8px;">${cert.expiration_date || 'N/A'}</td></tr>
            <tr style="background:#f7fafc;"><td style="padding:8px;font-weight:bold;">Échéance / Visite</td><td style="padding:8px;font-weight:bold;">${cert.due_date || 'N/A'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Remarques</td><td style="padding:8px;font-style:italic;color:#718096;">${cert.remarks || '—'}</td></tr>
          </table>
          <p style="font-size:13px;color:#718096;">Cette alerte a été générée automatiquement lors du contrôle quotidien de conformité.</p>
        </div>
        <div style="background-color:#edf2f7;padding:12px;text-align:center;font-size:11px;color:#718096;">
          &copy; 2026 CNAN NORD / Verital Marine Services. Tous droits réservés.
        </div>
      </div>`;
        return { subject, text, html };
    }
    buildOtpVerification(otp) {
        const subject = `[PORTAIL CNAN NORD] Code de vérification OTP`;
        const text = `Votre code de vérification OTP est : ${otp}\nCe code expire dans 15 minutes.`;
        const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #e2e8f0;border-radius:8px;padding:24px;color:#1a202c;">
        <h2 style="color:#1a202c;border-bottom:2px solid #cca43b;padding-bottom:8px;">Vérification de votre adresse e-mail</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé à ajouter cette adresse e-mail pour recevoir les alertes du Portail Certificats CNAN NORD.</p>
        <p>Veuillez utiliser le code ci-dessous pour confirmer votre adresse :</p>
        <div style="background:#f7fafc;border:1px solid #edf2f7;border-radius:6px;padding:16px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:6px;color:#cca43b;margin:24px 0;">${otp}</div>
        <p style="font-size:13px;color:#718096;">Ce code expire dans <strong>15 minutes</strong>.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:24px;" />
        <p style="font-size:11px;color:#a0aec0;">Ceci est un e-mail automatique, veuillez ne pas y répondre.</p>
      </div>`;
        return { subject, text, html };
    }
    buildUserInvitation(name, otp) {
        const subject = `[PORTAIL CNAN NORD] Votre invitation à la plateforme`;
        const text = `Bonjour ${name},\nVotre compte a été créé.\nMot de passe temporaire : ${otp}\nVous devrez le modifier dès la première connexion.`;
        const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #e2e8f0;border-radius:8px;padding:24px;color:#1a202c;">
        <h2 style="color:#1a202c;border-bottom:2px solid #cca43b;padding-bottom:8px;">Bienvenue sur le Portail Certificats CNAN NORD</h2>
        <p>Bonjour ${name},</p>
        <p>Un administrateur vous a créé un compte sur le Portail Certificats CNAN NORD.</p>
        <p>Votre mot de passe temporaire pour la première connexion :</p>
        <div style="background:#f7fafc;border:1px solid #edf2f7;border-radius:6px;padding:16px;text-align:center;font-size:22px;font-weight:bold;color:#1a202c;margin:24px 0;">${otp}</div>
        <p>Après connexion, vous serez invité à définir votre propre mot de passe pour sécuriser votre compte.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:24px;" />
        <p style="font-size:11px;color:#a0aec0;">Ceci est un e-mail automatique, veuillez ne pas y répondre.</p>
      </div>`;
        return { subject, text, html };
    }
};
exports.EmailTemplateService = EmailTemplateService;
exports.EmailTemplateService = EmailTemplateService = __decorate([
    (0, common_1.Injectable)()
], EmailTemplateService);
//# sourceMappingURL=email-template.service.js.map