import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Types d'actions critiques auditables dans le système.
 */
export type AuditAction =
  | 'IMPORT_VESSEL'
  | 'CREATE_VESSEL'
  | 'DELETE_VESSEL'
  | 'CREATE_CERTIFICATE'
  | 'UPDATE_CERTIFICATE'
  | 'DELETE_CERTIFICATE'
  | 'UPLOAD_PDF'
  | 'CREATE_ACTIONABLE'
  | 'UPDATE_ACTIONABLE'
  | 'DELETE_ACTIONABLE'
  | 'UPDATE_ACTIONABLE_STATUS'
  | 'CREATE_USER'
  | 'DELETE_USER'
  | 'RESET_PASSWORD'
  | 'ADD_VESSEL_EMAIL'
  | 'REMOVE_VESSEL_EMAIL'
  | 'TRIGGER_MANUAL_NOTIFICATION';

export type AuditTargetType =
  | 'vessel'
  | 'certificate'
  | 'actionable_item'
  | 'user'
  | 'email';

export interface AuditLogEntry {
  user_id: number;
  user_email: string;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id?: number;
  target_name?: string;
  /** Objet JSON des changements: { field: { from: valeurAvant, to: valeurApres } } */
  changes?: Record<string, { from: unknown; to: unknown }>;
}

/**
 * AuditService — Enregistre toutes les actions critiques des utilisateurs.
 *
 * SRP: Ce service NE fait QUE écrire et lire des entrées dans la table audit_logs.
 *      Pas de logique métier, pas d'emails, pas de calcul d'alarme.
 *
 * Appeler AuditService.log() depuis les contrôleurs après chaque action critique:
 *   - Import/création/suppression de navire
 *   - Création/modification/suppression de certificat (avec diff des dates)
 *   - Import/création/suppression d'utilisateur
 *   - Ajout/suppression d'email de navire
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre une entrée d'audit en base de données.
   * Non-bloquant: les erreurs sont silencieuses pour ne pas perturber le flux principal.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.user_id,
          userEmail: entry.user_email,
          action: entry.action,
          targetType: entry.target_type,
          targetId: entry.target_id ?? null,
          targetName: entry.target_name ?? null,
          changes: entry.changes ? JSON.stringify(entry.changes) : null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      // Ne jamais bloquer l'opération principale à cause d'un échec d'audit
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  /**
   * Récupère les dernières entrées d'audit (tri décroissant).
   * @param limit Nombre maximum d'entrées à retourner (défaut: 200)
   */
  async getAll(limit = 200): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { id: 'desc' },
      take: limit,
    });
    return logs.map((log) => ({
      id: log.id,
      user_id: log.userId,
      user_email: log.userEmail,
      action: log.action,
      target_type: log.targetType,
      target_id: log.targetId,
      target_name: log.targetName,
      changes: log.changes ? JSON.parse(log.changes) : null,
      timestamp: log.timestamp,
    }));
  }
}
