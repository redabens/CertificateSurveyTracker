# Architecture de Déploiement

Ce document détaille l'infrastructure réseau, le modèle de conteneurisation et l'architecture réseau globale utilisée pour exécuter le **Portail Certificats CNAN NORD** en production.

---

## 🐋 1. Déploiement via Docker Compose (Linux Server)

C'est la solution par défaut recommandée pour un serveur unique dédié. Elle orchestre **4 conteneurs** isolés au sein d'un réseau privé Docker :

```
                        ┌─────────────────────────────────────────┐
                        │              Linux Server               │
                        │                                         │
                        │   ┌───────────────┐   ┌─────────────┐   │
  HTTP/S (Port 80/443) ─┼──►│ Reverse Proxy │   │   MinIO S3  │   │
                        │   │ (Nginx/Traefk)│   │ (Port 9001) │   │
                        │   └───────┬───────┘   └──────┬──────┘   │
                        │           │                  │          │
                        │   ┌───────▼───────┐   ┌──────▼──────┐   │
                        │   │   Frontend    │   │  Object Storage │
                        │   │  (Port 4000)  │   │   (MinIO S3)    │
                        │   └───────┬───────┘   └──────▲──────┘   │
                        │           │                  │          │
                        │   ┌───────▼───────┐          │          │
                        │   │    Backend    ├──────────┘          │
                        │   │  (Port 3000)  │                     │
                        │   └───────┬───────┘                     │
                        │           │                             │
                        │   ┌───────▼───────┐                     │
                        │   │   Database    │                     │
                        │   │ (PostgreSQL)  │                     │
                        │   └───────────────┘                     │
                        └─────────────────────────────────────────┘
```

### Détails des conteneurs :
1.  **`cnan-db` (PostgreSQL 15-alpine)** : Moteur de base de données relationnelle. Utilise un volume persistant nommé `cnan_db_data` pour stocker les données SQL de manière durable.
2.  **`cnan-minio` (MinIO Server)** : Stockage d'objets compatible S3. Utilise un volume persistant nommé `cnan_minio` pour stocker les fichiers PDF des certificats chargés.
3.  **`cnan-backend` (NestJS API)** : Conteneurisé à partir d'un build Node.js Alpine multi-étape (multi-stage) optimisé. Il communique en interne avec `cnan-db` et `cnan-minio`.
4.  **`cnan-frontend` (Next.js)** : Serveur Node servant l'application SPA compilée. Redirige ses requêtes API vers l'URL externe de l'API REST.

---

## ☸️ 2. Déploiement via Kubernetes (Multi-node & Haute Disponibilité)

Pour les infrastructures nécessitant de la haute disponibilité et de l'auto-scaling, un ensemble de fichiers de configuration Kubernetes (`manifests`) est disponible dans le dossier `/k8s` :

### Liste des ressources Kubernetes :
*   **`namespace.yaml`** : Crée un espace isolé nommé `cnan-vessel-tracker` pour contenir toutes les ressources.
*   **`secrets.yaml`** : Contient de manière chiffrée (Base64) les variables sensibles (mots de passe BDD, clé secrète JWT, identifiants SMTP).
*   **`postgres.yaml`** :
    *   Un `PersistentVolumeClaim` (PVC) pour stocker les données PostgreSQL.
    *   Un `Deployment` exécutant l'image Postgres.
    *   Un `Service` interne pour exposer la base de données sur le port 5432.
*   **`backend.yaml`** :
    *   Un `Deployment` exécutant l'image NestJS backend avec réplications (scaling possible).
    *   Montage d'un PVC pour les téléversements de fichiers (si stockage local sélectionné).
    *   Un `Service` exposant l'API REST sur le port 3000.
*   **`frontend.yaml`** :
    *   Un `Deployment` exécutant l'image Next.js.
    *   Un `Service` exposant le client sur le port 80.
*   **`ingress.yaml`** :
    *   Règle de routage Ingress (s'appuyant sur un Ingress Controller comme Nginx ou Traefik).
    *   Routage du trafic :
        *   `/api/*` et `/uploads/*` sont acheminés vers le service backend.
        *   Toutes les autres requêtes `/` sont acheminées vers le service frontend.
        *   Support du chiffrement SSL/TLS automatique (ex: Let's Encrypt).
