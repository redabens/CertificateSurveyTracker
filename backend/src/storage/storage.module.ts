import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * StorageModule — Exporte StorageService pour injection dans CertificatesModule et VesselsModule.
 * Le provider actif (local ou MinIO) est déterminé par STORAGE_PROVIDER env var.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
