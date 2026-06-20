import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    const user = this.dbService
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as any;
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const isValid = bcrypt.compareSync(pass, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const payload = {
      id: user.id,
      role: user.role,
      companyId: user.company_id,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        vessel_id: user.vessel_id,
      },
    };
  }
}
