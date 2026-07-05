export type UserRole = 'Admin' | 'Crew' | 'Partner' | 'Auditor';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
