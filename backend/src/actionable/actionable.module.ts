import { Module } from '@nestjs/common';
import { ActionableService } from './actionable.service';
import { ActionableController } from './actionable.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

/**
 * ActionableModule — Module de gestion des recommandations/items d'action.
 * Dépendances: AuthModule (JWT), AuditModule (traçabilité A2).
 */
@Module({
  imports: [AuthModule, AuditModule],
  providers: [ActionableService],
  controllers: [ActionableController],
  exports: [ActionableService],
})
export class ActionableModule {}
