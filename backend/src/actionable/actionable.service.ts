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
      a.vessel_id,
      a.imposed_date,
      a.category,
      a.report_number,
      a.due_date,
      a.description,
    ) as any;
    return info.lastInsertRowid;
  }

  updateStatus(id: number, status: string) {
    this.db
      .prepare('UPDATE actionable_items SET status = ? WHERE id = ?')
      .run(status, id);
  }
}
