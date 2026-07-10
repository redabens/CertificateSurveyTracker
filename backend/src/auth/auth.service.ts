import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.dbService.queryOne('SELECT * FROM users WHERE email = ?', [
      email.toLowerCase().trim(),
    ]);
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const isValid = bcrypt.compareSync(pass, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      vessel_id: user.vessel_id,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        vessel_id: user.vessel_id,
        mustChangePassword: !!user.must_change_password,
      },
    };
  }

  async getUsers() {
    return this.dbService.query(
      'SELECT id, email, full_name, role, company_id, vessel_id, must_change_password FROM users',
    );
  }

  async createUser(
    email: string,
    fullName: string,
    role: string,
    companyId: number,
    vesselId: number | null,
  ) {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await this.dbService.queryOne('SELECT * FROM users WHERE email = ?', [
      cleanEmail,
    ]);
    if (existing) {
      throw new BadRequestException(
        'Un utilisateur avec cet e-mail existe déjà',
      );
    }

    // Generate random 6 character alphanumeric temporary password / OTP
    const otp = Math.random().toString(36).substring(2, 8).toUpperCase();
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync(otp, salt);

    await this.dbService.execute(
      `
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `,
      [cleanEmail, passHash, fullName, role, companyId, vesselId],
    );

    await this.emailService.sendUserInvitationEmail(cleanEmail, fullName, otp);

    return {
      email: cleanEmail,
      full_name: fullName,
      role,
      tempOtp: otp,
    };
  }

  async changePassword(userId: number, newPass: string) {
    if (!newPass || newPass.length < 6) {
      throw new BadRequestException(
        'Le mot de passe doit faire au moins 6 caractères',
      );
    }

    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync(newPass, salt);

    await this.dbService.execute(
      'UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?',
      [passHash, userId],
    );

    return { success: true };
  }

  async adminResetPassword(userId: number, newPass: string) {
    if (!newPass || newPass.length < 6) {
      throw new BadRequestException(
        'Le mot de passe doit faire au moins 6 caractères',
      );
    }

    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync(newPass, salt);

    await this.dbService.execute(
      'UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?',
      [passHash, userId],
    );

    return { success: true };
  }

  async deleteUser(userId: number) {
    const user = await this.dbService.queryOne('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (user.role === 'Admin') {
      const result = await this.dbService.queryOne(
        "SELECT COUNT(*) as cnt FROM users WHERE role = 'Admin'",
      );
      const adminCount = result ? parseInt(result.cnt || '0') : 0;
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Impossible de supprimer le dernier administrateur',
        );
      }
    }

    await this.dbService.execute('DELETE FROM users WHERE id = ?', [userId]);
    return { success: true };
  }
}
