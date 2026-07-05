import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './roles.decorator';

/**
 * RolesGuard — Applique les restrictions de rôle déclarées via @Roles().
 *
 * SRP: Ce guard NE fait QUE vérifier si le rôle de l'utilisateur connecté
 *      est dans la liste des rôles autorisés pour cet endpoint.
 *
 * Prérequis: Doit être utilisé APRÈS JwtAuthGuard (req.user doit être défini).
 *
 * Comportement:
 *  - Aucun @Roles() déclaré → pas de restriction (tout utilisateur authentifié passe)
 *  - @Roles('Admin') → seuls les Admins passent
 *  - @Roles('Admin', 'Crew') → Admins et Crew passent
 *
 * Remplace TOUTES les vérifications manuelles `if (req.user.role !== 'Admin') throw ForbiddenException`
 * dispersées dans les contrôleurs.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Pas de @Roles() déclaré → pas de restriction
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `Accès refusé. Rôles autorisés : [${requiredRoles.join(', ')}]. Votre rôle : ${user?.role ?? 'inconnu'}.`,
      );
    }

    return true;
  }
}
