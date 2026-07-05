import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuthModule } from '../auth/auth.module';

/**
 * AuditModule — Exporte AuditService pour injection dans les modules qui en ont besoin.
 * DatabaseModule est @Global() donc pas besoin de l'importer ici.
 * Importer AuditModule dans: VesselsModule, CertificatesModule, ActionableModule, AppModule.
 */
@Module({
  imports: [AuthModule],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
