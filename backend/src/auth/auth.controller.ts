import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUsers(@Req() req: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent voir la liste des utilisateurs.',
      );
    }
    return this.authService.getUsers();
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  async createUser(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent créer des utilisateurs.',
      );
    }
    return this.authService.createUser(
      body.email,
      body.fullName,
      body.role,
      body.companyId,
      body.vesselId,
    );
  }

  @Post('users/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: any, @Body() body: any) {
    return this.authService.changePassword(req.user.id, body.newPassword);
  }

  @Post('users/:id/reset-password')
  @UseGuards(JwtAuthGuard)
  async adminResetPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent réinitialiser les mots de passe.',
      );
    }
    return this.authService.adminResetPassword(parseInt(id), body.newPassword);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent supprimer des utilisateurs.',
      );
    }
    return this.authService.deleteUser(parseInt(id));
  }
}
