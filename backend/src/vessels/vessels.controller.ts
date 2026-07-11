import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { VesselsService } from './vessels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AlarmService } from '../alarm/alarm.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../database/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';

/**
 * VesselsController — Gestion des navires (CRUD, import/export Excel, emails).
 *
 * SRP: Ce contrôleur NE fait QUE router les requêtes HTTP vers les services
 *      et appeler AuditService pour la traçabilité.
 *
 * Sécurité:
 *   - JwtAuthGuard: authentification JWT sur toutes les routes
 *   - RolesGuard + @Roles(): RBAC déclaratif (remplace tous les if role checks)
 *   - AlarmService: calcul et synchronisation automatique des alarm_status
 */
@Controller('vessels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VesselsController {
  constructor(
    private readonly vesselsService: VesselsService,
    private readonly emailService: EmailService,
    private readonly alarmService: AlarmService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAll(@Req() req: any) {
    const vessels = await this.vesselsService.getAll(
      req.user.id,
      req.user.role,
    );

    const results: any[] = [];
    for (const v of vessels) {
      const certs = await this.prisma.certificate.findMany({
        where: { vesselId: v.id },
      });

      // Synchronisation P1: recalcul et mise à jour DB si alarm_status diverge
      const alarmLevels: any[] = [];
      for (const c of certs) {
        const computed = this.alarmService.calculate(
          c.dueDate,
          c.expirationDate,
          c.window,
        );
        if (this.alarmService.hasChanged(c.alarmStatus, computed)) {
          await this.prisma.certificate.update({
            where: { id: c.id },
            data: { alarmStatus: computed },
          });
        }
        alarmLevels.push(computed);
      }

      const overall = this.alarmService.computeVesselStatus(alarmLevels);
      await this.vesselsService.updateStatus(v.id, overall);

      const overdue = alarmLevels.filter((a) => a.includes('OVERDUE')).length;
      const red = alarmLevels.filter((a) => a.includes('RED')).length;
      const yellow = alarmLevels.filter((a) => a.includes('YELLOW')).length;
      const green = alarmLevels.filter((a) => a.includes('GREEN')).length;
      const normal = alarmLevels.filter((a) => a.includes('MONITOR')).length;

      results.push({
        ...v,
        status: overall,
        counts: { overdue, red, yellow, green, normal, total: certs.length },
      });
    }
    return results;
  }

  @Post('manual')
  @Roles('Admin', 'Manager')
  async createManual(@Req() req: any, @Body() body: any) {
    if (!body.name) {
      throw new BadRequestException('Le nom du navire est requis');
    }
    if (!body.imo_number) {
      throw new BadRequestException('Le numéro IMO est requis');
    }
    if (!body.flag) {
      throw new BadRequestException('Le pavillon est requis');
    }
    if (!body.owner) {
      throw new BadRequestException('Le propriétaire est requis');
    }
    const id = await this.vesselsService.insert(body);
    await this.prisma.vesselEmail.upsert({
      where: {
        vesselId_email: {
          vesselId: id,
          email: req.user.email,
        },
      },
      update: {},
      create: {
        vesselId: id,
        email: req.user.email,
        isVerified: 1,
      },
    });

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'CREATE_VESSEL',
      target_type: 'vessel',
      target_id: id,
      target_name: body.name,
    });

    return { id, name: body.name };
  }

  @Delete(':id')
  @Roles('Admin', 'Manager')
  async delete(@Req() req: any, @Param('id') id: string) {
    const vessel = await this.vesselsService.getById(parseInt(id));
    await this.vesselsService.delete(parseInt(id));

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'DELETE_VESSEL',
      target_type: 'vessel',
      target_id: parseInt(id),
      target_name: vessel?.name,
    });

    return { success: true };
  }

  @Post('import')
  @Roles('Admin', 'Manager')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, `import-${Date.now()}-${file.originalname}`);
        },
      }),
    }),
  )
  async importExcel(@Req() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Veuillez téléverser un fichier Excel');
    }

    try {
      const stdout = await this.vesselsService.runPythonScript([
        'parse',
        file.path,
      ]);
      const parsed = JSON.parse(stdout);

      const vInfo = parsed.vessel;
      const certs = parsed.certificates;
      const actionable = parsed.actionable_items;

      const existing = await this.vesselsService.getByName(vInfo.name);
      if (existing) {
        fs.unlinkSync(file.path);
        throw new BadRequestException(
          `Le navire "${vInfo.name}" existe déjà dans le système`,
        );
      }

      if (vInfo.imo_number) {
        const existingImo = await this.vesselsService.getByImo(
          String(vInfo.imo_number),
        );
        if (existingImo) {
          fs.unlinkSync(file.path);
          throw new BadRequestException(
            `Le navire avec le numéro IMO "${vInfo.imo_number}" existe déjà ("${existingImo.name}")`,
          );
        }
      }

      const vesselId = await this.vesselsService.insert({
        company_id: 2,
        name: vInfo.name,
        imo_number: vInfo.imo_number,
        flag: vInfo.flag,
        asset_type: vInfo.asset_type,
        owner: vInfo.owner,
        manager: vInfo.company,
        gross_tonnage: vInfo.gross_tonnage,
        deadweight_tonnage: vInfo.dwt,
        port_of_registry: vInfo.port_of_registry,
        call_sign: vInfo.call_sign,
        status: vInfo.overall_status,
      });

      await this.prisma.vesselEmail.upsert({
        where: {
          vesselId_email: {
            vesselId,
            email: req.user.email,
          },
        },
        update: {},
        create: {
          vesselId,
          email: req.user.email,
          isVerified: 1,
        },
      });

      for (const c of certs) {
        const parsedWindow = parseImportedWindow(c.window);
        const alarm = this.alarmService.calculate(
          c.due_date,
          c.expiration_date,
          parsedWindow,
        );
        await this.prisma.certificate.create({
          data: {
            vesselId,
            name: c.name,
            category: c.category,
            organization: c.organization,
            issuingDate: c.issuing_date,
            expirationDate: c.expiration_date,
            dueDate: c.due_date,
            window: parsedWindow,
            alarmStatus: alarm,
            remarks: c.remarks,
          },
        });
      }

      for (const a of actionable) {
        await this.prisma.actionableItem.create({
          data: {
            vesselId,
            imposedDate: a.imposed_date,
            category: a.category,
            reportNumber: a.report_number,
            dueDate: a.due_date,
            description: a.description,
          },
        });
      }

      fs.unlinkSync(file.path);

      await this.auditService.log({
        user_id: req.user.id,
        user_email: req.user.email,
        action: 'IMPORT_VESSEL',
        target_type: 'vessel',
        target_id: vesselId,
        target_name: vInfo.name,
      });

      return { success: true, vesselId, name: vInfo.name };
    } catch (err) {
      console.error('[vessels.controller] importExcel error:', err);
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestException(
        'Erreur lors du traitement du fichier Excel: ' + (err as Error).message,
      );
    }
  }

  @Get(':id/export')
  async exportExcel(
    @Res() res: any,
    @Param('id') id: string,
    @Query('lang') langFromQuery: string,
    @Req() req: any,
  ) {
    const queryLang = langFromQuery || req.query.lang;
    const lang = queryLang || 'en';
    const { excelPath, jsonPath, fileName } =
      await this.vesselsService.generateExcelExport(parseInt(id), lang);

    res.download(excelPath, fileName, (err: any) => {
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
      if (err) console.error('[Export Error]', err);
    });
  }

  @Get(':id/emails')
  async getEmails(@Param('id') vesselId: string) {
    const rows = await this.prisma.vesselEmail.findMany({
      where: { vesselId: parseInt(vesselId) },
      select: {
        vesselId: true,
        email: true,
        isVerified: true,
      },
    });
    return rows.map((r) => ({
      vessel_id: r.vesselId,
      email: r.email,
      is_verified: r.isVerified,
    }));
  }

  @Post(':id/emails')
  @Roles('Admin', 'Manager')
  async addEmail(
    @Req() req: any,
    @Param('id') vesselId: string,
    @Body() body: any,
  ) {
    if (!body.email) {
      throw new BadRequestException("L'adresse e-mail est requise");
    }

    const email = body.email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await this.prisma.vesselEmail.upsert({
      where: {
        vesselId_email: {
          vesselId: parseInt(vesselId),
          email,
        },
      },
      update: {
        isVerified: 0,
        otpCode: otp,
        otpExpires: expires,
      },
      create: {
        vesselId: parseInt(vesselId),
        email,
        isVerified: 0,
        otpCode: otp,
        otpExpires: expires,
      },
    });

    await this.emailService.sendOtpEmail(email, otp);

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'ADD_VESSEL_EMAIL',
      target_type: 'email',
      target_id: parseInt(vesselId),
      target_name: email,
    });

    const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const isProd = process.env.NODE_ENV === 'production';
    return {
      success: true,
      email,
      devOtp: smtpConfigured || isProd ? undefined : otp,
    };
  }

  @Post(':id/emails/verify')
  @Roles('Admin', 'Manager')
  async verifyEmail(
    @Req() req: any,
    @Param('id') vesselId: string,
    @Body() body: any,
  ) {
    if (!body.email || !body.code) {
      throw new BadRequestException(
        "L'e-mail et le code de vérification sont requis",
      );
    }

    const email = body.email.toLowerCase().trim();
    const code = body.code.trim();

    const record = await this.prisma.vesselEmail.findUnique({
      where: {
        vesselId_email: {
          vesselId: parseInt(vesselId),
          email,
        },
      },
    });

    if (!record) {
      throw new BadRequestException(
        'Adresse e-mail non trouvée pour ce navire',
      );
    }
    if (record.isVerified) {
      return { success: true, message: 'E-mail déjà vérifié' };
    }
    if (record.otpCode !== code) {
      throw new BadRequestException('Code de vérification incorrect');
    }
    if (record.otpExpires && new Date(record.otpExpires) < new Date()) {
      throw new BadRequestException('Code de vérification expiré');
    }

    await this.prisma.vesselEmail.update({
      where: {
        vesselId_email: {
          vesselId: parseInt(vesselId),
          email,
        },
      },
      data: {
        isVerified: 1,
        otpCode: null,
        otpExpires: null,
      },
    });

    return { success: true };
  }

  @Delete(':id/emails')
  @Roles('Admin', 'Manager')
  async removeEmail(
    @Req() req: any,
    @Param('id') vesselId: string,
    @Query('email') emailFromQuery: string,
    @Body() body: any,
  ) {
    const emailToDelete = emailFromQuery || body?.email;
    if (!emailToDelete) {
      throw new BadRequestException("L'e-mail à supprimer est requis");
    }

    const email = emailToDelete.toLowerCase().trim();
    await this.prisma.vesselEmail.delete({
      where: {
        vesselId_email: {
          vesselId: parseInt(vesselId),
          email,
        },
      },
    });

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'REMOVE_VESSEL_EMAIL',
      target_type: 'email',
      target_id: parseInt(vesselId),
      target_name: email,
    });

    return { success: true };
  }

  @Post(':id/trigger-notifications')
  @Roles('Admin', 'Manager')
  async triggerVesselNotifications(
    @Req() req: any,
    @Param('id') vesselId: string,
    @Query('status') status?: string,
  ) {
    const result = await this.emailService.sendManualVesselNotifications(
      parseInt(vesselId),
      status,
    );

    await this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'TRIGGER_MANUAL_NOTIFICATION',
      target_type: 'vessel',
      target_id: parseInt(vesselId),
      target_name: `Status filter: ${status || 'ALL'}`,
    });

    return { success: true, ...result };
  }
}

export function parseImportedWindow(
  rawWindow: string | null | undefined,
): string {
  if (!rawWindow) {
    return '[]';
  }
  const clean = rawWindow.trim();
  if (clean.startsWith('[')) {
    return clean;
  }

  // Try to parse as single number
  const singleNum = parseInt(clean, 10);
  if (!isNaN(singleNum) && String(singleNum) === clean) {
    return JSON.stringify([
      {
        type: 'AS window',
        mode: 'predefined',
        offsetMonths: singleNum,
        startDate: '',
        endDate: '',
      },
    ]);
  }

  // Parse structured semicolon-separated string
  // E.g. "AS window: 03 Nov 2025 - 01 May 2026; Special renewal: 02 Nov 2028 - 01 Feb 2029"
  try {
    const parts = clean.split(';');
    const results: any[] = [];

    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;

      let type = 'AS window';
      let dateRangeStr = trimmedPart;

      if (trimmedPart.includes(':')) {
        const colonIdx = trimmedPart.indexOf(':');
        type = trimmedPart.substring(0, colonIdx).trim();
        dateRangeStr = trimmedPart.substring(colonIdx + 1).trim();
      }

      if (dateRangeStr.includes('-')) {
        const dateParts = dateRangeStr.split('-');
        if (dateParts.length === 2) {
          const start = new Date(dateParts[0].trim());
          const end = new Date(dateParts[1].trim());

          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            results.push({
              type,
              mode: 'custom',
              offsetMonths: 3,
              startDate: start.toISOString().substring(0, 10),
              endDate: end.toISOString().substring(0, 10),
            });
            continue;
          }
        }
      }

      // If we couldn't parse the dates properly, keep it as legacyText
      results.push({
        type,
        mode: 'custom',
        offsetMonths: 3,
        startDate: '',
        endDate: '',
        legacyText: trimmedPart,
      });
    }

    if (results.length > 0) {
      return JSON.stringify(results);
    }
  } catch (err) {
    console.error('[vessels.controller] parseImportedWindow error:', err);
  }

  return JSON.stringify([
    {
      type: 'AS window',
      mode: 'custom',
      offsetMonths: 3,
      startDate: '',
      endDate: '',
      legacyText: clean,
    },
  ]);
}
