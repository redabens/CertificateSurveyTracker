# Portail Certificats CNAN NORD - Plateforme de Suivi des Certificats Maritimes

**Portail Certificats CNAN NORD** est une plateforme web moderne et performante de gestion de conformité réglementaire pour une flotte de navires de commerce. Le projet est structuré en architecture découplée de production :

*   **Frontend** : Client Single Page (SPA) réactif développé avec **Next.js** (React, TypeScript, Vanilla CSS premium).
*   **Backend** : API REST robuste développée avec **NestJS** (TypeScript, Prisma ORM, PostgreSQL).
*   **Stockage de fichiers** : Stockage local ou compatible S3 via **MinIO** pour les certificats au format PDF.

---

## 📚 Sommaire de la Documentation Technique

Pour faciliter l'évolution, la maintenance et la mise à l'échelle (scaling) du projet, la documentation technique a été segmentée en guides thématiques spécialisés :

### 👥 1. [Acteurs, Rôles et Processus Métiers](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/stakeholders_and_roles.md)
*   **Description** : Présente les différents intervenants (CNAN NORD, Verital Marine, Inspecteurs, Capitaines), la matrice de droits d'accès basée sur les rôles (RBAC) pour les rôles `Admin`, `Manager`, `Crew` et `Auditor`, ainsi que les processus métiers associés (renouvellement de certificats, alertes mails, levée de recommandations).

### 🏗️ 2. [Architecture Globale du Système](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/architecture_globale.md)
*   **Description** : Offre une vue d'ensemble du système (diagrammes de composants, flux de sécurité d'authentification JWT et règles de calcul automatique de l'état de conformité de la flotte).

### ⚙️ 3. [Architecture du Backend (NestJS)](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/architecture_backend.md)
*   **Description** : Détaille les choix technologiques du backend, l'organisation des répertoires du projet NestJS, et la structure des gardes d'autorisation et de sécurité.
    *   📘 **[Référence des Endpoints de l'API](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/backend_endpoints.md)** : Liste toutes les routes HTTP exposées par l'API, les formats JSON attendus en entrée/sortie et les restrictions de rôles.
    *   🧪 **[Documentation des Tests Backend](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/backend_tests.md)** : Décrit la stratégie de test unitaire et d'intégration via Jest et le rôle de chaque suite de test.

### 🎨 4. [Architecture du Frontend (Next.js)](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/architecture_frontend.md)
*   **Description** : Explique l'organisation de l'application Next.js (App Router), la gestion d'état centralisée par hooks personnalisés, et la prise en charge de l'internationalisation dynamique (FR / EN).
    *   🖌️ **[Guide du Design System](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/frontend_design_system.md)** : Décrit les variables de style CSS (thèmes sombre et clair), les codes de criticité des alertes, et les principes visuels (glassmorphism et transitions fluides).

### 🐳 5. [Architecture de Déploiement](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/architecture_deploiement.md)
*   **Description** : Présente le schéma d'infrastructure réseau, la configuration des volumes persistants pour les fichiers et la base de données, ainsi que la configuration des ressources Kubernetes.
    *   🚀 **[Processus et Commandes de Déploiement](file:///c:/Users/redab/Desktop/CertificatsSurvey/docs/deployment_process.md)** : Guide pratique pas-à-pas pour déployer l'application en production avec Docker Compose ou Kubernetes, de la création des secrets à l'application des migrations Prisma.

---

## ⚙️ Installation Rapide en Mode Développement

### Prérequis
*   **Node.js** version 22.5.0 ou supérieure (recommandé v22.17.1+)
*   **Base de données PostgreSQL** configurée et active sur le port 5432
*   **Python 3.x** avec la bibliothèque `openpyxl` (nécessaire pour l'export Excel) :
    ```bash
    pip install openpyxl
    ```

### 1. Lancement du Backend (NestJS)
1. Accédez au dossier `backend/` et installez les dépendances :
   ```bash
   cd backend
   npm install
   ```
2. Créez un fichier `.env` contenant votre `DATABASE_URL` et votre `JWT_SECRET`.
3. Synchronisez la base de données locale avec Prisma et lancez le serveur :
   ```bash
   npx prisma db push
   npm run start:dev
   ```
   👉 L'API REST est accessible à : **[http://localhost:3000/api](http://localhost:3000/api)**

### 2. Lancement du Frontend (Next.js)
1. Accédez au dossier `frontend/` et installez les dépendances :
   ```bash
   cd ../frontend
   npm install
   ```
2. Lancez le serveur Next.js de développement :
   ```bash
   npm run dev
   ```
   👉 L'interface utilisateur est accessible à : **[http://localhost:3001](http://localhost:3001)**

---

## 🔑 Comptes de Test (Authentification JWT)

Utilisez les comptes démo pré-alimentés lors du seeder pour tester la gestion des rôles :

*   **Administrateur CNAN (Accès Complet)** :
    *   Email : `admin@babor.com`
    *   Mot de passe : `admin123`
*   **Manager Technique Verital (Accès Écriture Flotte/Alertes)** :
    *   Email : `partner@babor.com`
    *   Mot de passe : `partner123`
*   **Capitaine de Bord CNAN (Édition Entretien/Validation Recommandation)** :
    *   Email : `captain@babor.com`
    *   Mot de passe : `captain123`
*   **Auditeur Lloyds Register (Création Recommandations/Lecture Flotte)** :
    *   Email : `auditor@babor.com`
    *   Mot de passe : `auditor123`
