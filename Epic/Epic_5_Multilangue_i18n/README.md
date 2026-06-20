# Epic 5 : Multi-langue & Internationalisation (i18n)

## 📌 À quoi ça sert ?
L'industrie maritime est intrinsèquement internationale. Les équipages à bord des navires (Capitaines, Seconds, Chefs Mécaniciens) sont fréquemment multinationaux et s'expriment principalement en **anglais**. De même, les auditeurs externes (Affaires Maritimes, PSC, inspecteurs de sociétés de classification comme Lloyd's Register ou Bureau Veritas) mènent généralement leurs revues en anglais.
En fournissant une plateforme bilingue (**Français / Anglais**), vous facilitez la prise en main du logiciel par les équipages à bord et assurez une expérience d'audit fluide, quel que soit l'inspecteur présent. L'utilisateur peut ainsi basculer instantanément toute l'interface dans sa langue de confort.

---

## 🛠️ Comment le réaliser ?

### Étape 1 : Structurer les dictionnaires de traduction (Locales)
Créer un dossier `public/locales/` contenant deux fichiers JSON contenant l'ensemble des textes statiques de l'application :

*   **`fr.json`** :
    ```json
    {
      "dashboard": "Tableau de bord",
      "fleet": "Ma Flotte",
      "tv_mode": "Écran Bureau TV",
      "logs": "Rappels & Logs",
      "import_btn": "Importer Navire",
      "active_vessels": "Navires Actifs",
      "urgent": "Urgents",
      "attention": "Attention",
      "monitored": "Suivi"
    }
    ```
*   **`en.json`** :
    ```json
    {
      "dashboard": "Dashboard",
      "fleet": "My Fleet",
      "tv_mode": "Office TV Screen",
      "logs": "Reminders & Logs",
      "import_btn": "Import Vessel",
      "active_vessels": "Active Vessels",
      "urgent": "Urgent",
      "attention": "Attention",
      "monitored": "Monitored"
    }
    ```

### Étape 2 : Implémenter le moteur de traduction côté Client (Frontend)
Pour éviter d'alourdir l'application avec des frameworks complexes, vous pouvez implémenter un traducteur vanilla en JavaScript :
1. Charger le dictionnaire sélectionné (depuis le localStorage, ou détecter la langue du navigateur) :
   ```javascript
   let currentLang = localStorage.getItem('babor_lang') || 'fr';
   let translations = {};

   async function loadTranslations(lang) {
     const res = await fetch(`/locales/${lang}.json`);
     translations = await res.json();
     currentLang = lang;
     localStorage.setItem('babor_lang', lang);
     applyTranslations();
   }
   ```
2. Coder une fonction `applyTranslations()` qui parcourt tous les éléments de l'interface possédant un attribut spécial `data-i18n` et remplace leur contenu textuel par la clé de traduction correspondante :
   ```javascript
   function applyTranslations() {
     document.querySelectorAll('[data-i18n]').forEach(el => {
       const key = el.getAttribute('data-i18n');
       if (translations[key]) {
         el.textContent = translations[key];
       }
     });
   }
   ```
3. Dans le fichier `index.html`, baliser les textes avec l'attribut `data-i18n` :
   ```html
   <a href="#dashboard" class="nav-item active" id="nav-dashboard">
     <span class="icon">📊</span> <span data-i18n="dashboard">Tableau de bord</span>
   </a>
   ```

### Étape 3 : Ajouter le sélecteur de langue dans l'en-tête (Header)
Ajouter un bouton ou un menu déroulant dans l'en-tête de l'application permettant de basculer la langue :
```html
<div class="lang-selector">
  <button onclick="loadTranslations('fr')" class="lang-btn">FR</button>
  |
  <button onclick="loadTranslations('en')" class="lang-btn">EN</button>
</div>
```
Assurer le style CSS pour mettre en évidence la langue sélectionnée (ex: classe active soulignée).

### Étape 4 : Adapter la génération des rapports Excel (Export)
Lors du téléchargement du rapport Excel pour un audit, détecter la langue courante de l'utilisateur et l'envoyer comme paramètre au backend (`GET /api/vessels/:id/export?lang=en`). 
Modifier le script Python `helpers/excel_handler.py` pour traduire dynamiquement les en-têtes et les valeurs de colonnes d'alertes (ex: afficher `OVERDUE` au lieu de `HORS DÉLAIS` ou `RED` au lieu de `ROUGE`) dans le fichier `.xlsx` généré pour un auditeur international.
