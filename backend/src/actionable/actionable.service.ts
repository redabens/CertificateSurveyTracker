import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ActionableService {
  constructor(private readonly db: DatabaseService) {}

  async getByVessel(vesselId: number): Promise<any[]> {
    return this.db.query('SELECT * FROM actionable_items WHERE vessel_id = ?', [vesselId]);
  }

  async insert(a: any): Promise<number> {
    const row = await this.db.queryOne<{ id: number }>(`
      INSERT INTO actionable_items (vessel_id, imposed_date, category, report_number, due_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
      a.vessel_id ?? null,
      a.imposed_date ?? null,
      a.category ?? null,
      a.report_number ?? null,
      a.due_date ?? null,
      a.description ?? null,
    ]);
    return row ? row.id : 0;
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await this.db.execute('UPDATE actionable_items SET status = ? WHERE id = ?', [status, id]);
  }
}
