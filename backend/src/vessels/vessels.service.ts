import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
  constructor(private readonly db: DatabaseService) {}

  getAll(userId: number, role: string): any[] {
    if (role === 'Admin') {
      return this.db.prepare('SELECT * FROM vessels').all() as any[];
    } else if (role === 'Crew') {
      const user = this.db
        .prepare('SELECT vessel_id FROM users WHERE id = ?')
        .get(userId) as any;
      if (!user || !user.vessel_id) return [];
      return this.db
        .prepare('SELECT * FROM vessels WHERE id = ?')
        .all(user.vessel_id) as any[];
    } else if (role === 'Partner') {
      return this.db
        .prepare(
          'SELECT * FROM vessels WHERE company_id = 1 OR manager = "Verital Marine Services"',
        )
        .all() as any[];
    } else {
      // Auditor — accès à tous les navires
      return this.db.prepare('SELECT * FROM vessels').all() as any[];
    }
  }

  getById(id: number) {
    const vessel = this.db
      .prepare('SELECT * FROM vessels WHERE id = ?')
      .get(id) as any;
    if (!vessel) throw new NotFoundException('Navire non trouvé');
    return vessel;
  }

  getByName(name: string) {
    return this.db
      .prepare('SELECT * FROM vessels WHERE name = ?')
      .get(name) as any;
  }

  getByImo(imo: string) {
    return this.db
      .prepare('SELECT * FROM vessels WHERE imo_number = ?')
      .get(imo) as any;
  }

  insert(v: any): number {
    const stmt = this.db.prepare(`
      INSERT INTO vessels (company_id, name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      v.company_id ?? 2,
      v.name ?? null,
      v.imo_number ?? null,
      v.flag ?? null,
      v.asset_type ?? null,
      v.owner ?? null,
      v.manager ?? null,
      v.gross_tonnage ?? 0,
      v.deadweight_tonnage ?? 0,
      v.port_of_registry ?? null,
      v.call_sign ?? null,
      v.status ?? 'Normal',
    ) as any;
    return info.lastInsertRowid;
  }

  updateStatus(id: number, status: string) {
    this.db
      .prepare('UPDATE vessels SET status = ? WHERE id = ?')
      .run(status, id);
  }

  delete(id: number) {
    this.db.prepare('DELETE FROM vessels WHERE id = ?').run(id);
  }

  // ─── Exécution sécurisée du script Python ─────────────────────────────────

  /**
   * Vérifie qu'un chemin de fichier est bien dans le répertoire uploads autorisé.
   * Protège contre les attaques path traversal (ex: ../../etc/passwd).
   */
  private sanitizeUploadPath(filePath: string): string {
    const resolved = path.resolve(filePath);
    const uploadsResolved = path.resolve(UPLOADS_DIR);
    if (
      !resolved.startsWith(uploadsResolved + path.sep) &&
      resolved !== uploadsResolved
    ) {
      throw new Error(
        `Sécurité: chemin de fichier invalide (hors du répertoire uploads): ${filePath}`,
      );
    }
    return resolved;
  }

  /**
   * Exécute le script Python excel_handler.py de façon sécurisée.
   *
   * Sécurité: utilise execFile() (PAS exec()) → les arguments sont passés
   * comme tableau, jamais interpolés dans un shell.
   * Cela empêche toute injection de commande shell.
   */
  runPythonScript(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // Détection automatique du binaire Python selon l'OS
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      const scriptPath = path.resolve(
        process.cwd(),
        'helpers',
        'excel_handler.py',
      );

      // Valider et sanitizer tous les chemins de fichiers dans les arguments
      const safeArgs = args.map((arg, index) => {
        if (index === 0) return arg; // La commande (parse/format) est une constante
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
    const vessel = this.getById(vesselId);

    const certificates = this.db
      .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
      .all(vesselId) as any[];
    const actionableItems = this.db
      .prepare('SELECT * FROM actionable_items WHERE vessel_id = ?')
      .all(vesselId) as any[];
    const emailsList = (
      this.db
        .prepare('SELECT email FROM vessel_emails WHERE vessel_id = ?')
        .all(vesselId) as any[]
    ).map((r) => r.email);

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
