# Babor Tracker - Logiciel de Suivi des Certificats Maritimes

**Babor Tracker** est une plateforme web dédiée à la gestion, au suivi et à l'automatisation de la conformité réglementaire pour une flotte de navires de commerce. Conçu comme une alternative moderne, collaborative et robuste aux traditionnels fichiers Excel de suivi, ce logiciel centralise la gestion des certificats maritimes (Classe, Pavillon et Entretien d'équipements) et automatise les flux d'alertes visuelles et de courriels.

---

## 🚀 Fonctionnalités Clés

### 1. Tableau de Bord Analytique (Dashboard)
*   **Indicateurs globaux** : Nombre total de navires actifs et décompte immédiat des certificats urgents (Rouge), en attention (Jaune) et suivis (Vert).
*   **Graphique de conformité** : Graphique en anneau dynamique (intégré avec *Chart.js*) illustrant la répartition globale des statuts de conformité de la flotte.
*   **Actions urgentes** : Liste récapitulative des navires nécessitant des actions de régularisation immédiates.

### 2. Gestion de Flotte Intelligente
*   **Fiches techniques navires** : Visualisation des métadonnées essentielles extraites (Nom, IMO, Pavillon, Propriétaire, Manager, Jauge brute, Port de registre, etc.).
*   **Import Excel (Onboarding)** : Téléversement direct du fichier Excel d'origine du navire pour l'enregistrer et importer instantanément ses 50+ certificats et recommandations Lloyd's Register.
*   **Export Excel d'Audit** : Génération et téléchargement d'un rapport Excel actualisé avec formules de calcul dynamiques et colorations de cellules intégrées (Rouge, Jaune, Vert) pour présentation aux inspecteurs maritimes.

### 3. Système d'Alertes Visuelles (Code Couleur)
Les alarmes se calculent en temps réel par rapport à la date de visite ou de validité d'un certificat :
*   🔴 **Rouge (Urgent/Expiré - Action immédiate)** : Échéance active dans moins de **30 jours** ou date dépassée.
*   🟡 **Jaune (Attention - Planification)** : Échéance active dans moins de **90 jours** (3 mois) et supérieure à 30 jours.
*   🟢 **Vert (Suivi - OK)** : Échéance active dans moins de **180 jours** (6 mois) et supérieure à 90 jours.
*   🔵 **Gris/Normal (Conforme)** : Échéance lointaine supérieure à **180 jours** (aucun risque en cours).

### 4. Automatisation des Notifications E-mail
*   **Configuration flexible** : Jusqu'à 3 adresses e-mail cibles configurables par navire.
*   **Envoi intelligent** : Le serveur analyse quotidiennement (via un planificateur de tâches en tâche de fond) les changements de statuts. Dès qu'un certificat passe de Normal à Vert, de Vert à Jaune, ou de Jaune à Rouge, un e-mail contenant les détails réglementaires est envoyé.
*   **Journalisation** : Historique complet de tous les courriels envoyés avec leur statut de distribution dans l'application.

### 5. Mode Écran TV de Bureau (Plein Écran)
*   Conçu spécifiquement pour être affiché en continu sur un téléviseur dans le bureau de direction.
*   **Widgets grand format** : Affichage haute visibilité du taux de conformité et des nombres d'alertes actives.
*   **Défilement automatique** : Carrousel vertical automatique des alertes et inspections imminentes pour une veille passive efficace.
*   **Mise à jour automatique** : Rafraîchissement régulier des données toutes les 30 secondes et widget heure/date locale en temps réel.

### 6. Rôles et Enforcements de Sécurité (JWT & RBAC)
La plateforme intègre un véritable contrôle d'accès basé sur les rôles (RBAC) renforcé par jetons JWT :
*   **Administrateur (Bureaux - CNAN / Verital)** : Droits complets d'écriture, de suppression, de paramétrage e-mail, d'import Excel et d'export pour toute la flotte.
*   **Équipage (À Bord - Capitaine)** : Droits restreints au navire assigné. Peut consulter la fiche technique et modifier/téléverser des PDF uniquement pour les certificats d'entretien annuel des équipements de sécurité de bord (*Servicing*).
*   **Partenaire B2B / Auditeur** : Mode consultation en lecture seule sur les navires autorisés pour auditer la conformité et télécharger des rapports Excel d'audit.

---

## 🛠️ Architecture Technique

La plateforme est construite en architecture découplée, prête pour la production :

1.  **Authentication & Sécurité (Epic 1)** :
    *   Mots de passe hachés avec `bcryptjs` en base de données.
    *   Authentification sans état (stateless) via jetons signés avec `jsonwebtoken` (JWT) avec expiration de 8 heures.
    *   Middleware d'authentification `authenticateToken` protégeant les routes d'API, filtrant les requêtes selon le rôle et isolant les données B2B.

2.  **Base de Données Relationnelle de Production (Epic 2)** :
    *   Utilise le module natif et ultra-rapide **`node:sqlite`** (disponible dans Node 22+). Pas de compilation binaire requise lors de l'installation, évitant les erreurs d'environnement sous Windows.
    *   Architecture en couches isolée (Repository Pattern dans `db.js`) pour séparer les requêtes SQL du reste de l'application. Facilement adaptable à PostgreSQL ou MySQL.
    *   Schémas relationnels stricts : `users`, `companies`, `vessels`, `certificates`, `actionable_items`, `email_settings` et `email_logs`.

3.  **Notifications & SMTP Professionnel (Epic 3)** :
    *   Service SMTP utilisant `nodemailer` avec support de variables d'environnement dynamiques et mode de secours/simulé automatique.
    *   Calcul en temps réel des décalages de statuts (Vert, Jaune, Rouge). En cas de changement, un e-mail est expédié aux adresses associées et enregistré dans le journal système `email_logs`.

4.  **Gestion des Pièces Jointes & PDF (Epic 4)** :
    *   Téléversement de documents officiels PDF associés aux certificats (limite de 10 Mo, vérification stricte du type MIME via `multer`).
    *   Stockage local sécurisé et prévisualisation directe au sein de l'application via une fenêtre modale intégrant un iframe.

5.  **Multi-langue & Internationalisation (Epic 5)** :
    *   Moteur i18n léger côté client chargeant dynamiquement les fichiers dictionnaires `fr.json` et `en.json` sans dépendances externes.
    *   Génération d'exports Excel bilingues. Le backend transmet le code de langue actif (`fr` ou `en`) au script Python de formatage (`excel_handler.py`), qui adapte dynamiquement les libellés et les formules d'alarmes.

---

## ⚙️ Installation et Lancement

### Prérequis
*   **Node.js** version 22.5.0 ou supérieure (recommandé v22.17.1+)
*   **Python 3.x** avec la bibliothèque `openpyxl` :
    ```bash
    pip install openpyxl
    ```

### Procédure d'installation
1.  Ouvrez un terminal dans le répertoire racine du projet.
2.  Installez les dépendances Node.js (dont `bcryptjs` et `jsonwebtoken`) :
    ```bash
    npm install
    ```

### Lancement de l'application
Démarrez le serveur local :
```bash
npm start
```
Ou en mode développement (avec redémarrage automatique en cas de modification de code) :
```bash
npm run dev
```

L'application est accessible dans votre navigateur à l'adresse suivante :
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Identifiants d'accès démo (Rôles)

Connectez-vous sur l'écran d'accueil avec les identifiants pré-configurés en base de données pour tester les différents profils :

*   **Administrateur** : `admin@babor.com` / `admin123`
*   **Capitaine (Équipage)** : `captain@babor.com` / `captain123` (Accès restreint au navire assigné, édition Servicing uniquement)
*   **Partenaire B2B** : `partner@babor.com` / `partner123` (Lecture seule)
*   **Auditeur Externe** : `auditor@babor.com` / `auditor123` (Lecture seule)
