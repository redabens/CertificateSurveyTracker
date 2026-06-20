import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { VesselsService } from './vessels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';

// Helper to determine alarm
function calculateAlarmStatus(dueDateStr: string, expirationDateStr: string) {
  const target = dueDateStr || expirationDateStr;
  if (!target) return 'N/A';
  const diff = Math.ceil(
    (new Date(target).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return 'OVERDUE / IMMEDIATE';
  if (diff <= 30) return 'RED - <1 MONTH';
  if (diff <= 90) return 'YELLOW - 1 TO 3 MONTHS';
  if (diff <= 180) return 'GREEN - 3 TO 6 MONTHS';
  return 'MONITOR >6 MONTHS';
}

@Controller('vessels')
@UseGuards(JwtAuthGuard)
export class VesselsController {
  constructor(private readonly vesselsService: VesselsService) {}

  @Get()
  async getAll(@Req() req: any) {
    const vessels = this.vesselsService.getAll(req.user.id, req.user.role);

    return vessels.map((v) => {
      const certs = this.vesselsService['db']
        .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
        .all(v.id) as any[];
      let red = 0,
        yellow = 0,
        green = 0,
        normal = 0;

      certs.forEach((c) => {
        const alarm = calculateAlarmStatus(c.due_date, c.expiration_date);
        if (alarm.includes('RED') || alarm.includes('OVERDUE')) red++;
        else if (alarm.includes('YELLOW')) yellow++;
        else if (alarm.includes('GREEN')) green++;
        else normal++;
      });

      let overall = 'Normal';
      if (red > 0) overall = 'Imminent';
      else if (yellow > 0) overall = 'Attention';
      else if (green > 0) overall = 'Suivi';

      this.vesselsService.updateStatus(v.id, overall);

      return {
        ...v,
        status: overall,
        counts: { red, yellow, green, normal, total: certs.length },
      };
    });
  }

  @Post('manual')
  async createManual(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Action interdite pour votre profil');
    }
    if (!body.name) {
      throw new BadRequestException('Le nom du navire est requis');
    }
    const id = this.vesselsService.insert(body);
    this.vesselsService['db']
      .prepare(
        'INSERT OR IGNORE INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)',
      )
      .run(id, '', '', '');
    return { id, name: body.name };
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Action interdite pour votre profil');
    }
    this.vesselsService.delete(parseInt(id));
    return { success: true };
  }

  @Post('import')
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
    if (req.user.role !== 'Admin') {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new ForbiddenException('Action interdite pour votre profil');
    }
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
          'INSERT OR IGNORE INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)',
        )
        .run(vesselId, '', '', '');

      const insertCert = this.vesselsService['db'].prepare(`
        INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of certs) {
        const alarm = calculateAlarmStatus(c.due_date, c.expiration_date);
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
      return { success: true, vesselId, name: vInfo.name };
    } catch (err) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestException(
        'Erreur lors du traitement du fichier Excel: ' + err.message,
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
      if (err) {
        console.error('[Export Error]', err);
      }
    });
  }

  @Get(':id/settings')
  async getSettings(@Param('id') vesselId: string) {
    let settings = this.vesselsService['db']
      .prepare('SELECT * FROM email_settings WHERE vessel_id = ?')
      .get(parseInt(vesselId)) as any;
    if (!settings) {
      this.vesselsService['db']
        .prepare(
          'INSERT OR IGNORE INTO email_settings (vessel_id, email1, email2, email3) VALUES (?, ?, ?, ?)',
        )
        .run(parseInt(vesselId), '', '', '');
      settings = { email1: '', email2: '', email3: '' };
    }
    return settings;
  }

  @Put(':id/settings')
  async updateSettings(
    @Req() req: any,
    @Param('id') vesselId: string,
    @Body() body: any,
  ) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Action interdite pour votre profil');
    }
    this.vesselsService['db']
      .prepare(
        `
      INSERT OR REPLACE INTO email_settings (vessel_id, email1, email2, email3)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(
        parseInt(vesselId),
        body.email1 || '',
        body.email2 || '',
        body.email3 || '',
      );
    return { success: true };
  }
}
