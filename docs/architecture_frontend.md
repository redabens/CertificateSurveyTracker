# Architecture du Frontend (Client Next.js)

Ce document décrit l'architecture technique, le choix des technologies, et la structure de l'application cliente Web développée pour le **Portail Certificats CNAN NORD**.

---

## 🛠️ Stack Technique du Frontend

*   **Runtime** : Node.js (v22.5.0+)
*   **Framework Principal** : Next.js (v14.x / v16.x) — Utilise le **App Router** (`/src/app`) pour la gestion des pages et de la mise en page (layouts).
*   **Langage** : TypeScript
*   **Style (Design CSS)** : Vanilla CSS premium, moderne et réactif. Pas de framework lourd externe (comme Tailwind ou Bootstrap), permettant un contrôle total des styles.
*   **Internationalisation (i18n)** : `i18next` avec intégration de fichiers de traduction dynamiques.
*   **Charts & Graphiques** : `Chart.js` avec `react-chartjs-2` pour l'affichage visuel des statistiques de conformité de la flotte.
*   **Icônes** : SVG vectoriels en ligne pour un chargement instantané sans bibliothèque tierce lourde.

---

## 📁 Organisation des Dossiers (Structure Source)

```
/frontend
├── src/
│   ├── app/                 # Pages et Routage Next.js (App Router)
│   │   ├── layout.tsx       # Layout global (HTML, body, polices, thèmes)
│   │   ├── globals.css      # Fichier de styles global & design system variables
│   │   ├── page.tsx         # Dashboard Principal (Vue d'ensemble de la flotte)
│   │   └── login/
│   │       └── page.tsx     # Page de Connexion
│   │
│   ├── components/          # Composants UI modulaires
│   │   ├── dashboard/       # Composants spécifiques au Dashboard
│   │   │   ├── SummaryCards.tsx      # Cartes de synthèse (Vert, Orange, Rouge, Total)
│   │   │   ├── VesselsList.tsx       # Liste latérale de sélection des navires
│   │   │   ├── CertificatesTable.tsx # Table des certificats du navire sélectionné
│   │   │   └── ComplianceChart.tsx   # Graphique en beignet (Doughnut Chart) de conformité
│   │   │
│   │   └── drawers/         # Tiroirs (Drawers) coulissants de formulaires
│   │       ├── AddVesselDrawer.tsx      # Formulaire d'ajout de navire
│   │       ├── AddCertificateDrawer.tsx # Formulaire d'ajout de certificat
│   │       ├── AddActionableDrawer.tsx  # Formulaire d'ajout de recommandation
│   │       ├── AddUserDrawer.tsx        # Formulaire d'ajout d'utilisateur (Admin)
│   │       ├── EmailConfigDrawer.tsx    # Configuration des alertes e-mails du navire
│   │       └── EditVesselDrawer.tsx     # Formulaire d'édition de navire
│   │
│   ├── context/             # Gestionnaires d'état globaux (React Context)
│   │   ├── AuthContext.tsx     # Session utilisateur, connexion, stockage JWT
│   │   └── LanguageContext.tsx # Gestion du multilingue (FR / EN)
│   │
│   └── hooks/               # Logique d'appels API et état local (Custom Hooks)
│       └── useDashboard.ts  # Hook centralisant tous les appels API et états du dashboard
│
├── public/
│   ├── locales/             # Dictionnaires de traduction JSON
│   │   ├── fr.json          # Fichier de langue Française
│   │   └── en.json          # Fichier de langue Anglaise
│   └── favicon.ico
│
├── package.json
└── next.config.js
```

---

## 🌍 Internationalisation (i18n) & Traduction

L'ensemble de l'interface utilisateur est entièrement localisé en **Français** et en **Anglais** :
*   Les traductions sont stockées dans `/public/locales/fr.json` et `/public/locales/en.json`.
*   Le composant `LanguageContext.tsx` charge la langue préférée de l'utilisateur (conservée dans le stockage local).
*   Tous les formulaires, tableaux, messages d'erreurs et badges s'adaptent instantanément lors du changement de langue via le sélecteur présent dans la barre latérale.

---

## 🔄 Gestion d'État du Dashboard (`useDashboard.ts`)

Pour garder les composants UI propres et réutilisables, la logique d'état et les requêtes HTTP vers le backend sont isolées dans le hook personnalisé **`useDashboard`** :
*   **États gérés** : Navire actuellement sélectionné, liste des navires, liste des certificats, liste des recommandations, filtres de recherche (texte, état), visibilité de tous les tiroirs (modales).
*   **Fonctions métiers exportées** : `fetchData()` (rafraîchissement global), `handleExcelExport()` (téléchargement du rapport Excel), `toggleActionableStatus(...)` (changement d'état des recommandations).
*   **Auto-rafraîchissement (Poller)** : Un intervalle automatique rafraîchit les données du tableau de bord toutes les 30 secondes pour garantir une vue d'ensemble toujours à jour sans rechargement manuel de la page.
