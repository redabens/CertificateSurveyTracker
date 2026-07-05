# Charte Graphique & Système de Design
## Portail Certificats CNAN NORD

Ce document présente l'identité visuelle (Branding), la palette de couleurs officielle (Color Palette) et les jetons de design (Design Tokens) utilisés sur l'interface du **Portail Certificats CNAN NORD**.

Le design est conçu avec une esthétique **Premium Dark Mode** par défaut (inspirée du style *Glassmorphism* maritime), avec un support complet pour le mode clair (Light Mode).

---

## 1. Identité Visuelle (Branding System)

Le branding de la plateforme repose sur une alliance de tons maritimes profonds (Vert Épicéa / Spruce Green) et de reflets métalliques dorés (Laiton / Gold), rappelant les instruments de navigation traditionnels et la haute technicité moderne.

* **Nom officiel** : `CNANCertifs` (ou *Portail Certificats CNAN NORD*)
* **Typographie principale (Corps)** : `Inter` (sans-serif) pour une lisibilité maximale des tableaux et des données de conformité.
* **Typographie des titres & logo** : `Plus Jakarta Sans` (sans-serif) pour des titres modernes, géométriques et audacieux.

---

## 2. Palette de Couleurs (Color Palette)

### 🌑 Mode Sombre (Dark Mode — Par défaut)

| Rôle | Couleur | Code Hex | Description |
| :--- | :--- | :--- | :--- |
| **Arrière-plan principal** | Spruce Dark | `#070c0b` | Fond d'écran global |
| **Arrière-plan secondaire**| Spruce Medium | `#0e1614` | Barre latérale (Sidebar) et en-tête |
| **Fond des cartes / Box** | Spruce Light | `#16221f` | Conteneurs avec effet de verre (*glass*) |
| **Bordures & Séparateurs**| Border Spruce | `#22322e` | Bordures fines et délicates |
| **Texte Principal** | Bright Mist | `#f2f5f4` | Titres et contenu important |
| **Texte Secondaire** | Soft Sage | `#9aa8a5` | Descriptions et métadonnées |
| **Texte Désactivé** | Dark Olive | `#647571` | Textes secondaires atténués |

### ☀️ Mode Clair (Light Mode)

| Rôle | Couleur | Code Hex | Description |
| :--- | :--- | :--- | :--- |
| **Arrière-plan principal** | Light Mist | `#f4f6f5` | Fond d'écran global |
| **Arrière-plan secondaire**| Pure White | `#ffffff` | Barre latérale et en-tête |
| **Fond des cartes / Box** | Pure White | `#ffffff` | Conteneurs principaux |
| **Bordures & Séparateurs**| Light Sage | `#d1dcd8` | Bordures |
| **Texte Principal** | Deep Forest | `#101c19` | Textes et titres |
| **Texte Secondaire** | Slate Green | `#4a5c58` | Contenu secondaire |
| **Texte Désactivé** | Muted Sage | `#798d89` | Contenu atténué |

---

## 3. Couleurs thématiques & Statuts (Theme & Status)

Les couleurs thématiques utilisent des dégradés subtils (*Gradients*) pour donner un aspect vivant et premium à l'interface.

### Palette Dorée Officielle (Branding)
* **Couleur Primaire (Gold)** : `#cca43b` (Laiton / Or Maritime)
* **Dégradé Primaire** : `linear-gradient(180deg, #dfba5c 0%, #cca43b 100%)` (Boutons et points d'ancrage principaux)

### Statuts de Conformité des Certificats

```
🔴 ROUGE (Urgences - Expiré ou < 1 mois)
   - Hex : #d64f3e
   - Dégradé : linear-gradient(180deg, #d64f3e 0%, #ad3425 100%)
   - Arrière-plan badge : rgba(214, 79, 62, 0.15)
   - Texte badge sombre : #fca5a5 | clair : #b91c1c

🟡 JAUNE (Attention - Échéance entre 1 et 3 mois)
   - Hex : #e59b3c
   - Dégradé : linear-gradient(180deg, #e59b3c 0%, #c47c25 100%)
   - Arrière-plan badge : rgba(229, 155, 60, 0.15)
   - Texte badge sombre : #fde047 | clair : #b45309

🟢 VERT (Conforme - Échéance entre 3 et 6 mois)
   - Hex : #48a37e
   - Dégradé : linear-gradient(180deg, #48a37e 0%, #2f7559 100%)
   - Arrière-plan badge : rgba(72, 163, 126, 0.15)
   - Texte badge sombre : #a7f3d0 | clair : #047857

🟤 DORÉ (Suivi - Échéance > 6 mois ou N/A)
   - Hex : #cca43b
   - Arrière-plan badge : rgba(204, 164, 59, 0.15)
   - Texte badge sombre : #fef08a | clair : #5c5549
```

---

## 4. Système de Design CSS (Design System Tokens)

Ces jetons de design sont configurés sous forme de variables CSS au niveau du sélecteur `:root` dans le fichier [`globals.css`](file:///c:/Users/redab/Desktop/CertificatsSurvey/frontend/src/app/globals.css).

### Dimensions et Structure
* **Largeur de la Sidebar** : `--sidebar-width: 260px`
* **Hauteur de l'En-tête** : `--header-height: 80px`

### Arrondis (Border Radius)
* **Petit (Boutons simples, Badges)** : `4px` (`--border-radius-sm`)
* **Moyen (Inputs, Cartes secondaires)** : `6px` (`--border-radius-md`)
* **Grand (Modales, Cartes principales)** : `8px` (`--border-radius-lg`)

### Ombres (Shadows)
* **Shadow SM** : `0 1px 2px rgba(0, 0, 0, 0.15)`
* **Shadow MD** : `0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.15)`
* **Shadow LG** : `0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.2)`

### Transitions & Animations
* **Transition Rapide (Hover boutons, liens)** : `0.15s ease` (`--transition-fast`)
* **Transition Normale (Mode sombre/clair, Modales)** : `0.25s cubic-bezier(0.4, 0, 0.2, 1)` (`--transition-normal`)
