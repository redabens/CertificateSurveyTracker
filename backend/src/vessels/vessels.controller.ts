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
    const vessels = this.vesselsService.getAll(req.user.id, req.user.role);

    return vessels.map((v) => {
      const certs = this.vesselsService['db']
        .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
        .all(v.id) as any[];

      // Synchronisation P1: recalcul et mise à jour DB si alarm_status diverge
      const alarmLevels = certs.map((c) => {
        const computed = this.alarmService.calculate(
          c.due_date,
          c.expiration_date,
        );
        if (this.alarmService.hasChanged(c.alarm_status, computed)) {
          this.vesselsService['db']
            .prepare('UPDATE certificates SET alarm_status = ? WHERE id = ?')
            .run(computed, c.id);
        }
        return computed;
      });

      const overall = this.alarmService.computeVesselStatus(alarmLevels);
      this.vesselsService.updateStatus(v.id, overall);

      const red = alarmLevels.filter(
        (a) => a.includes('RED') || a.includes('OVERDUE'),
      ).length;
      const yellow = alarmLevels.filter((a) => a.includes('YELLOW')).length;
      const green = alarmLevels.filter((a) => a.includes('GREEN')).length;
      const normal = alarmLevels.length - red - yellow - green;

      return {
        ...v,
        status: overall,
        counts: { red, yellow, green, normal, total: certs.length },
      };
    });
  }

  @Post('manual')
  @Roles('Admin')
  async createManual(@Req() req: any, @Body() body: any) {
    if (!body.name) {
      throw new BadRequestException('Le nom du navire est requis');
    }
    const id = this.vesselsService.insert(body);
    this.vesselsService['db']
      .prepare(
        'INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)',
      )
      .run(id, req.user.email);

    this.auditService.log({
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
    const vessel = this.vesselsService.getById(parseInt(id));
    this.vesselsService.delete(parseInt(id));

    this.auditService.log({
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

      const existing = this.vesselsService.getByName(vInfo.name);
      if (existing) {
        fs.unlinkSync(file.path);
        throw new BadRequestException(
          `Le navire "${vInfo.name}" existe déjà dans le système`,
        );
      }

      if (vInfo.imo_number) {
        const existingImo = this.vesselsService.getByImo(
          String(vInfo.imo_number),
        );
        if (existingImo) {
          fs.unlinkSync(file.path);
          throw new BadRequestException(
            `Le navire avec le numéro IMO "${vInfo.imo_number}" existe déjà ("${existingImo.name}")`,
          );
        }
      }

      const vesselId = this.vesselsService.insert({
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

      this.vesselsService['db']
        .prepare(
          'INSERT OR IGNORE INTO vessel_emails (vessel_id, email, is_verified) VALUES (?, ?, 1)',
        )
        .run(vesselId, req.user.email);

      const insertCert = this.vesselsService['db'].prepare(`
        INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of certs) {
        const alarm = this.alarmService.calculate(
          c.due_date,
          c.expiration_date,
        );
        insertCert.run(
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
        );
      }

      const insertAct = this.vesselsService['db'].prepare(`
        INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const a of actionable) {
        insertAct.run(
          vesselId,
          a.imposed_date,
          a.category,
          a.report_number,
          a.due_date,
          a.description,
        );
      }

      fs.unlinkSync(file.path);

      this.auditService.log({
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
    return this.vesselsService['db']
      .prepare('SELECT * FROM vessel_emails WHERE vessel_id = ?')
      .all(parseInt(vesselId)) as any[];
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

    this.vesselsService['db']
      .prepare(
        `INSERT OR REPLACE INTO vessel_emails (vessel_id, email, is_verified, otp_code, otp_expires)
         VALUES (?, ?, 0, ?, ?)`,
      )
      .run(parseInt(vesselId), email, otp, expires);

    await this.emailService.sendOtpEmail(email, otp);

    this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'ADD_VESSEL_EMAIL',
      target_type: 'email',
      target_id: parseInt(vesselId),
      target_name: email,
    });

    const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    return {
      success: true,
      email,
      devOtp: smtpConfigured ? undefined : otp,
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

    const record = this.vesselsService['db']
      .prepare('SELECT * FROM vessel_emails WHERE vessel_id = ? AND email = ?')
      .get(parseInt(vesselId), email) as any;

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

    this.vesselsService['db']
      .prepare(
        'UPDATE vessel_emails SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE vessel_id = ? AND email = ?',
      )
      .run(parseInt(vesselId), email);

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
    this.vesselsService['db']
      .prepare('DELETE FROM vessel_emails WHERE vessel_id = ? AND email = ?')
      .run(parseInt(vesselId), email);

    this.auditService.log({
      user_id: req.user.id,
      user_email: req.user.email,
      action: 'REMOVE_VESSEL_EMAIL',
      target_type: 'email',
      target_id: parseInt(vesselId),
      target_name: email,
    });

    return { success: true };
  }
}
