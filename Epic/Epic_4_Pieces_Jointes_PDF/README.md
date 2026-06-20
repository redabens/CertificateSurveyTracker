# Epic 4 : Gestion des Pièces Jointes & Téléversement PDF des Certificats

## 📌 À quoi ça sert ?
L'un des rôles de l'application est de faciliter les audits réglementaires. Lorsqu'un inspecteur maritime monte à bord d'un navire ou visite le bureau, il ne se contente pas de regarder un tableau de dates de conformité : il exige de voir l'original physique ou une copie officielle de chaque certificat valide.
En permettant aux équipes techniques et aux capitaines de téléverser et de stocker une copie numérisée (format **PDF**) directement sous la ligne correspondante dans le tableau de bord, Babor Tracker devient un coffre-fort numérique de conformité. L'auditeur peut vérifier et télécharger les documents originaux directement depuis la plateforme, ce qui réduit le temps d'audit et élimine les recherches fastidieuses de documents papier.

---

## 🛠️ Comment le réaliser ?

### Étape 1 : Mettre à jour la base de données SQL
Ajouter une colonne `pdf_url` dans la table `certificates` pour stocker le chemin d'accès au fichier PDF téléversé :
```sql
ALTER TABLE certificates ADD COLUMN pdf_url TEXT;
```

### Étape 2 : Configurer le stockage des fichiers (Stockage Cloud Object)
Pour une application locale, stocker les fichiers dans un dossier public sur le serveur (`/public/uploads/pdf`) suffit. Cependant, en production cloud (Heroku, conteneurs Docker), le système de fichiers est éphémère (effacé à chaque redémarrage). Il faut donc déporter le stockage vers un service externe persistant tel que :
*   **Amazon S3** (Simple Storage Service)
*   **DigitalOcean Spaces**
*   **OVHcloud Object Storage**

Installer le SDK AWS S3 pour Node.js :
```bash
npm install @aws-sdk/client-s3
```

### Étape 3 : Implémenter l'API de téléversement (Upload API)
1. Côté backend Node.js, configurer `multer` pour valider que le fichier téléversé est exclusivement un PDF et que sa taille ne dépasse pas 10 Mo :
   ```javascript
   const multer = require('multer');
   const upload = multer({
     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
     fileFilter: (req, file, cb) => {
       if (file.mimetype === 'application/pdf') {
         cb(null, true);
       } else {
         cb(new Error('Seuls les fichiers PDF sont acceptés.'));
       }
     }
   });
   ```
2. Créer une route `POST /api/certificates/:id/upload` qui reçoit le fichier, l'envoie vers le bucket Cloud S3 et met à jour la colonne `pdf_url` du certificat concerné dans la base de données :
   ```javascript
   app.post('/api/certificates/:id/upload', upload.single('pdf'), async (req, res) => {
     const certId = req.params.id;
     const file = req.file;
     
     // 1. Envoyer le fichier vers AWS S3 / Object Storage
     const s3Key = `certificates/${Date.now()}_${file.originalname}`;
     await s3Client.send(new PutObjectCommand({
       Bucket: process.env.S3_BUCKET_NAME,
       Key: s3Key,
       Body: file.buffer,
       ContentType: 'application/pdf'
     }));
     
     const pdfUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
     
     // 2. Sauvegarder l'URL en base de données
     db.prepare('UPDATE certificates SET pdf_url = ? WHERE id = ?').run(pdfUrl, certId);
     
     res.json({ success: true, pdf_url: pdfUrl });
   });
   ```

### Étape 4 : Intégration dans l'interface utilisateur (Frontend)
1. **Bouton d'importation** : Dans le tableau des certificats, ajouter une icône de trombonne 📎 ou un bouton de téléchargement si un fichier `pdf_url` est renseigné. Si aucun PDF n'est associé, afficher un bouton discret "+" de téléversement (masqué pour les rôles en lecture seule).
2. **Visualiseur intégré** : Lorsque l'utilisateur clique sur l'icône du PDF, ouvrir une fenêtre modale contenant un lecteur PDF interactif pour afficher le certificat à l'écran sans quitter la plateforme :
   ```html
   <iframe src="pdf_url_du_certificat" width="100%" height="600px"></iframe>
   ```
3. **Bouton de téléchargement direct** pour l'auditeur.
