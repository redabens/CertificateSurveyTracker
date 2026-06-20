# Epic 1 : Sécurisation & Authentification des Utilisateurs (Auth)

## 📌 À quoi ça sert ?
Actuellement, l'application utilise un sélecteur de rôle simplifié dans l'en-tête de démonstration. En production, pour que chaque navire et chaque partenaire externe (armateurs tiers, inspecteurs) puissent accéder de manière sécurisée et restreinte à leurs propres données, il est indispensable de mettre en place un système d'authentification robuste.
Ce module garantit que :
1. **Confidentialité B2B** : Une compagnie partenaire ne peut voir que ses propres navires.
2. **Intégrité de bord** : L'équipage ne peut modifier que les certificats d'entretien liés à son navire (pas les certificats de classe ni les autres navires).
3. **Sécurité globale** : Seuls les utilisateurs authentifiés peuvent lire/écrire des données, empêchant toute intrusion externe.

---

## 🛠️ Comment le réaliser ?

### Étape 1 : Chiffrement des mots de passe dans la base de données
1. Installer la bibliothèque `bcryptjs` pour le hachage sécurisé :
   ```bash
   npm install bcryptjs
   ```
2. Lors de la création d'un utilisateur, hacher son mot de passe avant insertion en base de données :
   ```javascript
   const bcrypt = require('bcryptjs');
   const hash = bcrypt.hashSync(password, 10);
   // Enregistrer 'hash' dans la colonne password de la table users
   ```

### Étape 2 : Émission de jetons de session (JWT - JSON Web Tokens)
1. Installer `jsonwebtoken` :
   ```bash
   npm install jsonwebtoken
   ```
2. Créer une route `POST /api/login` qui valide l'e-mail et le mot de passe, puis retourne un jeton signé contenant l'ID, le rôle et l'ID de l'entreprise (`company_id`) de l'utilisateur :
   ```javascript
   const jwt = require('jsonwebtoken');
   const token = jwt.sign(
     { id: user.id, role: user.role, companyId: user.company_id },
     process.env.JWT_SECRET || 'babor_secret_key',
     { expiresIn: '8h' }
   );
   res.json({ token, user: { name: user.full_name, role: user.role } });
   ```

### Étape 3 : Middleware de protection des routes API
Créer un middleware Express `authenticateToken` pour intercepter toutes les requêtes API (sauf `/api/login`) et vérifier la validité du token dans l'en-tête `Authorization: Bearer <token>` :
```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Accès refusé' });

  jwt.verify(token, process.env.JWT_SECRET || 'babor_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expirée' });
    req.user = user; // Contient id, role, companyId
    next();
  });
}
```

### Étape 4 : Filtrage des données par rôle et entreprise (Multi-tenant B2B)
Modifier les requêtes SQL du backend pour appliquer des restrictions automatiques :
*   **Admin/Ship Manager** : Pas de restrictions (voit toutes les compagnies).
    `SELECT * FROM vessels;`
*   **Crew (Capitaine)** : Filtrer par le navire auquel il est rattaché (lier l'utilisateur à un `vessel_id` dans la table `users`).
    `SELECT * FROM vessels WHERE id = ?;`
*   **Partner B2B (Compagnie Externe)** : Filtrer par son identifiant d'entreprise.
    `SELECT * FROM vessels WHERE company_id = ?;`

### Étape 5 : Gestion des Tokens côté Frontend
1. Stocker le jeton JWT dans le `localStorage` ou dans un Cookie HTTP-Only après connexion.
2. Ajouter le jeton dans les en-têtes de chaque requête fetch :
   ```javascript
   headers: {
     'Authorization': `Bearer ${localStorage.getItem('babor_token')}`,
     'Content-Type': 'application/json'
   }
   ```
3. Si le serveur répond par un statut `401` ou `403`, rediriger l'utilisateur vers la page de connexion.
