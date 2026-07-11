# Référence des Endpoints de l'API Backend

Ce document détaille l'ensemble des routes HTTP exposées par le backend NestJS, les paramètres requis, et les restrictions d'accès associées.

Toutes les routes (sauf `/auth/login`) exigent le header `Authorization: Bearer <JWT_TOKEN>`.

---

## 🔑 1. Authentification & Utilisateurs (`/auth`)

### Connexion Utilisateur
*   **Route** : `POST /api/auth/login`
*   **Accès** : Public
*   **Corps (JSON)** :
    ```json
    {
      "email": "user@example.com",
      "password": "my_password"
    }
    ```
*   **Réponse (JSON)** :
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "email": "user@example.com",
        "fullName": "John Doe",
        "role": "Admin",
        "companyId": 1,
        "vesselId": null
      }
    }
    ```

### Liste des Utilisateurs
*   **Route** : `GET /api/auth/users`
*   **Accès** : `Admin` uniquement

### Création d'Utilisateur
*   **Route** : `POST /api/auth/users`
*   **Accès** : `Admin` uniquement
*   **Corps (JSON)** :
    ```json
    {
      "email": "newuser@example.com",
      "fullName": "Alice Smith",
      "password": "temporarypass",
      "role": "Crew",
      "companyId": 1,
      "vesselId": 3
    }
    ```

### Modification de son propre Mot de Passe
*   **Route** : `POST /api/auth/users/change-password`
*   **Accès** : Tous les rôles connectés
*   **Corps (JSON)** :
    ```json
    {
      "oldPassword": "old_password_here",
      "newPassword": "new_secure_password"
    }
    ```

### Réinitialisation du Mot de Passe d'un Utilisateur
*   **Route** : `POST /api/auth/users/:id/reset-password`
*   **Accès** : `Admin` uniquement
*   **Corps (JSON)** :
    ```json
    {
      "newPassword": "new_password"
    }
    ```

### Suppression d'un Utilisateur
*   **Route** : `DELETE /api/auth/users/:id`
*   **Accès** : `Admin` uniquement

---

## 🚢 2. Gestion de la Flotte (`/vessels`)

### Récupérer les Navires
*   **Route** : `GET /api/vessels`
*   **Accès** : Tous connectés. Le rôle `Crew` ne recevra que son navire attribué.

### Création Manuelle de Navire
*   **Route** : `POST /api/vessels/manual`
*   **Accès** : `Admin` & `Manager` uniquement
*   **Corps (JSON)** :
    ```json
    {
      "name": "BABOR ALGERIEN",
      "imo_number": "9477189",
      "flag": "Algeria",
      "owner": "CNAN",
      "manager": "Verital Marine",
      "asset_type": "Products Tanker",
      "gross_tonnage": 15000,
      "deadweight_tonnage": 25000,
      "port_of_registry": "Alger",
      "call_sign": "7TBC",
      "year_built": 2011,
      "class_society": "Lloyds Register"
    }
    ```

### Suppression de Navire
*   **Route** : `DELETE /api/vessels/:id`
*   **Accès** : `Admin` & `Manager` uniquement

### Importation Excel (.xlsx) de Navire et Certificats
*   **Route** : `POST /api/vessels/import`
*   **Accès** : `Admin` & `Manager` uniquement
*   **Format** : `multipart/form-data` avec le fichier Excel dans le champ `file`.

### Exportation du Rapport de Conformité du Navire
*   **Route** : `GET /api/vessels/:id/export`
*   **Accès** : `Admin`, `Manager`, `Auditor`
*   **Réponse** : Fichier binaire Excel (.xlsx) formaté avec colorations de criticité automatiques.

### Liste des Configurations E-mails du Navire
*   **Route** : `GET /api/vessels/:id/emails`
*   **Accès** : `Admin`, `Manager`

### Ajouter/Mettre à Jour un E-mail pour les Notifications du Navire
*   **Route** : `POST /api/vessels/:id/emails`
*   **Accès** : `Admin`, `Manager`
*   **Corps (JSON)** :
    ```json
    {
      "email": "captain@vessel.com"
    }
    ```

### Valider le Code de Vérification E-mail d'un Navire
*   **Route** : `POST /api/vessels/:id/emails/verify`
*   **Accès** : `Admin`, `Manager`
*   **Corps (JSON)** :
    ```json
    {
      "email": "captain@vessel.com",
      "token": "123456"
    }
    ```

### Supprimer un E-mail Associé au Navire
*   **Route** : `DELETE /api/vessels/:id/emails`
*   **Accès** : `Admin`, `Manager`
*   **Corps (JSON)** :
    ```json
    {
      "email": "captain@vessel.com"
    }
    ```

### Déclencher Manuellement les Notifications E-mails d'un Navire
*   **Route** : `POST /api/vessels/:id/trigger-notifications`
*   **Accès** : `Admin`, `Manager`

---

## 📜 3. Gestion des Certificats (`/certificates` & `/vessels/:vesselId/certificates`)

### Liste des Certificats d'un Navire
*   **Route** : `GET /api/vessels/:vesselId/certificates`
*   **Accès** : Tous connectés (les capitaines `Crew` doivent appartenir à ce navire).

### Ajouter un Certificat à un Navire
*   **Route** : `POST /api/vessels/:vesselId/certificates`
*   **Accès** : `Admin`, `Manager` (et `Crew` uniquement si `category` = "Servicing").
*   **Corps (JSON)** :
    ```json
    {
      "name": "Safety Equipment Certificate",
      "category": "Class", // ou "Flag" ou "Servicing"
      "issue_date": "2026-01-01",
      "expiry_date": "2027-01-01",
      "organization": "Lloyds Register",
      "remarks": "Nouveau certificat après visite annuelle."
    }
    ```

### Modifier un Certificat
*   **Route** : `PUT /api/certificates/:id`
*   **Accès** : `Admin`, `Manager` (et `Crew` uniquement si le certificat modifié est en catégorie "Servicing").

### Supprimer un Certificat
*   **Route** : `DELETE /api/certificates/:id`
*   **Accès** : `Admin`, `Manager` uniquement

### Charger un Fichier PDF de Certificat
*   **Route** : `POST /api/certificates/:id/upload`
*   **Accès** : `Admin`, `Manager` (et `Crew` si catégorie "Servicing")
*   **Format** : `multipart/form-data` avec le document dans le champ `file`.

---

## 📋 4. Recommandations Règlementaires (`/actionable-items`)

### Liste des Recommandations d'un Navire
*   **Route** : `GET /api/vessels/:vesselId/actionable-items`
*   **Accès** : Tous connectés.

### Ajouter une Recommandation
*   **Route** : `POST /api/vessels/:vesselId/actionable-items`
*   **Accès** : `Admin`, `Manager` et `Auditor` uniquement.
*   **Corps (JSON)** :
    ```json
    {
      "imposed_date": "2026-07-10",
      "due_date": "2026-10-10",
      "category": "Condition of Class",
      "report_number": "ALG-2026-118",
      "description": "Réparation nécessaire sur la pompe d'incendie de secours."
    }
    ```

### Basculer le Statut d'une Recommandation (Pending / Completed)
*   **Route** : `PUT /api/actionable-items/:id/status`
*   **Accès** : `Admin`, `Manager`, `Crew` (lecture seule pour `Auditor`).
*   **Corps (JSON)** :
    ```json
    {
      "status": "Completed" // ou "Pending"
    }
    ```

### Éditer une Recommandation
*   **Route** : `PUT /api/actionable-items/:id`
*   **Accès** : `Admin`, `Manager` uniquement

### Supprimer une Recommandation
*   **Route** : `DELETE /api/actionable-items/:id`
*   **Accès** : `Admin`, `Manager` uniquement

---

## 🪵 5. Logs & Actions Globales

### Journal des Logs d'Envoi d'E-mails
*   **Route** : `GET /api/email-logs`
*   **Accès** : `Admin`, `Manager` uniquement

### Déclencher Manuellement la Vérification Globale et Envoi des Alertes E-mails
*   **Route** : `POST /api/trigger-notifications`
*   **Accès** : `Admin`, `Manager` uniquement

### Journal des Traces de Sécurité (Audit Logs)
*   **Route** : `GET /api/audit-logs`
*   **Accès** : `Admin` uniquement
