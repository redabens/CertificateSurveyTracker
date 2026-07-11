import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ActionableService } from './actionable.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CrewVesselGuard } from '../auth/crew-vessel.guard';
import { AuditService } from '../audit/audit.service';

/**
 * ActionableController — Gestion des recommandations/items d'action par navire.
 *
 * SRP: Ce contrôleur NE fait QUE router les requêtes HTTP vers ActionableService.
 *
 * Sécurité RBAC (remplace tous les checks manuels précédents):
 *   - GET: Tout utilisateur authentifié; CrewVesselGuard pour l'isolation navire
 *   - POST: Admin uniquement (@Roles('Admin'))
 *   - PUT status: Admin et Crew (@Roles('Admin', 'Crew')); Partner/Auditor exclus
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActionableController {
  constructor(
    private readonly actionableService: ActionableService,
    private readonly auditService: AuditService,
  ) {}

  @Get('vessels/:vesselId/actionable-items')
  @UseGuards(CrewVesselGuard)
  async getByVessel(@Param('vesselId') vesselId: string) {
    return await this.actionableService.getByVessel(parseInt(vesselId));
  }

  @Post('vessels/:vesselId/actionable-items')
  @Roles('Admin', 'Manager', 'Auditor')
  async create(
    @Req() req: any,
    @Param('vesselId') vesselId: string,
    @Body() body: any,
  ) {
    if (!body.description) {
      throw new BadRequestException('La description est requise');
    }

    const id = await this.actionableService.insert({
      vessel_id: parseInt(vesselId),
      imposed_date: body.imposed_date,
      category: body.category,
      report_number: body.report_number,
      due_date: body.due_date,
      description: body.description,
    });

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'CREATE_ACTIONABLE',
      target_type: 'actionable_item',
      target_id: id,
      target_name: body.description?.substring(0, 80),
    });

    return { id };
  }

  @Put('actionable-items/:id/status')
  @Roles('Admin', 'Manager', 'Crew')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!body.status) {
      throw new BadRequestException('Le statut est requis');
    }

    await this.actionableService.updateStatus(parseInt(id), body.status);

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'UPDATE_ACTIONABLE_STATUS',
      target_type: 'actionable_item',
      target_id: parseInt(id),
      changes: { status: { from: 'previous', to: body.status } },
    });

    return { success: true };
  }

  @Put('actionable-items/:id')
  @Roles('Admin', 'Manager')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (!body.description) {
      throw new BadRequestException('La description est requise');
    }

    await this.actionableService.update(parseInt(id), {
      imposed_date: body.imposed_date,
      category: body.category,
      report_number: body.report_number,
      due_date: body.due_date,
      description: body.description,
    });

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'UPDATE_ACTIONABLE',
      target_type: 'actionable_item',
      target_id: parseInt(id),
      target_name: body.description?.substring(0, 80),
    });

    return { success: true };
  }

  @Delete('actionable-items/:id')
  @Roles('Admin', 'Manager')
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.actionableService.delete(parseInt(id));

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'DELETE_ACTIONABLE',
      target_type: 'actionable_item',
      target_id: parseInt(id),
    });

    return { success: true };
  }
}
