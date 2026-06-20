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

### 6. Simulation des Rôles (B2B Collaboratif)
Un sélecteur de rôle en en-tête permet de simuler et de tester le comportement de la plateforme selon le profil :
*   **Administrateur (Bureaux)** : Droits complets d'écriture, de suppression, de paramétrage e-mail, d'import et d'export.
*   **Équipage (À Bord)** : Droits limités. Peut consulter la flotte et mettre à jour uniquement les certificats d'entretien annuel des équipements de sécurité de bord (*Servicing*).
*   **Partenaire B2B / Auditeur** : Lecture seule pour auditer la conformité d'un navire et lancer des exports de rapports Excel.

---

## 🛠️ Architecture Technique

La plateforme est construite en architecture découplée, optimisée pour la portabilité locale sans installation lourde :

1.  **Backend (Node.js & Express)** : Fournit l'API REST, assure la gestion de fichiers (téléversements avec *multer*), l'envoi de courriels (*nodemailer*) et la planification automatique (*node-cron*).
2.  **Base de Données Relationnelle (SQLite)** : Utilise le module natif et ultra-rapide **`node:sqlite`** (disponible dans Node 22+). Pas de compilation binaire requise lors de l'installation, évitant les erreurs d'environnement sous Windows. Fichier de base de données local : `vessels.db`.
3.  **Parser/Formatter Excel (Python & Openpyxl)** : Script utilitaire exécuté par le backend pour lire les fichiers Excel téléversés et générer les rapports formatés avec styles, polices et formules de calcul complexes pour les audits.
4.  **Frontend (HTML5, Vanilla CSS & Vanilla JS)** : Design Premium minimaliste (Thème Sombre "Dark Navy" / Effet de flou Glassmorphism) optimisé pour des performances d'affichage maximales et sans dépendance lourde de build (Webpack/Vite).

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
2.  Installez les dépendances Node.js :
    ```bash
    npm install
    ```

### Lancement de l'application
Démarrez le serveur local en mode développement (avec redémarrage automatique en cas de modification de code) :
```bash
npm run dev
```

L'application est accessible dans votre navigateur à l'adresse suivante :
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Identifiants d'accès démo (Rôles)

Sélectionnez simplement les rôles dans le menu déroulant de l'en-tête de l'application pour tester les différents profils. Si vous souhaitez tester un formulaire de connexion, voici les comptes configurés en base de données :

*   **Administrateur** : `admin@babor.com` / `admin123`
*   **Capitaine (Équipage)** : `captain@babor.com` / `captain123`
*   **Partenaire B2B** : `partner@babor.com` / `partner123`
*   **Auditeur Externe** : `auditor@babor.com` / `auditor123`
