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

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
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

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should authenticate user with valid credentials', async () => {
    // admin@babor.com is seeded with password admin123
    const result = await service.login('admin@babor.com', 'admin123');
    expect(result).toBeDefined();
    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.email).toBe('admin@babor.com');
    expect(result.user.role).toBe('Admin');
  });

  it('should throw UnauthorizedException for non-existing user', async () => {
    await expect(
      service.login('nonexist@babor.com', 'somepass'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid password', async () => {
    await expect(service.login('admin@babor.com', 'wrongpass')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
