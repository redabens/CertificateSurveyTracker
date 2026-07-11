# Documentation des Tests Backend

Ce document détaille la stratégie de test du backend de l'application **Portail Certificats CNAN NORD**, la liste des suites de tests, et ce qu'elles vérifient individuellement.

---

## 🧪 Stratégie de Test & Stack

Le backend intègre une couverture de tests robuste s'appuyant sur **Jest** et `@nestjs/testing`.
*   **Moteur de test** : Jest
*   **Mode d'exécution requis** : Séquentiel (`--runInBand`) afin d'éviter les collisions d'accès concurrents à la base de données PostgreSQL de test.
*   **Base de données de test** : `vessel_tracker_test` (configurée via la variable d'environnement `DATABASE_URL` lors du lancement des tests).
*   **Cycle de vie** : Avant chaque fichier de test, la base de données est tronquée et ré-alimentée avec des données de graines de test via `DatabaseService.seedData()`.

---

## 📂 Liste des Suites de Tests et Rôle de Chacune

L'API backend comporte **16 fichiers de tests** ciblant les différents services, contrôleurs, et gardes de sécurité :

### 1. Tests d'Authentification et d'Accès (`src/auth/`)
*   **`auth.service.spec.ts`** :
    *   *Rôle* : Valide la logique métier de l'authentification.
    *   *Vérifications* : Connexion réussie avec mot de passe haché correct, rejet en cas d'identifiants incorrects ou d'utilisateur inexistant, cryptage des mots de passe.
*   **`auth.controller.spec.ts`** :
    *   *Rôle* : Valide les points d'entrée HTTP d'authentification.
    *   *Vérifications* : Retour du JWT token en cas de login valide, délégation correcte des appels de création d'utilisateurs au service.
*   **`jwt-auth.guard.spec.ts`** :
    *   *Rôle* : Vérifie le bon fonctionnement du garde d'authentification global.
    *   *Vérifications* : Autorisation des requêtes munies d'un token JWT valide et rejet des requêtes non authentifiées.
*   **`roles.guard.spec.ts`** :
    *   *Rôle* : Vérifie l'application du contrôle d'accès basé sur les rôles (RBAC).
    *   *Vérifications* : Accès autorisé si l'utilisateur possède l'un des rôles déclarés dans `@Roles(...)`, rejet avec erreur `403 Forbidden` si le rôle est insuffisant.
*   **`crew-vessel.guard.spec.ts`** :
    *   *Rôle* : Vérifie le garde de cloisonnement spécifique aux navires pour le rôle `Crew`.
    *   *Vérifications* : L'équipage ne peut accéder qu'aux données de son propre navire (`vesselId` correspondant). Toute requête ciblant un autre navire est rejetée.

### 2. Tests de Gestion de Flotte (`src/vessels/`)
*   **`vessels.service.spec.ts`** :
    *   *Rôle* : Valide la logique de gestion des navires en BDD.
    *   *Vérifications* : Récupération de tous les navires (pour Admin/Manager/Auditor), récupération vide ou ciblée pour le Crew sans navire, insertion correcte d'un navire, suppression physique.
*   **`vessels.controller.spec.ts`** :
    *   *Rôle* : Valide l'API REST de gestion des navires.
    *   *Vérifications* : Délégation correcte au service, vérification que la création manuelle requiert les champs obligatoires (`name`, `imo_number`, `flag`, `owner`), rejet des requêtes incomplètes.

### 3. Tests de Conformité Réglementaire (`src/certificates/`)
*   **`certificates.service.spec.ts`** :
    *   *Rôle* : Valide la gestion des certificats.
    *   *Vérifications* : Création et récupération des certificats d'un navire, mise à jour des dates et de l'URL du fichier PDF stocké, suppression de certificat.
*   **`certificates.controller.spec.ts`** :
    *   *Rôle* : Valide les permissions d'accès aux routes de certificats.
    *   *Vérifications* : L'Admin et le Manager peuvent modifier tous les certificats. Le Crew est rejeté s'il tente d'ajouter ou modifier un certificat de catégorie `Class` ou `Flag`, mais est autorisé pour les certificats de catégorie `Servicing`.

### 4. Tests des Recommandations (`src/actionable/`)
*   **`actionable.service.spec.ts`** :
    *   *Rôle* : Valide la logique de saisie des recommandations techniques.
    *   *Vérifications* : Création d'une recommandation associée à un navire, mise à jour du statut (`Pending` / `Completed`), modification des détails, suppression.
*   **`actionable.controller.spec.ts`** :
    *   *Rôle* : Vérifie le contrôle d'accès sur l'API des recommandations.
    *   *Vérifications* : L'Admin, le Manager et l'Auditeur peuvent créer une recommandation. Le Crew n'est pas autorisé à en créer ou à éditer ses détails, mais il est autorisé à valider (terminer) son statut de traitement à bord.

### 5. Tests d'Alarmes et de Notifications (`src/alarm/` & `src/email/`)
*   **`alarm.service.spec.ts`** :
    *   *Rôle* : Valide le cœur algorithmique de calcul de conformité maritime.
    *   *Vérifications* : Retourne `GREEN` si l'expiration est supérieure à 6 mois ou entre 3 et 6 mois, `YELLOW` / `ORANGE` de 1 à 3 mois, `RED` à moins d'un mois, et `RED_FLASH` si expiré. Détermine correctement l'état global du navire basé sur le pire statut de certificat rencontré.
*   **`email.service.spec.ts`** :
    *   *Rôle* : Valide le service d'envoi d'e-mails d'alarmes.
    *   *Vérifications* : Envoi d'e-mail formaté en HTML, journalisation correcte des envois réussis ou en échec dans la table `EmailLog`.
*   **`email-template.service.spec.ts`** :
    *   *Rôle* : Valide la génération HTML dynamique des rapports d'alertes.
    *   *Vérifications* : Contenu HTML valide incluant la liste des navires et des certificats proches de l'expiration.
*   **`email.scheduler.spec.ts`** :
    *   *Rôle* : Valide la tâche planifiée périodique.
    *   *Vérifications* : La tâche se déclenche et appelle la vérification de la flotte et l'envoi d'e-mails aux navires configurés.

### 6. Tests de Base de Données (`src/database/` & `src/`)
*   **`database.service.spec.ts`** :
    *   *Rôle* : Valide le bon fonctionnement de la connexion PostgreSQL.
    *   *Vérifications* : Connexion opérationnelle, exécution correcte du script de nettoyage et d'alimentation.
*   **`app.controller.spec.ts`** :
    *   *Rôle* : Vérifie les routes utilitaires globales.
    *   *Vérifications* : Déclenchement manuel des alertes, récupération de l'historique des emails envoyés.
