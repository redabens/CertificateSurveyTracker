import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * CertificatesService — Accès aux données des certificats.
 *
 * SRP: Ce service NE fait QUE les opérations CRUD sur les certificats
 *      et valide les règles métier propres à la couche service.
 *
 * Règle métier centralisée ici:
 *   assertCrewCanAccess() → seule source de vérité pour la restriction
 *   "Crew peut seulement toucher aux certificats de catégorie Servicing".
 *   Cette règle est ici (service) et non dans le guard (qui gère l'authN/authZ),
 *   car elle dépend du contenu de la donnée (category du certificat).
 */
@Injectable()
export class CertificatesService {
  constructor(private readonly db: DatabaseService) {}

  async getByVessel(vesselId: number): Promise<any[]> {
    return this.db.query('SELECT * FROM certificates WHERE vessel_id = ?', [vesselId]);
  }

  async getById(id: number): Promise<any> {
    return this.db.queryOne('SELECT * FROM certificates WHERE id = ?', [id]);
  }

  async insert(c: any): Promise<number> {
    const row = await this.db.queryOne<{ id: number }>(`
      INSERT INTO certificates (vessel_id, name, category, organization, issuing_date, expiration_date, due_date, window, alarm_status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
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
    ]);
    return row ? row.id : 0;
  }

  async update(id: number, c: any): Promise<void> {
    await this.db.execute(
      `UPDATE certificates
       SET organization = ?, issuing_date = ?, expiration_date = ?, due_date = ?,
           window = ?, alarm_status = ?, remarks = ?
       WHERE id = ?`,
      [
        c.organization ?? null,
        c.issuing_date ?? null,
        c.expiration_date ?? null,
        c.due_date ?? null,
        c.window ?? null,
        c.alarm_status ?? 'N/A',
        c.remarks ?? null,
        id,
      ],
    );
  }

  async updatePdfUrl(id: number, pdfUrl: string): Promise<void> {
    await this.db.execute('UPDATE certificates SET pdf_url = ? WHERE id = ?', [pdfUrl, id]);
  }

  async delete(id: number): Promise<void> {
    await this.db.execute('DELETE FROM certificates WHERE id = ?', [id]);
  }

  /**
   * Règle métier RBAC spécifique aux données:
   * Un membre d'équipage (Crew) ne peut travailler qu'avec des certificats
   * de catégorie "Servicing" (entretien d'équipement).
   *
   * @param role - Rôle de l'utilisateur connecté
   * @param category - Catégorie du certificat visé
   * @param action - Description de l'action (pour le message d'erreur)
   * @throws ForbiddenException si le Crew tente d'accéder à une autre catégorie
   */
  assertCrewCanAccess(role: string, category: string, action: string): void {
    if (role === 'Crew' && category !== 'Servicing') {
      throw new ForbiddenException(
        `L'équipage ne peut ${action} que des certificats d'entretien (Servicing). Catégorie demandée: ${category}.`,
      );
    }
  }
}
