# Epic 2 : Base de Données Production (SQL Cloud) & Déploiement

## 📌 À quoi ça sert ?
Pour le développement local, SQLite (`node:sqlite`) est parfait car il s'exécute en mémoire ou dans un fichier local sans aucun serveur externe. Cependant, en production, l'application sera hébergée dans le cloud et devra gérer des accès concurrents fréquents (depuis les navires en mer, les bureaux à terre, les terminaux des directeurs et les inspecteurs).
SQLite n'est pas conçu pour des écritures hautement concurrentes sur le réseau. Cet Epic documente la migration vers un gestionnaire de base de données relationnelle robuste de production (comme **PostgreSQL** ou **MySQL**) et le déploiement de l'application sur un serveur cloud accessible 24/7.

---

## 🛠️ Comment le réaliser ?

### Étape 1 : Choix et configuration de la base de données PostgreSQL
1. Créer une base de données PostgreSQL (locale pour le dev, ou managée chez un hébergeur comme DigitalOcean, AWS RDS ou Supabase).
2. Installer le pilote client pour Node.js :
   ```bash
   npm install pg
   ```

### Étape 2 : Création d'une couche d'abstraction (Query Builder ou ORM)
Pour faciliter le passage de SQLite à PostgreSQL sans réécrire toutes les requêtes brutes de l'application, utiliser un Query Builder comme **Knex.js** ou un ORM comme **Prisma** :
1. Installer Knex :
   ```bash
   npm install knex
   ```
2. Configurer le fichier `knexfile.js` pour gérer les différents environnements (développement avec SQLite, production avec PostgreSQL) :
   ```javascript
   module.exports = {
     development: {
       client: 'sqlite3',
       connection: { filename: './vessels.db' },
       useNullAsDefault: true
     },
     production: {
       client: 'postgresql',
       connection: process.env.DATABASE_URL, // URI de connexion cloud sécurisée
       pool: { min: 2, max: 10 }
     }
   };
   ```

### Étape 3 : Migration des tables
Créer des scripts de migration Knex pour générer le schéma sur PostgreSQL à l'identique :
```bash
npx knex migrate:make create_vessels_and_certificates
```
Définir les colonnes et types SQL compatibles avec PostgreSQL (notamment les clés primaires auto-incrémentées et les liaisons de clés étrangères en cascades).

### Étape 4 : Déploiement du serveur backend
1. Préparer le code Express pour écouter sur le port attribué par le serveur cloud :
   ```javascript
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```
2. Déployer sur une plateforme Cloud :
   *   **Option A (PaaS - Render / Heroku)** : Connecter le dépôt GitHub. Configurer les variables d'environnement (`DATABASE_URL`, `SMTP_HOST`, `JWT_SECRET`, etc.). Lancer le déploiement automatique à chaque push sur `main`.
   *   **Option B (VPS - DigitalOcean / Scaleway)** : Configurer un serveur Linux Ubuntu. Installer Node.js, configurer un gestionnaire de processus comme **PM2** pour relancer le serveur en cas de crash, et installer **Nginx** comme reverse proxy pour rediriger le trafic HTTPS (port 443) vers le port 3000 de Node.js.
