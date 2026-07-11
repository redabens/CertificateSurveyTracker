import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * CrewVesselGuard — Isole les membres d'équipage à leur navire assigné.
 *
 * SRP: Ce guard NE fait QUE vérifier que le Crew accède bien à son propre navire.
 *      Les autres rôles (Admin, Manager, Auditor) passent toujours.
 *
 * Appliquer sur tout endpoint exposant un :vesselId ou un :id de ressource
 * liée à un navire (certificats, actionable items).
 *
 * La restriction "Crew → catégorie Servicing uniquement" est une règle métier:
 * elle reste dans CertificatesService, non dans ce guard.
 */
@Injectable()
export class CrewVesselGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Seuls les Crew sont restreints; Admin/Manager/Auditor passent librement
    if (!user || user.role !== 'Crew') return true;

    // Extrait le vessel_id depuis les params (:vesselId prioritaire, puis :id)
    const paramVesselId = request.params.vesselId ?? request.params.id;
    const vesselId = parseInt(paramVesselId, 10);

    if (!isNaN(vesselId) && user.vessel_id !== vesselId) {
      throw new ForbiddenException(
        `Accès refusé. Vous n'êtes pas assigné au navire #${vesselId}.`,
      );
    }

    return true;
  }
}
