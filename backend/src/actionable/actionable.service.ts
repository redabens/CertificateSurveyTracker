import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ActionableService {
  constructor(private readonly db: DatabaseService) {}

  getByVessel(vesselId: number): any[] {
    return this.db
      .prepare('SELECT * FROM actionable_items WHERE vessel_id = ?')
      .all(vesselId) as any[];
  }

  insert(a: any): number {
    const stmt = this.db.prepare(`
      INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      a.vessel_id ?? null,
      a.imposed_date ?? null,
      a.category ?? null,
      a.report_number ?? null,
      a.due_date ?? null,
      a.description ?? null,
    ) as any;
    return info.lastInsertRowid;
  }

  updateStatus(id: number, status: string) {
    this.db
      .prepare('UPDATE actionable_items SET status = ? WHERE id = ?')
      .run(status, id);
  }
}
