import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && request.query.token) {
      token = request.query.token;
    }

    if (!token) {
      throw new UnauthorizedException('Accès refusé. Veuillez vous connecter.');
    }

    try {
      const decoded = this.jwtService.verify(token);
      request.user = decoded; // user contains: id, role, companyId
      return true;
    } catch (err) {
      throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
    }
  }
}
