import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  async getByVessel(vesselId: number): Promise<any[]> {
    const certs = await this.prisma.certificate.findMany({
      where: { vesselId },
    });
    return certs.map((c) => this.mapCertificateToResponse(c));
  }

  async getById(id: number): Promise<any> {
    const cert = await this.prisma.certificate.findUnique({
      where: { id },
    });
    return cert ? this.mapCertificateToResponse(cert) : null;
  }

  async insert(c: any): Promise<number> {
    const cert = await this.prisma.certificate.create({
      data: {
        vesselId: c.vessel_id,
        name: c.name,
        category: c.category,
        organization: c.organization ?? null,
        issuingDate: c.issuing_date ?? null,
        expirationDate: c.expiration_date ?? null,
        dueDate: c.due_date ?? null,
        window: c.window ?? null,
        alarmStatus: c.alarm_status ?? 'N/A',
        remarks: c.remarks ?? null,
      },
    });
    return cert.id;
  }

  async update(id: number, c: any): Promise<void> {
    await this.prisma.certificate.update({
      where: { id },
      data: {
        organization: c.organization ?? null,
        issuingDate: c.issuing_date ?? null,
        expirationDate: c.expiration_date ?? null,
        dueDate: c.due_date ?? null,
        window: c.window ?? null,
        alarmStatus: c.alarm_status ?? 'N/A',
        remarks: c.remarks ?? null,
      },
    });
  }

  async updatePdfUrl(id: number, pdfUrl: string): Promise<void> {
    await this.prisma.certificate.update({
      where: { id },
      data: {
        pdfUrl,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.certificate.delete({
      where: { id },
    });
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
