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
  ) {}

  @Get()
  async getAll(@Req() req: any) {
    const vessels = await this.vesselsService.getAll(req.user.id, req.user.role);

    const results: any[] = [];
    for (const v of vessels) {
      const certs = await this.vesselsService['db'].query(
        'SELECT * FROM certificates WHERE vessel_id = ?',
        [v.id],
      );

      // Synchronisation P1: recalcul et mise à jour DB si alarm_status diverge
      const alarmLevels: any[] = [];
      for (const c of certs) {
        const computed = this.alarmService.calculate(
          c.due_date,
          c.expiration_date,
          c.window,
        );
        if (this.alarmService.hasChanged(c.alarm_status, computed)) {
          await this.vesselsService['db'].execute(
            'UPDATE certificates SET alarm_status = ? WHERE id = ?',
            [computed, c.id],
          );
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
  @Roles('Admin')
  async createManual(@Req() req: any, @Body() body: any) {
    if (!body.name) {
      throw new BadRequestException('Le nom du navire est requis');
    }
    const id = await this.vesselsService.insert(body);
    await this.vesselsService['db'].execute(
      'INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)',
      [id, req.user.email],
    );

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
  @Roles('Admin')
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
  @Roles('Admin')
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

      await this.vesselsService['db'].execute(
        'INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)',
        [vesselId, req.user.email],
      );

      for (const c of certs) {
        const alarm = this.alarmService.calculate(
          c.due_date,
          c.expiration_date,
          c.window,
        );
        await this.vesselsService['db'].execute(`
          INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          vesselId,
          c.name,
          c.category,
          c.organization,
          c.issuing_date,
          c.expiration_date,
          c.due_date,
          c.window,
          alarm,
          c.remarks,
        ]);
      }

      for (const a of actionable) {
        await this.vesselsService['db'].execute(`
          INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          vesselId,
          a.imposed_date,
          a.category,
          a.report_number,
          a.due_date,
          a.description,
        ]);
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
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestException(
        'Erreur lors du traitement du fichier Excel: ' + (err as Error).message,
      );
    }
  }

  @Get(':id/export')
  async exportExcel(@Req() req: any, @Param('id') id: string, @Res() res: any) {
    const lang = req.query.lang || 'en';
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
    return this.vesselsService['db'].query(
      'SELECT vessel_id, email, is_verified FROM vessel_emails WHERE vessel_id = ?',
      [parseInt(vesselId)],
    );
  }

  @Post(':id/emails')
  @Roles('Admin')
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

    await this.vesselsService['db'].execute(
      `INSERT OR REPLACE INTO vessel_emails (vessel_id, email, is_verified, otp_code, otp_expires)
       VALUES (?, ?, 0, ?, ?)`,
      [parseInt(vesselId), email, otp, expires],
    );

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
  @Roles('Admin')
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

    const record = await this.vesselsService['db'].queryOne(
      'SELECT * FROM vessel_emails WHERE vessel_id = ? AND email = ?',
      [parseInt(vesselId), email],
    );

    if (!record) {
      throw new BadRequestException(
        'Adresse e-mail non trouvée pour ce navire',
      );
    }
    if (record.is_verified) {
      return { success: true, message: 'E-mail déjà vérifié' };
    }
    if (record.otp_code !== code) {
      throw new BadRequestException('Code de vérification incorrect');
    }
    if (record.otp_expires && new Date(record.otp_expires) < new Date()) {
      throw new BadRequestException('Code de vérification expiré');
    }

    await this.vesselsService['db'].execute(
      'UPDATE vessel_emails SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE vessel_id = ? AND email = ?',
      [parseInt(vesselId), email],
    );

    return { success: true };
  }

  @Delete(':id/emails')
  @Roles('Admin')
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
    await this.vesselsService['db'].execute(
      'DELETE FROM vessel_emails WHERE vessel_id = ? AND email = ?',
      [parseInt(vesselId), email],
    );

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
  @Roles('Admin')
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
