# Portail Certificats CNAN NORD - Plateforme de Suivi des Certificats Maritimes (Decoupled Stack)

**Portail Certificats CNAN NORD** est une plateforme web moderne et performante de gestion de conformité réglementaire pour une flotte de navires de commerce. Le projet est entièrement restructuré en architecture découplée de production :

- **Frontend** : Client Single Page réactif développé avec **Next.js** (React, TypeScript, Vanilla CSS).
- **Backend** : API REST robuste développée avec **NestJS** (TypeScript, node:sqlite).

---

## 📁 Structure du Projet

```
/CertificateSurveyTracker
├── backend/                  # API REST de production (NestJS, TypeScript)
│   ├── src/
│   │   ├── auth/            # JWT, Cryptage et Gardes RBAC
│   │   ├── database/        # Service d'accès SQLite natif (node:sqlite)
│   │   ├── vessels/         # Gestion de flotte et exports Excel colorés
│   │   ├── certificates/    # Édition de certificats et téléversements de PDF
│   │   ├── actionable/      # Recommandations techniques Lloyd's Register
│   │   ├── email/           # Alarmes SMTP et Cron de vérification quotidienne
│   │   └── main.ts          # Bootloader NestJS (CORS, Static Serving)
│   ├── helpers/             # Script Python d'onboarding et d'exports
│   └── uploads/             # Stockage local sécurisé des PDF de certificats
├── frontend/                 # Application client SPA (Next.js, TypeScript)
│   ├── src/
│   │   ├── app/             # Routage Next.js (Dashboard, Login, TV dashboard)
│   │   ├── components/      # UI (Sidebar, Modales, Tables, Charts)
│   │   └── context/         # AuthContext JWT et LanguageContext (i18n)
│   └── public/
│       └── locales/         # Fichiers de traductions JSON (fr.json, en.json)
└── README.md                 # Ce document de guide
```

---

## ⚙️ Installation et Lancement

### Prérequis

- **Node.js** version 22.5.0 ou supérieure (recommandé v22.17.1+)
- **Python 3.x** avec la bibliothèque `openpyxl` :
  ```bash
  pip install openpyxl
  ```

---

### 1. Lancement du Backend (NestJS)

1.  Accédez au dossier `backend/` :
    ```bash
    cd backend
    ```
2.  Installez les dépendances :
    ```bash
    npm install
    ```
3.  Lancez le serveur en mode développement :
    ```bash
    npm run start:dev
    ```
    👉 L'API REST est accessible à : **[http://localhost:3000/api](http://localhost:3000/api)**  
    Le fichier de base de données `vessels.db` est automatiquement initialisé et alimenté avec les graines de test au premier démarrage.

---

### 2. Lancement du Frontend (Next.js)

1.  Accédez au dossier `frontend/` :
    ```bash
    cd frontend
    ```
2.  Installez les dépendances :
    ```bash
    npm install
    ```
3.  Lancez le serveur Next.js en mode développement :
    ```bash
    npm run dev
    ```
    👉 L'interface utilisateur est accessible sur le port 3001 à : **[http://localhost:3001](http://localhost:3001)**

---

## 🔑 Comptes de Test (Authentification JWT)

Utilisez les comptes démo pré-alimentés pour tester la gestion des rôles :

- **Administrateur (Accès Complet)** :
  - Email : `admin@babor.com`
  - Mot de passe : `admin123`
- **Capitaine (Équipage - Édition Servicing)** :
  - Email : `captain@babor.com`
  - Mot de passe : `captain123`
- **Partenaire B2B (Lecture seule)** :
  - Email : `partner@babor.com`
  - Mot de passe : `partner123`
- **Auditeur Externe (Lecture seule)** :
  - Email : `auditor@babor.com`
  - Mot de passe : `auditor123`

