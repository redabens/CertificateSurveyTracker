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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CrewVesselGuard } from '../auth/crew-vessel.guard';
import { AlarmService } from '../alarm/alarm.service';
import { AuditService } from '../audit/audit.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CertificatesController — CRUD des certificats + upload PDF.
 *
 * SRP: Ce contrôleur NE fait QUE router les requêtes et appeler les services.
 *
 * Sécurité RBAC:
 *   - @Roles('Admin', 'Crew'): seuls Admin et Crew peuvent créer/modifier des certificats
 *   - @Roles('Admin'): seul l'Admin peut supprimer
 *   - CrewVesselGuard: le Crew ne peut accéder qu'à son navire assigné
 *
 * Règle métier Crew→Servicing: validée dans CertificatesService.assertCrewCanAccess()
 * (séparation: guard = qui peut accéder, service = ce qu'il peut faire)
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificatesController {
  constructor(
    private readonly certsService: CertificatesService,
    private readonly alarmService: AlarmService,
    private readonly auditService: AuditService,
  ) {}

  @Get('vessels/:vesselId/certificates')
  @UseGuards(CrewVesselGuard)
  async getByVessel(@Req() req: any, @Param('vesselId') vesselId: string) {
    const certs = await this.certsService.getByVessel(parseInt(vesselId));
    return certs.map((c) => ({
      ...c,
      alarm_status: this.alarmService.calculate(
        c.due_date,
        c.expiration_date,
        c.window,
      ),
    }));
  }

  @Post('vessels/:vesselId/certificates')
  @Roles('Admin', 'Crew')
  @UseGuards(CrewVesselGuard)
  async create(
    @Req() req: any,
    @Param('vesselId') vesselId: string,
    @Body() body: any,
  ) {
    if (!body.name || !body.category) {
      throw new BadRequestException('Le nom et la catégorie sont requis');
    }

    // Règle métier: Crew ne peut créer que des certificats Servicing
    this.certsService.assertCrewCanAccess(
      req.user.role,
      body.category,
      'créer',
    );

    const alarm = this.alarmService.calculate(
      body.due_date,
      body.expiration_date,
      body.window,
    );
    const certId = await this.certsService.insert({
      vessel_id: parseInt(vesselId),
      name: body.name,
      category: body.category,
      organization: body.organization,
      issuing_date: body.issuing_date,
      expiration_date: body.expiration_date,
      due_date: body.due_date,
      window: body.window,
      alarm_status: alarm,
      remarks: body.remarks,
    });

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'CREATE_CERTIFICATE',
      target_type: 'certificate',
      target_id: certId,
      target_name: body.name,
    });

    return { id: certId, alarm_status: alarm };
  }

  @Put('certificates/:id')
  @Roles('Admin', 'Crew')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const prevCert = await this.certsService.getById(parseInt(id));
    if (!prevCert) {
      throw new NotFoundException('Certificat non trouvé');
    }

    // Règle métier: Crew ne peut modifier que des certificats Servicing
    this.certsService.assertCrewCanAccess(
      req.user.role,
      prevCert.category,
      'modifier',
    );

    const alarm = this.alarmService.calculate(
      body.due_date,
      body.expiration_date,
      body.window,
    );

    // Construction du diff pour audit trail
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of [
      'expiration_date',
      'due_date',
      'organization',
      'remarks',
      'window',
    ] as const) {
      if (body[field] !== undefined && body[field] !== prevCert[field]) {
        changes[field] = { from: prevCert[field], to: body[field] };
      }
    }

    await this.certsService.update(parseInt(id), { ...body, alarm_status: alarm });

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'UPDATE_CERTIFICATE',
      target_type: 'certificate',
      target_id: parseInt(id),
      target_name: prevCert.name,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    return { success: true, alarm_status: alarm };
  }

  @Delete('certificates/:id')
  @Roles('Admin')
  async delete(@Req() req: any, @Param('id') id: string) {
    const cert = await this.certsService.getById(parseInt(id));
    await this.certsService.delete(parseInt(id));

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'DELETE_CERTIFICATE',
      target_type: 'certificate',
      target_id: parseInt(id),
      target_name: cert?.name,
    });

    return { success: true };
  }

  @Post('certificates/:id/upload')
  @Roles('Admin', 'Crew')
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.resolve(process.cwd(), 'uploads', 'pdf');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `cert-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Seuls les fichiers PDF sont acceptés.'),
            false,
          );
        }
      },
    }),
  )
  async uploadPdf(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    const cert = await this.certsService.getById(parseInt(id));
    if (!cert) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new NotFoundException('Certificat non trouvé');
    }

    // Règle métier: Crew ne peut uploader que sur des certificats Servicing
    try {
      this.certsService.assertCrewCanAccess(
        req.user.role,
        cert.category,
        'uploader un PDF',
      );
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw err;
    }

    if (!file) {
      throw new BadRequestException('Aucun fichier PDF téléversé');
    }

    const relativePath = `/uploads/pdf/${file.filename}`;
    await this.certsService.updatePdfUrl(parseInt(id), relativePath);

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'UPLOAD_PDF',
      target_type: 'certificate',
      target_id: parseInt(id),
      target_name: cert.name,
    });

    return { success: true, pdf_url: relativePath };
  }
}
