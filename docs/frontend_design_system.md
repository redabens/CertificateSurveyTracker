# Design System du Frontend

Ce document spécifie le design system premium utilisé par l'interface du **Portail Certificats CNAN NORD**. L'intégralité du design est codée en **CSS pur (Vanilla CSS)** sans framework externe (comme Tailwind), offrant d'excellentes performances de chargement et un rendu visuel premium.

---

## 🎨 Palette de Couleurs & Jetons (CSS Variables)

Le design system repose sur une palette sombre élégante ("Option A: Spruce Green & Gold") inspirée du monde maritime corporatif haut de gamme, avec un mode clair (Light Mode) disponible via un interrupteur.

```css
:root {
  /* Arrière-plans */
  --bg-primary: #070c0b;       /* Fond d'écran principal sombre */
  --bg-secondary: #0e1614;     /* Fond de la barre latérale */
  --bg-card: #16221f;          /* Fond des cartes et tables (Glassmorphic) */
  --border-color: #22322e;     /* Bordures fines */
  
  /* Typographie */
  --text-primary: #f2f5f4;     /* Texte principal */
  --text-secondary: #9aa8a5;   /* Texte secondaire */
  --text-muted: #647571;       /* Notes et placeholders */
  
  /* Couleurs de marque */
  --primary-color: #cca43b;    /* Or CNAN */
  --primary-gradient: linear-gradient(180deg, #dfba5c 0%, #cca43b 100%);
  --success-gradient: linear-gradient(180deg, #48a37e 0%, #2f7559 100%);
  --warning-gradient: linear-gradient(180deg, #e59b3c 0%, #c47c25 100%);
  --danger-gradient: linear-gradient(180deg, #d64f3e 0%, #ad3425 100%);
}
```

### Mode Clair (Light Mode)
```css
body.light-mode {
  --bg-primary: #f4f6f5;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --border-color: #d1dcd8;
  --text-primary: #101c19;
  --text-secondary: #4a5c58;
  --text-muted: #798d89;
  --primary-color: #b08d2b;
  --primary-gradient: linear-gradient(180deg, #c59f33 0%, #b08d2b 100%);
}
```

---

## 🚦 Jetons d'Alarmes & Criticité (Status Colors)

Chaque niveau d'alerte réglementaire possède son propre jeu de couleurs de texte et de fond translucide pour une lisibilité instantanée :

| Niveau d'Alerte | Seuil temporel | Variable Fond | Variable Texte | Code Couleur |
| :--- | :--- | :--- | :--- | :--- |
| **Vert (Conforme)** | Expiration > 3 mois | `--status-green-bg` | `--status-green-text` | `#48a37e` |
| **Orange (Warning)** | Expiration de 1 à 3 mois | `--status-orange-bg` | `--status-orange-text` | `#f97316` |
| **Rouge (Urgent)** | Expiration < 1 mois | `--status-red-bg` | `--status-red-text` | `#d64f3e` |
| **Rouge Clignotant** | Certificat expiré | `--status-red-bg` | `--status-red-text` (clignotant) | `#d64f3e` |
| **Violet (Normal)** | Catégorie entretien (Servicing) | `--status-normal-bg`| `--status-normal-text` | `#a855f7` |

---

## 💎 Effets Visuels Premium (Glassmorphism & Micro-animations)

1.  **Cartes & Conteneurs Glassmorphes** :
    *   Les cartes du tableau de bord utilisent un fond légèrement transparent avec un flou d'arrière-plan matériel (`backdrop-filter: blur(12px)`) et une bordure fine d'un pixel pour un effet moderne tridimensionnel :
        ```css
        background: rgba(22, 34, 31, 0.7);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border-color);
        ```
2.  **Transitions Fluides** :
    *   Toutes les interactions (survol de bouton, clic sur les navires, ouverture des drawers) utilisent des transitions cubiques fluides :
        ```css
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        ```
3.  **Tiroirs Latéraux (Drawers)** :
    *   Les formulaires d'édition glissent depuis le côté droit de l'écran avec un fondu au noir d'arrière-plan. Ils intègrent une scrollbar stylisée et masquée sur les côtés pour maximiser l'espace d'affichage.

---

## 📐 Typographie

*   **Police principale** : *Inter* ou police sans-serif système propre.
*   **Tailles et graisses** :
    *   Titres de section (`h2`) : `1.5rem` / `fontWeight: 600`.
    *   KPI numériques des Summary Cards : `2rem` / `fontWeight: 700` (valeurs en chiffres tabulaires pour éviter le sautillement lors de l'actualisation).
    *   Texte de tableau : `0.875rem` / `fontWeight: 400`.
    *   Badges de rôle : `0.75rem` / `fontWeight: 600`.
