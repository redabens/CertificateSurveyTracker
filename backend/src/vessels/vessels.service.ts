import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10 MB
const PYTHON_TIMEOUT_MS = 30_000; // 30 secondes

/**
 * VesselsService — Accès aux données des navires et exécution des scripts Python.
 *
 * SRP: Ce service gère UNIQUEMENT les opérations CRUD sur les navires
 *      et l'exécution sécurisée du script Python excel_handler.py.
 *
 * Sécurité (P2):
 *   - Utilisation de execFile() au lieu de exec() → pas de shell intermédiaire
 *   - Validation stricte des chemins de fichiers avant exécution Python
 *   - Timeout de 30s et limite de buffer 10MB sur le process Python
 */
@Injectable()
export class VesselsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapVesselToResponse(v: any) {
    return {
      id: v.id,
      company_id: v.companyId,
      name: v.name,
      imo_number: v.imoNumber,
      flag: v.flag,
      asset_type: v.assetType,
      owner: v.owner,
      manager: v.manager,
      gross_tonnage: v.grossTonnage,
      deadweight_tonnage: v.deadweightTonnage,
      port_of_registry: v.portOfRegistry,
      call_sign: v.callSign,
      year_built: v.yearBuilt,
      class_society: v.classSociety,
      status: v.status,
    };
  }

  private mapCertificateToResponse(c: any) {
    return {
      id: c.id,
      vessel_id: c.vesselId,
      name: c.name,
      category: c.category,
      organization: c.organization,
      issuing_date: c.issuingDate,
      expiration_date: c.expirationDate,
      due_date: c.dueDate,
      window: c.window,
      alarm_status: c.alarmStatus,
      pdf_url: c.pdfUrl,
      remarks: c.remarks,
    };
  }

  private mapActionableItemToResponse(a: any) {
    return {
      id: a.id,
      vessel_id: a.vesselId,
      item_id: a.itemId,
      imposed_date: a.imposedDate,
      category: a.category,
      report_number: a.reportNumber,
      due_date: a.dueDate,
      description: a.description,
      status: a.status,
    };
  }

  async getAll(userId: number, role: string): Promise<any[]> {
    let vessels: any[] = [];
    if (role === 'Admin') {
      vessels = await this.prisma.vessel.findMany();
    } else if (role === 'Crew') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user || !user.vesselId) return [];
      vessels = await this.prisma.vessel.findMany({
        where: { id: user.vesselId },
      });
    } else if (role === 'Partner') {
      vessels = await this.prisma.vessel.findMany({
        where: {
          OR: [{ companyId: 1 }, { manager: 'Verital Marine Services' }],
        },
      });
    } else {
      // Auditor
      vessels = await this.prisma.vessel.findMany();
    }
    return vessels.map((v) => this.mapVesselToResponse(v));
  }

  async getById(id: number): Promise<any> {
    const vessel = await this.prisma.vessel.findUnique({
      where: { id },
    });
    if (!vessel) throw new NotFoundException('Navire non trouvé');
    return this.mapVesselToResponse(vessel);
  }

  async getByName(name: string): Promise<any> {
    const vessel = await this.prisma.vessel.findFirst({
      where: { name },
    });
    return vessel ? this.mapVesselToResponse(vessel) : null;
  }

  async getByImo(imo: string): Promise<any> {
    const vessel = await this.prisma.vessel.findUnique({
      where: { imoNumber: imo },
    });
    return vessel ? this.mapVesselToResponse(vessel) : null;
  }

  async insert(v: any): Promise<number> {
    const vessel = await this.prisma.vessel.create({
      data: {
        companyId: v.company_id ?? 2,
        name: v.name,
        imoNumber: v.imo_number ?? null,
        flag: v.flag ?? null,
        assetType: v.asset_type ?? null,
        owner: v.owner ?? null,
        manager: v.manager ?? null,
        grossTonnage: v.gross_tonnage ? parseInt(v.gross_tonnage, 10) : 0,
        deadweightTonnage: v.deadweight_tonnage
          ? parseInt(v.deadweight_tonnage, 10)
          : 0,
        portOfRegistry: v.port_of_registry ?? null,
        callSign: v.call_sign ?? null,
        yearBuilt: v.year_built ? parseInt(v.year_built, 10) : null,
        classSociety: v.class_society ?? null,
        status: v.status ?? 'Normal',
      },
    });
    return vessel.id;
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await this.prisma.vessel.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.vessel.delete({
      where: { id },
    });
  }

  // ─── Exécution sécurisée du script Python ─────────────────────────────────

  private sanitizeUploadPath(filePath: string): string {
    const resolved = path.resolve(filePath);
    const uploadsResolved = path.resolve(UPLOADS_DIR);
    const templateResolved = path.resolve(
      process.cwd(),
      'MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx',
    );
    if (
      !resolved.startsWith(uploadsResolved + path.sep) &&
      resolved !== uploadsResolved &&
      resolved !== templateResolved
    ) {
      throw new Error(
        `Sécurité: chemin de fichier invalide (hors du répertoire uploads): ${filePath}`,
      );
    }
    return resolved;
  }

  runPythonScript(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = path.resolve(
        process.cwd(),
        'helpers',
        'excel_handler.py',
      );
      const safeArgs = args.map((arg, index) => {
        if (index === 0) return arg;
        if (path.isAbsolute(arg) && fs.existsSync(arg)) {
          return this.sanitizeUploadPath(arg);
        }
        return arg;
      });

      execFile(
        pythonCmd,
        [scriptPath, ...safeArgs],
        {
          timeout: PYTHON_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER_BYTES,
        },
        (error, stdout, stderr) => {
          if (error) {
            console.error(`[VesselsService] Erreur Python:`, stderr);
            return reject(new Error(error.message));
          }
          resolve(stdout);
        },
      );
    });
  }

  async generateExcelExport(
    vesselId: number,
    lang: string,
  ): Promise<{ excelPath: string; jsonPath: string; fileName: string }> {
    const vessel = await this.getById(vesselId);

    const rawCerts = await this.prisma.certificate.findMany({
      where: { vesselId },
    });
    const certificates = rawCerts.map((c) => this.mapCertificateToResponse(c));

    const rawActions = await this.prisma.actionableItem.findMany({
      where: { vesselId },
    });
    const actionableItems = rawActions.map((a) =>
      this.mapActionableItemToResponse(a),
    );

    const emailRows = await this.prisma.vesselEmail.findMany({
      where: { vesselId },
      select: { email: true },
    });
    const emailsList = emailRows.map((r) => r.email);

    const formattedCertificates = certificates.map((cert) => {
      let windowText = cert.window;
      if (windowText && windowText.trim().startsWith('[')) {
        try {
          const arr = JSON.parse(windowText) as any[];
          windowText = arr
            .map((item) => {
              if (item.mode === 'custom') {
                const startFmt = formatDateStringExcel(item.startDate);
                const endFmt = formatDateStringExcel(item.endDate);
                return `${item.type}: ${startFmt} - ${endFmt}`;
              } else {
                const offset = item.offsetMonths || 0;
                return `${item.type}: +/- ${offset} mois`;
              }
            })
            .join('; ');
        } catch (e) {
          console.warn(
            '[VesselsService] Failed to parse structured window text in Excel export:',
            e,
          );
        }
      }
      return { ...cert, window: windowText };
    });

    const exportData = {
      lang: lang || 'en',
      vessel: {
        name: vessel.name,
        imo_number: vessel.imo_number,
        flag: vessel.flag,
        report_date: new Date().toISOString().substring(0, 10),
        company: vessel.manager,
        year_built: vessel.year_built,
        class_status: 'Classed',
        asset_type: vessel.asset_type,
        overall_status: vessel.status,
        dwt: vessel.deadweight_tonnage,
        owner: vessel.owner,
        gross_tonnage: vessel.gross_tonnage,
        port_of_registry: vessel.port_of_registry,
        call_sign: vessel.call_sign,
      },
      emails: emailsList,
      certificates: formattedCertificates,
      actionable_items: actionableItems,
    };

    const templatePath = path.resolve(
      process.cwd(),
      'MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx',
    );

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const tempJsonPath = path.resolve(uploadsDir, `export_${vesselId}.json`);
    const tempOutExcelPath = path.resolve(
      uploadsDir,
      `export_${vessel.name.replace(/\s+/g, '_')}.xlsx`,
    );

    fs.writeFileSync(tempJsonPath, JSON.stringify(exportData, null, 2));

    await this.runPythonScript([
      'format',
      templatePath,
      tempOutExcelPath,
      tempJsonPath,
    ]);

    return {
      excelPath: tempOutExcelPath,
      jsonPath: tempJsonPath,
      fileName: `${vessel.name}_Certificate_Tracker.xlsx`,
    };
  }
}

function formatDateStringExcel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
