import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { EmailService } from '../email/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let dbService: DatabaseService;
  let module: TestingModule;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        DatabaseService,
        PrismaService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOtpEmail: jest.fn().mockResolvedValue(undefined),
            sendUserInvitationEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    dbService = module.get<DatabaseService>(DatabaseService);
    await dbService.seedData(); // initialize seed data in test database
  });

  afterAll(async () => {
    delete process.env.NODE_ENV;
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should authenticate user with valid credentials', async () => {
    // admin@verital.ae is seeded with password admin123
    const result = await service.login('admin@verital.ae', 'admin123');
    expect(result).toBeDefined();
    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.email).toBe('admin@verital.ae');
    expect(result.user.role).toBe('Admin');
  });

  it('should throw UnauthorizedException for non-existing user', async () => {
    await expect(
      service.login('nonexist@verital.ae', 'somepass'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid password', async () => {
    await expect(service.login('admin@verital.ae', 'wrongpass')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
