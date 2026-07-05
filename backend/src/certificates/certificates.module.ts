import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { AuthModule } from '../auth/auth.module';
import { AlarmModule } from '../alarm/alarm.module';
import { AuditModule } from '../audit/audit.module';

/**
 * CertificatesModule — Module de gestion des certificats.
 * Dépendances: AuthModule (JWT), AlarmModule (P1), AuditModule (A2).
 */
@Module({
  imports: [AuthModule, AlarmModule, AuditModule],
  providers: [CertificatesService],
  controllers: [CertificatesController],
  exports: [CertificatesService],
})
export class CertificatesModule {}
