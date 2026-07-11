# Spécification des Rôles, Acteurs et Processus Métiers

Ce document décrit les différents acteurs (stakeholders) de l'application **Portail Certificats CNAN NORD**, les rôles associés au sein du système, les fonctionnalités dédiées à chacun, et les processus métiers sous-jacents.

---

## 👥 Acteurs (Stakeholders) du Projet

1. **CNAN NORD (Armateur / Propriétaire de la Flotte)**
   * **Rôle opérationnel** : Propriétaire de la flotte de navires de commerce. Il doit s'assurer que ses navires sont conformes pour éviter l'arrêt technique, les amendes portuaires ou les annulations d'assurance.
   * **Besoin principal** : Avoir une visibilité complète sur le statut de conformité statutaire de la flotte, suivre les actions de l'équipage, et s'assurer que le gestionnaire technique fait son travail.

2. **Verital Marine Services (Gestionnaire Technique / Technical Manager Operator)**
   * **Rôle opérationnel** : Société externe chargée de la gestion technique opérationnelle de la flotte pour le compte de CNAN NORD.
   * **Besoin principal** : Organiser les visites de renouvellement des certificats, gérer les documents de conformité, assigner les actions de maintenance, et suivre l'état de chaque navire en temps réel.

3. **Lloyd's Register / Sociétés de Classification (Auditeur Externe / Inspecteurs)**
   * **Rôle opérationnel** : Organisme officiel de certification maritime. Réalise les inspections physiques à bord pour délivrer les certificats de classe et de pavillon. Émet des recommandations réglementaires (Actionable Items) en cas de défaut constaté.
   * **Besoin principal** : Saisir les non-conformités directement dans le système lors des inspections à bord et consulter le statut de conformité global des navires.

4. **Équipage (Capitaines, Seconds Mécaniciens, Officiers de Bord)**
   * **Rôle opérationnel** : Personnel naviguant à bord de chaque navire.
   * **Besoin principal** : Mettre à jour les certificats d'entretien courant (Servicing) réalisés à bord, charger les preuves au format PDF, et suivre les recommandations de l'auditeur à corriger avant la date limite.

---

## 🔐 Matrice des Rôles & Autorisations Applicatifs

Le système comporte **4 rôles applicatifs** simples :

| Fonctionnalité | Admin (CNAN/Verital) | Manager (Verital Tech) | Auditor (Inspecteur) | Crew (Capitaine) |
| :--- | :---: | :---: | :---: | :---: |
| **Visibilité Navires** | Flotte entière | Flotte entière | Flotte entière | Son navire uniquement |
| **Gestion Flotte (Navires)** | Lecture/Écriture | Lecture/Écriture | Lecture seule | Aucune |
| **Certificats Statutaires (Classe/Pav.)**| Lecture/Écriture | Lecture/Écriture | Lecture seule | Lecture seule |
| **Certificats d'Entretien (Servicing)** | Lecture/Écriture | Lecture/Écriture | Lecture seule | Lecture/Écriture |
| **Création de Recommandations** | Oui | Oui | Oui | Non |
| **Modification/Suppr. Recommandations**| Oui | Oui | Non | Non |
| **Validation Recommandation (Statut)** | Oui | Oui | Non (Lecture seule) | Oui (Terminer/Suspendre) |
| **Logs d'alertes e-mails (Consultation)**| Oui | Oui | Non | Non |
| **Déclenchement Manuel Notification** | Oui | Oui | Non | Non |
| **Gestion des Comptes Utilisateurs** | Oui | Non | Non | Non |
| **Journal d'Audit de Sécurité (Traces)**| Oui | Non | Non | Non |

---

## 🔄 Processus Métiers & Workflows

### 1. Processus d'Onboarding et Importation de Flotte
* **Objectif** : Initialiser les données d'un ou plusieurs navires avec leurs certificats initiaux.
* **Acteurs** : `Admin` ou `Manager`.
* **Workflow** :
  1. Le Manager ou l'Admin accède au panneau d'importation de navires.
  2. Il importe un fichier standardisé Excel (.xlsx) généré à partir des bases de données internes ou crée le navire manuellement.
  3. Le système importe le navire, calcule automatiquement les statuts de criticité de chaque certificat et génère les alertes initiales.

### 2. Processus d'Inspection et Suivi des Recommandations
* **Objectif** : Saisir et lever les non-conformités détectées lors des visites de classification.
* **Acteurs** : `Auditor` (saisie), `Crew` (exécution), `Manager`/`Admin` (validation).
* **Workflow** :
  1. L'auditeur (inspecteur Lloyd's Register) monte à bord et constate une défaillance (ex. équipement de sécurité défectueux).
  2. L'auditeur se connecte au portail, sélectionne le navire concerné et ajoute une **Recommandation** avec une date limite (due date) et une description.
  3. Le capitaine du navire (`Crew`) voit cette recommandation sur son tableau de bord.
  4. Une fois le défaut corrigé à bord, le capitaine clique sur **Terminer (Completed)**.
  5. Le `Manager` technique vérifie l'action et valide définitivement la recommandation.

### 3. Processus de Renouvellement de Certificats
* **Objectif** : Remplacer un certificat expirant par un nouveau certificat valide.
* **Acteurs** : `Manager`, `Admin`, ou `Crew` (uniquement pour les catégories *Servicing*).
* **Workflow** :
  1. Le certificat passe en statut d'alerte **Orange** (moins de 3 mois) ou **Rouge** (moins d'un mois).
  2. L'acteur responsable réalise la visite technique / l'entretien nécessaire.
  3. L'acteur met à jour la date d'émission et la date d'expiration du certificat sur le portail et télécharge le nouveau document PDF signé.
  4. Le système recalcule automatiquement le statut de l'alarme du navire, qui repasse au **Vert**.

### 4. Processus d'Alertes et Notifications e-mails
* **Objectif** : Alerter par e-mail les responsables de la flotte et les capitaines à bord avant l'expiration des certificats.
* **Acteurs** : Système automatisé (Cron Job), `Admin`, ou `Manager` (déclenchement manuel).
* **Workflow** :
  1. Un script d'arrière-plan s'exécute quotidiennement à minuit.
  2. Pour chaque navire, le script vérifie tous les certificats et identifie ceux qui expirent bientôt (seuils de 3 mois, 1 mois, et expiré).
  3. Le système envoie un e-mail récapitulatif formaté en HTML :
     * Aux adresses e-mails configurées spécifiquement pour le navire (ex: capitaine@nomdunavire.com).
     * Au service technique central de Verital.
  4. Si nécessaire, un `Admin` ou `Manager` peut forcer l'envoi de ces alertes à tout moment via le bouton de notification manuelle sur le tableau de bord.
  5. Toutes les tentatives et envois d'e-mails d'alerte sont historisés dans le menu **Logs d'e-mails** pour traçabilité.
