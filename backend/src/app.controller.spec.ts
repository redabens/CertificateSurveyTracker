import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { EmailService } from './email/email.service';
import { DatabaseService } from './database/database.service';
import { JwtService } from '@nestjs/jwt';

describe('AppController', () => {
  let appController: AppController;
  let emailService: EmailService;
  let databaseService: DatabaseService;

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
          provide: DatabaseService,
          useValue: {
            prepare: jest.fn().mockReturnValue({
              all: jest.fn().mockReturnValue([]),
            }),
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
    databaseService = module.get<DatabaseService>(DatabaseService);
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
      expect(databaseService.prepare).toHaveBeenCalledWith(
        'SELECT * FROM email_logs ORDER BY id DESC',
      );
      expect(result).toEqual([]);
    });
  });
});
