import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ActionableService } from './actionable.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ActionableController {
  constructor(private readonly actionableService: ActionableService) {}

  @Get('vessels/:vesselId/actionable-items')
  async getByVessel(@Req() req: any, @Param('vesselId') vesselId: string) {
    if (req.user.role === 'Crew' && req.user.vessel_id != vesselId) {
      throw new ForbiddenException('Accès refusé pour ce navire');
    }
    return this.actionableService.getByVessel(parseInt(vesselId));
  }

  @Post('vessels/:vesselId/actionable-items')
  async create(
    @Req() req: any,
    @Param('vesselId') vesselId: string,
    @Body() body: any,
  ) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Action interdite pour votre profil');
    }
    if (!body.description) {
      throw new BadRequestException('La description est requise');
    }
    const id = this.actionableService.insert({
      vessel_id: parseInt(vesselId),
      imposed_date: body.imposed_date,
      category: body.category,
      report_number: body.report_number,
      due_date: body.due_date,
      description: body.description,
    });
    return { id };
  }

  @Put('actionable-items/:id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
      throw new ForbiddenException('Action interdite pour votre profil');
    }
    if (!body.status) {
      throw new BadRequestException('Le statut est requis');
    }
    this.actionableService.updateStatus(parseInt(id), body.status);
    return { success: true };
  }
}
