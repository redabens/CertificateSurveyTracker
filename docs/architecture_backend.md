# Architecture du Backend (API NestJS)

Ce document décrit l'architecture technique, le choix des technologies, et la structure de l'API REST de production développée pour le **Portail Certificats CNAN NORD**.

---

## 🛠️ Stack Technique du Backend

*   **Runtime** : Node.js (v22.5.0+)
*   **Framework Principal** : NestJS (v10.x) — Architecture modulaire inspirée d'Angular (Modules, Controllers, Providers, Guards, Pipes, Interceptors).
*   **Langage** : TypeScript
*   **Accès Base de Données (ORM)** : Prisma ORM (v6.x)
*   **Moteur Base de Données** : PostgreSQL (v15+)
*   **Stockage de fichiers** : MinIO Client SDK (pour intégration S3) ou Stockage disque local (via Multer).
*   **Validation des DTOs** : `class-validator` & `class-transformer`
*   **Authentification & Cryptage** : `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`
*   **Génération Excel** : Script Python autonome s'appuyant sur `openpyxl`.
*   **Tests** : Jest (v29.x)

---

## 📁 Organisation des Dossiers (Structure Source)

```
/backend
├── prisma/                  # Configuration Prisma ORM
│   ├── schema.prisma        # Schéma des tables, index et relations SQL
│   └── migrations/          # Migrations de structure de base de données
├── src/                     # Code source de l'application NestJS
│   ├── main.ts              # Point d'entrée de l'application (Bootloader)
│   ├── app.module.ts        # Module racine important tous les sous-modules
│   ├── app.controller.ts    # Contrôleur racine (logs d'alertes e-mails)
│   │
│   ├── auth/                # Authentification, gestion utilisateurs et RBAC
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts  # Validation de la signature du JWT
│   │   ├── roles.decorator.ts
│   │   ├── roles.guard.ts   # Guard vérifiant les rôles autorisés
│   │   └── crew-vessel.guard.ts # Guard restreignant le Crew à son propre navire
│   │
│   ├── database/            # Connexion et initialisation (Seed) de la BDD
│   │   ├── prisma.service.ts   # Service client Prisma
│   │   └── database.service.ts # Script d'alimentation de test (Seeder)
│   │
│   ├── vessels/             # Gestion de la flotte et exports
│   │   ├── vessels.controller.ts
│   │   ├── vessels.service.ts
│   │   └── helpers/         # Script Python export_vessel.py
│   │
│   ├── certificates/        # Gestion des certificats (Classe, Pavillon, Servicing)
│   │   ├── certificates.controller.ts
│   │   └── certificates.service.ts
│   │
│   ├── actionable/          # Recommandations réglementaires (Actionable Items)
│   │   ├── actionable.controller.ts
│   │   └── actionable.service.ts
│   │
│   ├── alarm/               # Moteur de calcul d'alarmes temporelles
│   │   └── alarm.service.ts # Calculateur des couleurs d'alarmes (VERT/JAUNE/ORANGE/ROUGE)
│   │
│   ├── audit/               # Journal d'audit de sécurité des actions critiques
│   │   ├── audit.controller.ts
│   │   └── audit.service.ts # Historisation des modifications en BDD
│   │
│   └── email/               # Tâches planifiées et notifications SMTP
│       ├── email.scheduler.ts # Cron de vérification quotidienne
│       ├── email.service.ts   # Envoi SMTP via Nodemailer
│       └── email-template.service.ts # Templates HTML personnalisés d'e-mails
│
├── uploads/                 # Répertoire de stockage local des PDF (si local)
├── test/                    # Tests d'intégration de bout en bout (e2e)
├── package.json
└── tsconfig.json
```

---

## 🔒 Gardes d'Autorisations (Security Guards)

Le backend protège ses routes à l'aide de deux Guards NestJS principaux :

1.  **JwtAuthGuard** : 
    *   S'assure que la requête comporte un token JWT valide dans son en-tête `Authorization`.
    *   Si le token est expiré ou invalide, renvoie une erreur `401 Unauthorized`.
2.  **RolesGuard** :
    *   Vérifie le rôle de l'utilisateur décodé à partir du token JWT.
    *   Compare ce rôle avec les rôles autorisés spécifiés par le décorateur `@Roles(...)` sur la route.
    *   Si le rôle n'a pas les privilèges suffisants, renvoie une erreur `403 Forbidden`.
3.  **CrewVesselGuard** :
    *   Spécifiquement conçu pour les membres d'équipage (`Crew`).
    *   Vérifie que le capitaine connecté tente d'accéder ou de modifier des informations associées uniquement à son propre navire (`user.vesselId`).
    *   Bloque immédiatement les requêtes inter-navires en levant une exception `403 Forbidden`.
