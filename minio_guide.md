# Guide d'Intégration MinIO — Stockage Persistant des PDFs
## Portail Certificats CNAN NORD

Ce guide détaille le rôle de **MinIO** au sein de notre architecture, son utilité pour la résilience en production, ainsi que les étapes pour son installation et sa configuration.

---

## 1. Qu'est-ce que MinIO et à quoi sert-il ?

Dans la version initiale du projet, tous les fichiers PDF téléversés pour les certificats étaient enregistrés directement dans le répertoire local `backend/uploads/pdf/`. 

### Les limites du stockage local :
1. **Perte de données** : Dans un environnement conteneurisé (Docker), chaque redéploiement ou arrêt du conteneur recrée le système de fichiers à neuf. Sans configuration de volume complexe et dépendante du système hôte, tous les fichiers PDFs de certificats stockés localement sont définitivement **perdus**.
2. **Difficulté de mise à l'échelle** : Si nous déploierons plusieurs instances du backend derrière un load balancer pour gérer la charge, les fichiers stockés localement sur le disque d'un serveur ne seront pas accessibles par les autres serveurs.

### Le rôle de MinIO :
**MinIO** est un serveur de stockage d'objets haute performance, open-source et **100% compatible avec l'API Amazon S3**. 

* **Persistance robuste** : MinIO gère lui-même le stockage brut dans un volume Docker dédié. Le backend n'a plus besoin de manipuler directement des fichiers physiques sur son disque local.
* **Sécurité** : Les PDFs sont accédés via des URLs sécurisées générées ou contrôlées.
* **Scalabilité cloud native** : Si demain nous souhaitons migrer le projet vers un service Cloud public (comme Amazon S3, Scaleway Object Storage ou OVHcloud Object Storage), **aucun changement de code ne sera nécessaire**. Il suffira de modifier les variables d'environnement dans le fichier `.env`.

---

## 2. Architecture du flux de Stockage

```
[Utilisateur (Navigateur)] --(Upload PDF)--> [Backend NestJS]
                                                  |
                                            (StorageService)
                                                  |
                                                  +---> Mode LOCAL (Développement) -> Stocke dans ./uploads/pdf/
                                                  |
                                                  +---> Mode MINIO (Production)   -> Upload via API S3 dans le bucket "certificates" de MinIO
```

---

## 3. Configuration & Déploiement

Dans notre `docker-compose.yml`, nous avons configuré MinIO comme un service autonome.

### Variables d'environnement requises (`.env` du backend) :

```ini
# Définir le provider actif: local ou minio
STORAGE_PROVIDER=minio

# Configuration du service MinIO
MINIO_ENDPOINT=minio          # Nom du service dans le réseau Docker
MINIO_PORT=9000               # Port de l'API S3
MINIO_ROOT_USER=minioadmin    # Utilisateur administrateur (Access Key)
MINIO_ROOT_PASSWORD=minioadmin # Mot de passe administrateur (Secret Key)
MINIO_BUCKET=certificates     # Nom du bucket pour stocker les fichiers
MINIO_USE_SSL=false           # Passer à true si HTTPS configuré
```

### Console d'administration Web :
En plus de l'API sur le port `9000`, MinIO expose une interface web d'administration (Console) sur le port `9001`.
* **URL** : `http://localhost:9001` (ou l'adresse IP de votre serveur)
* **Credentials** : `minioadmin` / `minioadmin` (à modifier absolument dans le fichier `.env` en production).
* Depuis cette interface, vous pouvez visualiser les buckets, télécharger les PDFs manuellement, gérer les politiques d'accès ou auditer le stockage.
