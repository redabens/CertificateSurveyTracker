import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { EmailService } from './email/email.service';
import { PrismaService } from './database/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AppController', () => {
  let appController: AppController;
  let emailService: EmailService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: EmailService,
          useValue: {
            sendManualFleetNotifications: jest
              .fn()
              .mockResolvedValue({ success: true, count: 0 }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            emailLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
    emailService = module.get<EmailService>(EmailService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('triggerNotifications', () => {
    it('should call sendManualFleetNotifications', async () => {
      const result = await appController.triggerNotifications('RED');
      expect(emailService.sendManualFleetNotifications).toHaveBeenCalledWith(
        'RED',
      );
      expect(result).toEqual({ success: true, count: 0 });
    });
  });

  describe('getEmailLogs', () => {
    it('should query and return email logs', async () => {
      const result = await appController.getEmailLogs();
      expect(prismaService.emailLog.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'desc' },
      });
      expect(result).toEqual([]);
    });
  });
});
