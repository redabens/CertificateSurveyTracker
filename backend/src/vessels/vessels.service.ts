import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class VesselsService {
  constructor(private readonly db: DatabaseService) {}

  getAll(userId: number, role: string, companyId: number): any[] {
    if (role === 'Admin') {
      return this.db.prepare('SELECT * FROM vessels').all() as any[];
    } else if (role === 'Crew') {
      const user = this.db.prepare('SELECT vessel_id FROM users WHERE id = ?').get(userId) as any;
      if (!user || !user.vessel_id) return [];
      return this.db.prepare('SELECT * FROM vessels WHERE id = ?').all(user.vessel_id) as any[];
    } else if (role === 'Partner') {
      // Partner sees vessels matching their technical manager or CNAN fleet
      return this.db.prepare('SELECT * FROM vessels WHERE company_id = 1 OR manager = "Verital Marine Services"').all() as any[];
    } else {
      // Auditor can see all vessels
      return this.db.prepare('SELECT * FROM vessels').all() as any[];
    }
  }

  getById(id: number) {
    const vessel = this.db.prepare('SELECT * FROM vessels WHERE id = ?').get(id) as any;
    if (!vessel) {
      throw new NotFoundException('Navire non trouvé');
    }
    return vessel;
  }

  getByName(name: string) {
    return this.db.prepare('SELECT * FROM vessels WHERE name = ?').get(name) as any;
  }

  insert(v: any): number {
    const stmt = this.db.prepare(`
      INSERT INTO vessels (company_id, name, imo_number, flag, asset_type, owner, manager, gross_tonnage, deadweight_tonnage, port_of_registry, call_sign, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      v.company_id || 2,
      v.name,
      v.imo_number,
      v.flag,
      v.asset_type,
      v.owner,
      v.manager,
      v.gross_tonnage || 0,
      v.deadweight_tonnage || 0,
      v.port_of_registry,
      v.call_sign,
      v.status || 'Normal'
    ) as any;
    return info.lastInsertRowid;
  }

  updateStatus(id: number, status: string) {
    this.db.prepare('UPDATE vessels SET status = ? WHERE id = ?').run(status, id);
  }

  delete(id: number) {
    // Delete cascade is enabled in DB for certificates, actionable_items, email_settings
    this.db.prepare('DELETE FROM vessels WHERE id = ?').run(id);
  }

  // Runs python script
  runPythonScript(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonCmd = 'python';
      // Path is resolved relative to the main project directory or python script destination
      const scriptPath = path.resolve(process.cwd(), 'helpers', 'excel_handler.py');
      const cmdLine = `"${pythonCmd}" "${scriptPath}" ${args.map(x => `"${x}"`).join(' ')}`;
      
      exec(cmdLine, (error, stdout, stderr) => {
        if (error) {
          console.error(`[VesselsService] python error:`, stderr);
          return reject(error);
        }
        resolve(stdout);
      });
    });
  }

  async generateExcelExport(vesselId: number, lang: string): Promise<{ excelPath: string, jsonPath: string, fileName: string }> {
    const vessel = this.getById(vesselId);
    
    // Fetch related database data
    const certificates = this.db.prepare('SELECT * FROM certificates WHERE vessel_id = ?').all() as any[];
    const actionableItems = this.db.prepare('SELECT * FROM actionable_items WHERE vessel_id = ?').all() as any[];
    const settings = this.db.prepare('SELECT * FROM email_settings WHERE vessel_id = ?').get(vesselId) as any || {};
    
    // Helper to calculate alarm status dynamically for export
    const calculateAlarm = (dueDateStr: string, expDateStr: string) => {
      const target = dueDateStr || expDateStr;
      if (!target) return 'N/A';
      const diff = Math.ceil((new Date(target).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return 'OVERDUE / IMMEDIATE';
      if (diff <= 30) return 'RED - <1 MONTH';
      if (diff <= 90) return 'YELLOW - 1 TO 3 MONTHS';
      if (diff <= 180) return 'GREEN - 3 TO 6 MONTHS';
      return 'MONITOR >6 MONTHS';
    };

    const mappedCerts = certificates.map(c => ({
      ...c,
      alarm_status: calculateAlarm(c.due_date, c.expiration_date)
    }));

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
        call_sign: vessel.call_sign
      },
      emails: [settings.email1, settings.email2, settings.email3].filter(Boolean),
      certificates: mappedCerts,
      actionable_items: actionableItems
    };

    // Excel formatting files
    const templatePath = path.resolve(process.cwd(), 'MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx');
    
    // Ensure uploads temp exists
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const tempJsonPath = path.resolve(uploadsDir, `export_${vesselId}.json`);
    const tempOutExcelPath = path.resolve(uploadsDir, `export_${vessel.name.replace(/\s+/g, '_')}.xlsx`);
    
    fs.writeFileSync(tempJsonPath, JSON.stringify(exportData, null, 2));

    // Execute python command
    await this.runPythonScript(['format', templatePath, tempOutExcelPath, tempJsonPath]);

    return {
      excelPath: tempOutExcelPath,
      jsonPath: tempJsonPath,
      fileName: `${vessel.name}_Certificate_Tracker.xlsx`
    };
  }
}
