import { Module } from '@nestjs/common';
import { AlarmService } from './alarm.service';

/**
 * AlarmModule — Exporte AlarmService pour injection dans tout module qui en a besoin.
 * Importer ce module dans: VesselsModule, CertificatesModule, EmailModule.
 */
@Module({
  providers: [AlarmService],
  exports: [AlarmService],
})
export class AlarmModule {}
