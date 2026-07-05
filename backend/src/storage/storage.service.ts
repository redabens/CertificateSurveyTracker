import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * StorageService — Gère la persistance des fichiers (PDFs, exports temporaires).
 *
 * SRP: Ce service NE fait QUE sauvegarder, supprimer et construire les URLs de fichiers.
 *      Aucune logique métier certificats, aucun email.
 *
 * ─── Qu'est-ce que MinIO ? ────────────────────────────────────────────────
 * MinIO est un serveur de stockage d'objets open-source compatible S3 (Amazon).
 * Il stocke les fichiers dans des "buckets" (équivalent de dossiers cloud).
 *
 * Pourquoi MinIO dans ce projet ?
 *   AVANT: PDFs sauvegardés dans /uploads/pdf/ sur le serveur local
 *          → perdus à chaque redéploiement Docker
 *   APRÈS: PDFs uploadés dans MinIO bucket "certificates"
 *          → persistent dans un volume Docker monté
 *          → accessibles via URL http://minio:9000/certificates/cert-xxx.pdf
 *          → interface web d'administration sur http://localhost:9001
 *          → migration facile vers AWS S3 (même API)
 *
 * ─── Configuration via variables d'environnement ──────────────────────────
 *
 * MODE LOCAL (défaut, aucune config requise):
 *   STORAGE_PROVIDER=local   (ou non défini)
 *   Fichiers dans: ./uploads/pdf/
 *
 * MODE MINIO:
 *   STORAGE_PROVIDER=minio
 *   MINIO_ENDPOINT=localhost        ← adresse du serveur MinIO
 *   MINIO_PORT=9000                 ← port API S3
 *   MINIO_ACCESS_KEY=minioadmin     ← utilisateur admin
 *   MINIO_SECRET_KEY=minioadmin     ← mot de passe admin
 *   MINIO_BUCKET=certificates       ← nom du bucket (créé automatiquement)
 *   MINIO_USE_SSL=false             ← true en production avec HTTPS
 *
 *   Pour installer le SDK MinIO: npm install minio
 * ─────────────────────────────────────────────────────────────────────────
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: 'local' | 'minio';
  private readonly localPdfDir: string;

  // MinIO config
  private readonly minioEndpoint: string;
  private readonly minioPort: number;
  private readonly minioAccessKey: string;
  private readonly minioSecretKey: string;
  private readonly minioBucket: string;
  private readonly minioUseSSL: boolean;

  constructor() {
    this.provider =
      (process.env.STORAGE_PROVIDER as 'local' | 'minio') || 'local';
    this.localPdfDir = path.resolve(process.cwd(), 'uploads', 'pdf');

    this.minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
    this.minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
    this.minioAccessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    this.minioSecretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
    this.minioBucket = process.env.MINIO_BUCKET || 'certificates';
    this.minioUseSSL = process.env.MINIO_USE_SSL === 'true';

    if (this.provider === 'local') {
      fs.mkdirSync(this.localPdfDir, { recursive: true });
      this.logger.log('Stockage: LOCAL filesystem');
    } else {
      this.logger.log(
        `Stockage: MinIO (${this.minioEndpoint}:${this.minioPort}, bucket: ${this.minioBucket})`,
      );
    }
  }

  /**
   * Sauvegarde un fichier depuis son chemin temporaire vers le stockage configuré.
   * @param tempPath Chemin du fichier temporaire (créé par Multer)
   * @param filename Nom de fichier final
   * @returns Clé/chemin de stockage à conserver en base de données
   */
  async save(tempPath: string, filename: string): Promise<string> {
    if (this.provider === 'local') {
      return this.saveLocal(tempPath, filename);
    }
    return this.saveMinIO(tempPath, filename);
  }

  /**
   * Supprime un fichier par sa clé de stockage.
   */
  async delete(storedKey: string): Promise<void> {
    if (this.provider === 'local') {
      this.deleteLocal(storedKey);
    } else {
      await this.deleteMinIO(storedKey);
    }
  }

  /**
   * Retourne l'URL publique d'accès au fichier stocké.
   */
  getUrl(storedKey: string): string {
    if (this.provider === 'local') {
      return storedKey; // ex: /uploads/pdf/cert-xxx.pdf
    }
    const protocol = this.minioUseSSL ? 'https' : 'http';
    return `${protocol}://${this.minioEndpoint}:${this.minioPort}/${this.minioBucket}/${storedKey}`;
  }

  // ─── Implémentation LOCAL ──────────────────────────────────────────────

  private saveLocal(tempPath: string, filename: string): string {
    const dest = path.join(this.localPdfDir, filename);
    fs.renameSync(tempPath, dest);
    return `/uploads/pdf/${filename}`;
  }

  private deleteLocal(storedKey: string): void {
    const filePath = path.resolve(process.cwd(), storedKey.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // ─── Implémentation MinIO ──────────────────────────────────────────────

  private async saveMinIO(tempPath: string, filename: string): Promise<string> {
    const client = await this.getMinIOClient();
    await this.ensureBucket(client);
    await client.fPutObject(this.minioBucket, filename, tempPath, {
      'Content-Type': 'application/pdf',
    });
    // Supprimer le fichier temporaire après upload
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return filename; // Stocker uniquement la clé (nom de fichier) en DB
  }

  private async deleteMinIO(objectKey: string): Promise<void> {
    const client = await this.getMinIOClient();
    await client.removeObject(this.minioBucket, objectKey);
  }

  private async getMinIOClient() {
    // Import dynamique pour rendre le SDK MinIO optionnel
    // Installation: npm install minio
    const { Client } = await import('minio').catch(() => {
      throw new Error(
        'SDK MinIO non installé. Exécuter: npm install minio dans le répertoire backend.',
      );
    });
    return new Client({
      endPoint: this.minioEndpoint,
      port: this.minioPort,
      useSSL: this.minioUseSSL,
      accessKey: this.minioAccessKey,
      secretKey: this.minioSecretKey,
    });
  }

  private async ensureBucket(client: any): Promise<void> {
    const exists = await client.bucketExists(this.minioBucket);
    if (!exists) {
      await client.makeBucket(this.minioBucket, 'us-east-1');
      this.logger.log(`Bucket MinIO créé: ${this.minioBucket}`);
    }
  }
}
