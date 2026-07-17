import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private mapUserToResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      company_id: user.companyId,
      vessel_id: user.vesselId,
      must_change_password: user.mustChangePassword,
    };
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
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
      companyId: user.companyId,
      vessel_id: user.vesselId,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        vessel_id: user.vesselId,
        mustChangePassword: !!user.mustChangePassword,
      },
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.mapUserToResponse(u));
  }

  async createUser(
    email: string,
    fullName: string,
    role: string,
    companyId: number,
    vesselId: number | null,
  ) {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      throw new BadRequestException(
        'Un utilisateur avec cet e-mail existe déjà',
      );
    }

    // Generate random 6 character alphanumeric temporary password / OTP
    const otp = Math.random().toString(36).substring(2, 8).toUpperCase();
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync(otp, salt);

    await this.prisma.user.create({
      data: {
        email: cleanEmail,
        password: passHash,
        fullName,
        role,
        companyId,
        vesselId,
        mustChangePassword: 1,
      },
    });

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

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: passHash,
        mustChangePassword: 0,
      },
    });

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

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: passHash,
        mustChangePassword: 1,
      },
    });

    return { success: true };
  }

  async deleteUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (user.role === 'Admin') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'Admin' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Impossible de supprimer le dernier administrateur',
        );
      }

      // Find a replacement admin for vessel notifications
      const fallbackAdmin = await this.prisma.user.findFirst({
        where: {
          role: 'Admin',
          NOT: { id: userId },
        },
      });

      if (fallbackAdmin) {
        // Find all vessel_emails matching the deleted admin's email
        const vesselEmailsToMigrate = await this.prisma.vesselEmail.findMany({
          where: { email: user.email },
        });

        for (const ve of vesselEmailsToMigrate) {
          // Check if the fallback admin is already registered on this vessel
          const alreadyExists = await this.prisma.vesselEmail.findUnique({
            where: {
              vesselId_email: {
                vesselId: ve.vesselId,
                email: fallbackAdmin.email,
              },
            },
          });

          if (alreadyExists) {
            // Delete the duplicate row
            await this.prisma.vesselEmail.delete({
              where: { id: ve.id },
            });
          } else {
            // Update to the fallback admin's email
            await this.prisma.vesselEmail.update({
              where: { id: ve.id },
              data: {
                email: fallbackAdmin.email,
                isVerified: 1, // Assume verified for admin transitions
              },
            });
          }
        }
      }
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });
    return { success: true };
  }
}
