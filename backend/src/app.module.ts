import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { VesselsModule } from './vessels/vessels.module';
import { CertificatesModule } from './certificates/certificates.module';
import { ActionableModule } from './actionable/actionable.module';
import { EmailModule } from './email/email.module';
import { AlarmModule } from './alarm/alarm.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';

/**
 * AppModule — Point d'entrée de l'application NestJS.
 *
 * Architecture des modules (respect SRP par couche):
 *   DatabaseModule  → @Global(), accès SQLite unique
 *   AlarmModule     → calcul alarmes (partagé par tous)
 *   AuditModule     → traçabilité actions (partagé par tous)
 *   StorageModule   → persistance fichiers local/MinIO
 *   EmailModule     → notifications email (transport + templates + orchestration)
 *   AuthModule      → authentification JWT
 *   VesselsModule   → navires CRUD + import/export Excel
 *   CertificatesModule → certificats CRUD + upload PDF
 *   ActionableModule → recommandations CRUD
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AlarmModule,
    AuditModule,
    StorageModule,
    EmailModule,
    AuthModule,
    VesselsModule,
    CertificatesModule,
    ActionableModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
