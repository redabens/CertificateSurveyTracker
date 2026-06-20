# Epic 3 : Configuration SMTP Professionnelle & Délivrabilité E-mail

## 📌 À quoi ça sert ?
L'un des principaux arguments de vente de l'application est d'assurer la veille réglementaire : alerter les armateurs et les inspecteurs maritimes avant qu'un certificat n'expire pour éviter l'immobilisation forcée d'un navire. Pour cela, le système doit envoyer des e-mails automatiques de manière ultra-fiable.
Si l'application utilise un serveur mail local non configuré ou un compte email gratuit (comme Gmail sans authentification), les notifications d'alertes finiront directement dans les courriers indésirables (Spam) ou seront bloquées par les pare-feux des entreprises partenaires. 
Cet Epic détaille comment mettre en œuvre un service SMTP professionnel et authentifier le domaine d'envoi.

---

## 🛠️ Comment le réaliser ?

### Étape 1 : Choisir un fournisseur SMTP transactionnel
Pour envoyer des e-mails automatiques à grande échelle et suivre leur réception, il faut utiliser un service de messagerie cloud dédié. Les leaders du marché sont :
*   **SendGrid** (Twilio)
*   **Mailgun**
*   **Amazon SES** (Simple Email Service)
*   **Brevo** (ex-Sendinblue)

Ces services fournissent une API ou des identifiants SMTP dédiés à intégrer dans le code.

### Étape 2 : Configurer les variables d'environnement SMTP du serveur Node
Dans votre fichier d'environnement de production `.env` sur le serveur hébergé, renseignez les clés d'accès réelles :
```ini
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=votre_cle_api_sendgrid_secrete
SMTP_FROM="Babor Tracker" <tracker@votre-domaine.com>
```
L'application charge automatiquement ces variables dans `helpers/email_service.js` :
```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
```

### Étape 3 : Authentification DNS du domaine d'envoi (Crucial pour la délivrabilité)
Pour empêcher les serveurs de messagerie des destinataires (Outlook, Gmail, serveurs d'entreprises) de classer vos e-mails en spam, vous devez prouver que vous êtes le propriétaire légitime du domaine d'envoi (`votre-domaine.com`).
Ajoutez les enregistrements DNS suivants chez votre registrar (ex. OVH, GoDaddy, Cloudflare) :
1.  **SPF (Sender Policy Framework)** : Enregistrement TXT indiquant quels serveurs sont autorisés à envoyer des e-mails pour votre domaine.
    *   Exemple : `v=spf1 include:sendgrid.net ~all`
2.  **DKIM (DomainKeys Identified Mail)** : Enregistrement TXT contenant une clé publique pour signer cryptographiquement chaque en-tête d'e-mail envoyé. La signature est générée automatiquement par le fournisseur SMTP transactionnel.
3.  **DMARC (Domain-based Message Authentication, Reporting and Conformance)** : Enregistrement TXT définissant la politique à suivre si un e-mail échoue aux tests SPF/DKIM.
    *   Exemple : `v=DMARC1; p=quarantine; pct=100; rua=mailto:postmaster@votre-domaine.com`

### Étape 4 : Gestion des e-mails en échec (Bounces)
En production, il peut arriver qu'une adresse e-mail saisie soit erronée ou saturée. 
1. Le service SMTP transactionnel enregistre ces événements (bounces).
2. Configurez des **Webhooks** sur le serveur Express (ex: `POST /api/webhooks/mail`) pour écouter les notifications d'échec de distribution envoyées par le fournisseur SMTP.
3. Si un e-mail échoue, mettez à jour le statut dans la table `email_logs` avec la mention `Échec de livraison - Boîte pleine / Adresse invalide` pour alerter l'administrateur dans l'interface de contrôle.
