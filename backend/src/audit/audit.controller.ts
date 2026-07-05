import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

/**
 * AuditController — Expose les logs d'audit aux administrateurs.
 *
 * SRP: Ce contrôleur NE fait QUE servir les données de la table audit_logs.
 *
 * Routes:
 *   GET /api/audit-logs?limit=200  → Dernières N entrées (Admin uniquement)
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getAll(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 200;
    return this.auditService.getAll(isNaN(parsedLimit) ? 200 : parsedLimit);
  }
}
