import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CertificatesService {
  constructor(private readonly db: DatabaseService) {}

  getByVessel(vesselId: number): any[] {
    return this.db
      .prepare('SELECT * FROM certificates WHERE vessel_id = ?')
      .all(vesselId) as any[];
  }

  getById(id: number) {
    return this.db
      .prepare('SELECT * FROM certificates WHERE id = ?')
      .get(id) as any;
  }

  insert(c: any): number {
    const stmt = this.db.prepare(`
      INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      c.vessel_id ?? null,
      c.name ?? null,
      c.category ?? null,
      c.organization ?? null,
      c.issuing_date ?? null,
      c.expiration_date ?? null,
      c.due_date ?? null,
      c.window ?? null,
      c.alarm_status ?? 'N/A',
      c.remarks ?? null,
    ) as any;
    return info.lastInsertRowid;
  }

  update(id: number, c: any) {
    this.db
      .prepare(
        `
      UPDATE certificates
      SET organization = ?, issuing_date = ?, expiration_date = ?, due_date = ?, window = ?, alarm_status = ?, remarks = ?
      WHERE id = ?
    `,
      )
      .run(
        c.organization ?? null,
        c.issuing_date ?? null,
        c.expiration_date ?? null,
        c.due_date ?? null,
        c.window ?? null,
        c.alarm_status ?? 'N/A',
        c.remarks ?? null,
        id,
      );
  }

  updatePdfUrl(id: number, pdfUrl: string) {
    this.db
      .prepare('UPDATE certificates SET pdf_url = ? WHERE id = ?')
      .run(pdfUrl, id);
  }

  delete(id: number) {
    this.db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
  }
}
