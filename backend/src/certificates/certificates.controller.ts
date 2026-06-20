import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

// Helper to determine alarm
function calculateAlarmStatus(dueDateStr: string, expirationDateStr: string) {
  const target = dueDateStr || expirationDateStr;
  if (!target) return 'N/A';
  const diff = Math.ceil((new Date(target).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'OVERDUE / IMMEDIATE';
  if (diff <= 30) return 'RED - <1 MONTH';
  if (diff <= 90) return 'YELLOW - 1 TO 3 MONTHS';
  if (diff <= 180) return 'GREEN - 3 TO 6 MONTHS';
  return 'MONITOR >6 MONTHS';
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(
    private readonly certsService: CertificatesService,
  ) {}

  @Get('vessels/:vesselId/certificates')
  async getByVessel(@Req() req: any, @Param('vesselId') vesselId: string) {
    if (req.user.role === 'Crew' && req.user.vessel_id != vesselId) {
      throw new ForbiddenException('Accès refusé pour ce navire');
    }
    
    const certs = this.certsService.getByVessel(parseInt(vesselId));
    return certs.map(c => ({
      ...c,
      alarm_status: calculateAlarmStatus(c.due_date, c.expiration_date)
    }));
  }

  @Post('vessels/:vesselId/certificates')
  async create(@Req() req: any, @Param('vesselId') vesselId: string, @Body() body: any) {
    if (req.user.role === 'Crew' && body.category !== 'Servicing') {
      throw new ForbiddenException('Seuls les certificats d\'entretien (Servicing) peuvent être gérés par l\'équipage');
    }
    if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
      throw new ForbiddenException('Action en lecture seule');
    }

    if (!body.name || !body.category) {
      throw new BadRequestException('Le nom et la catégorie sont requis');
    }

    const alarm = calculateAlarmStatus(body.due_date, body.expiration_date);
    const certId = this.certsService.insert({
      vessel_id: parseInt(vesselId),
      name: body.name,
      category: body.category,
      organization: body.organization,
      issuing_date: body.issuing_date,
      expiration_date: body.expiration_date,
      due_date: body.due_date,
      window: body.window,
      alarm_status: alarm,
      remarks: body.remarks
    });

    return { id: certId, alarm_status: alarm };
  }

  @Put('certificates/:id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
      throw new ForbiddenException('Action en lecture seule');
    }

    const prevCert = this.certsService.getById(parseInt(id));
    if (!prevCert) {
      throw new NotFoundException('Certificat non trouvé');
    }

    if (req.user.role === 'Crew' && prevCert.category !== 'Servicing') {
      throw new ForbiddenException('Seuls les certificats d\'entretien (Servicing) peuvent être modifiés par l\'équipage');
    }

    const alarm = calculateAlarmStatus(body.due_date, body.expiration_date);
    this.certsService.update(parseInt(id), {
      ...body,
      alarm_status: alarm
    });

    return { success: true, alarm_status: alarm };
  }

  @Delete('certificates/:id')
  async delete(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Action interdite pour votre profil');
    }
    this.certsService.delete(parseInt(id));
    return { success: true };
  }

  @Post('certificates/:id/upload')
  @UseInterceptors(FileInterceptor('pdf', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.resolve(process.cwd(), 'uploads', 'pdf');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `cert-${uniqueSuffix}${path.extname(file.originalname)}`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new BadRequestException('Seuls les fichiers PDF sont acceptés.'), false);
      }
    }
  }))
  async uploadPdf(@Req() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (req.user.role === 'Partner' || req.user.role === 'Auditor') {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new ForbiddenException('Action interdite pour votre profil');
    }

    const cert = this.certsService.getById(parseInt(id));
    if (!cert) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new NotFoundException('Certificat non trouvé');
    }

    if (req.user.role === 'Crew' && cert.category !== 'Servicing') {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new ForbiddenException('L\'équipage ne peut modifier que les PDF d\'entretien');
    }

    if (!file) {
      throw new BadRequestException('Aucun fichier PDF téléversé');
    }

    const relativePath = `/uploads/pdf/${file.filename}`;
    this.certsService.updatePdfUrl(parseInt(id), relativePath);

    return { success: true, pdf_url: relativePath };
  }
}
