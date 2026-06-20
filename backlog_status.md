# Babor Tracker - Suivi de Projet & Backlog d'Évolution

Ce document présente l'état d'avancement des développements de l'application **Babor Tracker** par rapport au plan d'implémentation initial, ainsi que la feuille de route (backlog) pour la mise en production commerciale.

---

## 1. Fonctionnalités Entièrement Implémentées (100% Livré)

### 🗄️ Module A : Base de Données & Persistance Relationnelle
*   **Initialisation SQL** : Configuration de [db.js](file:///c:/Users/redab/Desktop/CertificatsSurvey/db.js) avec le moteur natif de Node.js `node:sqlite`.
*   **Modèle de données** : Création automatique à l'allumage des tables relationnelles `vessels`, `certificates`, `actionable_items`, `email_settings`, `email_logs`, et `users`.
*   **Jeux de test (Seeding)** : Insertion d'utilisateurs par défaut pour tester les profils Admin (`admin@babor.com`), Captain (`captain@babor.com`), Partner (`partner@babor.com`), et Auditor (`auditor@babor.com`).

### 🐍 Module B : Scripts Utilitaires Excel (Python openpyxl)
*   **Parser d'importation** : Extraction automatique des métadonnées du navire, des 50+ certificats et des recommandations depuis le fichier Excel téléversé.
*   **Formateur d'exportation d'audit** : Génération d'une copie du template Excel d'origine, injection des formules d'alertes dynamiques (`TODAY()`) et application statique des styles de couleurs de fond (Fills) et de texte selon le statut.

### ✉️ Module C : Moteur de Rappels & Notifications
*   **Service de courriels** : Conception de [helpers/email_service.js](file:///c:/Users/redab/Desktop/CertificatsSurvey/helpers/email_service.js) basé sur `nodemailer` pour préparer et envoyer des e-mails d'alerte adaptés (Vert, Jaune, Rouge).
*   **Mode Simulation (Mock)** : Détection automatique de l'absence de serveur SMTP pour journaliser localement les tentatives d'envoi sans planter.
*   **Historisation en base** : Enregistrement de chaque courriel envoyé dans la table `email_logs` (avec destinataires, date et statut d'envoi).

### 🖥️ Module D : API Backend (Node.js & Express)
*   **Endpoints REST** : Gestion complète des navires, certificats (ajouts manuels, modifications des dates) et des statuts des recommandations.
*   **Planificateur (Cron)** : Configuration d'un script d'arrière-plan avec `node-cron` pour recalculer les alertes et envoyer les e-mails automatiquement chaque jour à minuit.
*   **Déclencheur manuel** : Endpoint `/api/trigger-notifications` pour tester instantanément le moteur de messagerie à la demande.

### 🎨 Module E : Interface Web UI & Mode Écran TV
*   **Dashboard principal** : Indicateurs de conformité globale, liste des navires actifs, et graphique en anneau interactif (*Chart.js*).
*   **Workspace détaillé** : Saisie et modification des dates en direct, filtres et barre de recherche par certificat.
*   **Simulateur de rôles** : Menu déroulant pour basculer de rôle et restreindre/ouvrir les droits d'accès à la volée.
*   **Mode TV de Bureau** : Interface plein écran noire haute lisibilité avec heure/date en temps réel, widgets géants de conformité et carrousel vertical automatique des alertes imminentes.

---

## 2. Backlog d'Évolution & Feuille de Route B2B (Next Steps)

Ces tâches représentent les étapes recommandées pour faire passer le logiciel d'un **prototype local fonctionnel** à une **plateforme SaaS commercialisable** pour vos 3 entreprises partenaires :

| Priorité | Module | Description technique | Statut |
| :--- | :--- | :--- | :--- |
| **P0** | **Sécurité & Auth** | Remplacer le sélecteur de rôle de démonstration par un système d'authentification robuste avec mots de passe chiffrés (`bcrypt`) et jetons sécurisés (`JWT`). | ⏳ À faire |
| **P1** | **Hébergement Cloud** | Déployer le code Node.js sur un serveur VPS (ex. DigitalOcean, Scaleway) ou un PaaS (ex. Render, Heroku) pour le rendre accessible en ligne aux navires et partenaires. | ⏳ À faire |
| **P1** | **Base de Données Cloud** | Migrer le pilote SQLite vers un serveur de base de données managé comme **PostgreSQL** ou **MySQL** pour mieux gérer les accès concurrents. | ⏳ À faire |
| **P1** | **SMTP Professionnel** | Configurer de vrais identifiants SMTP (via un service comme SendGrid, Mailgun ou Amazon SES) pour garantir la délivrabilité des e-mails d'alerte. | ⏳ À faire |
| **P2** | **Pièces Jointes (Upload PDF)** | Permettre aux équipages ou aux managers d'importer le fichier PDF numérisé de chaque certificat physique directement dans l'interface pour faciliter les vérifications. | ⏳ À faire |
| **P2** | **Multi-langue** | Ajouter une option de traduction (Français/Anglais) pour s'adapter aux équipages et auditeurs internationaux. | ⏳ À faire |
