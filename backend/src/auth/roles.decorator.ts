import { SetMetadata } from '@nestjs/common';

/**
 * Décorateur @Roles(...roles) — Déclare les rôles autorisés à accéder à un endpoint.
 *
 * SRP: Ce décorateur NE fait QUE stocker les métadonnées de rôles sur le handler.
 *      L'application de la restriction est déléguée à RolesGuard.
 *
 * Utilisation:
 *   @Roles('Admin')                    → Admins uniquement
 *   @Roles('Admin', 'Crew')            → Admins et Crew
 *   @Roles('Admin', 'Crew', 'Partner') → Lecture élargie
 *   (sans @Roles)                      → Accès libre pour tout utilisateur authentifié
 */
export type UserRole = 'Admin' | 'Crew' | 'Partner' | 'Auditor';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
