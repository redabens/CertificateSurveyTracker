import { Module } from '@nestjs/common';
import { VesselsService } from './vessels.service';
import { VesselsController } from './vessels.controller';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { AlarmModule } from '../alarm/alarm.module';
import { AuditModule } from '../audit/audit.module';

/**
 * VesselsModule — Module de gestion des navires.
 * Dépendances: AuthModule (JWT), EmailModule (alertes OTP), AlarmModule (P1), AuditModule (A2).
 */
@Module({
  imports: [AuthModule, EmailModule, AlarmModule, AuditModule],
  providers: [VesselsService],
  controllers: [VesselsController],
  exports: [VesselsService],
})
export class VesselsModule {}
