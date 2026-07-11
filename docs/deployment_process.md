# Guide et Processus de Déploiement

Ce document détaille étape par étape les instructions et les commandes nécessaires pour déployer le **Portail Certificats CNAN NORD** en production.

---

## ⚙️ Variables d'Environnement Requises (`.env`)

Avant de lancer le déploiement, vous devez créer un fichier `.env` à la racine (ou dans `/backend` et `/frontend`) avec les variables de production réelles :

```env
# ─── BASE DE DONNÉES ──────────────────────────────────────────────────────────
# URL de connexion PostgreSQL (à adapter avec vos identifiants)
DATABASE_URL="postgresql://postgres:my_secure_prod_password@localhost:5432/vessel_tracker"

# ─── SÉCURITÉ JWT ─────────────────────────────────────────────────────────────
# Clé secrète de signature (32 caractères aléatoires minimum recommandés)
JWT_SECRET="g9a23f4b593021a8cd39e4f509e88aa11bb22"

# ─── CONFIGURATION DES ALARMES EMAILS ─────────────────────────────────────────
# Choix du fournisseur d'e-mails : 'brevo' (recommandé) ou 'smtp'
EMAIL_PROVIDER="brevo"
# Clé API Brevo (ou mot de passe SMTP si EMAIL_PROVIDER=smtp)
SMTP_PASS="xkeysib-xxxxxxxxx-xxxx"
SMTP_USER="votre-adresse-brevo@email.com"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
# Expéditeur officiel des e-mails
SMTP_FROM='"Portail CNAN NORD" <alerts@cnan-nord.com>'

# ─── STOCKAGE DES PDF (STORAGE_PROVIDER) ──────────────────────────────────────
# Valeurs possibles : 'local' (stockage disque local) ou 'minio' (S3 compatible)
STORAGE_PROVIDER="local"

# Si STORAGE_PROVIDER=minio :
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="certificates"
```

---

## 🐋 Option A : Déploiement avec Docker Compose (Serveur Unique)

### Étape 1 : Cloner et Configurer le Projet
1. Clonez le code sur votre serveur de production.
2. Copiez le fichier d'exemple et remplissez-le :
   ```bash
   cp .env.example .env
   nano .env
   ```

### Étape 2 : Lancer la compilation et démarrer les conteneurs
Exécutez la commande suivante pour compiler les images Docker de production et démarrer la pile de conteneurs en tâche de fond :
```bash
docker compose up -d --build
```

### Étape 3 : Exécuter les migrations de base de données en production
Une fois le conteneur PostgreSQL démarré, appliquez le schéma et insérez les données initiales :
```bash
# Appliquer les migrations de structure Prisma
docker compose exec backend npx prisma db push

# (Facultatif) Alimenter la base de données avec les comptes initiaux
docker compose exec backend npm run seed
```

### Étape 4 : Maintenance et Logs
*   **Vérifier les conteneurs actifs** : `docker compose ps`
*   **Consulter les logs du backend** : `docker compose logs -f backend`
*   **Arrêter la pile** : `docker compose down`

---

## ☸️ Option B : Déploiement dans Kubernetes

### Étape 1 : Créer le Namespace
```bash
kubectl apply -f k8s/namespace.yaml
```

### Étape 2 : Configurer les Secrets et Variables
1. Modifiez les valeurs dans le fichier `k8s/secrets.yaml` (encodez les valeurs sensibles en Base64).
2. Appliquez les secrets dans le cluster :
   ```bash
   kubectl apply -f k8s/secrets.yaml
   ```

### Étape 3 : Déployer PostgreSQL (Base de données)
```bash
kubectl apply -f k8s/postgres.yaml
```
*Attendez que le pod PostgreSQL soit marqué `Running` et `Ready` :*
```bash
kubectl get pods -n cnan-vessel-tracker -w
```

### Étape 4 : Déployer le Backend NestJS
```bash
kubectl apply -f k8s/backend.yaml
```
Une fois le pod backend actif, lancez l'application du schéma de base de données :
```bash
# Identifier le nom du pod backend
POD_NAME=$(kubectl get pods -n cnan-vessel-tracker -l app=backend -o jsonpath="{.items[0].metadata.name}")

# Exécuter prisma db push dans le conteneur
kubectl exec -n cnan-vessel-tracker -it $POD_NAME -- npx prisma db push
```

### Étape 5 : Déployer le Frontend et l'Ingress (Routage Réseau)
```bash
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

### Commandes Utiles de Supervision Kubernetes :
*   **Voir toutes les ressources** : `kubectl get all -n cnan-vessel-tracker`
*   **Consulter les logs de l'API** : `kubectl logs -f deployment/backend -n cnan-vessel-tracker`
*   **Entrer dans le conteneur backend** : `kubectl exec -n cnan-vessel-tracker -it deployment/backend -- sh`
