import { Test, TestingModule } from '@nestjs/testing';
import { EmailScheduler } from './email.scheduler';
import { EmailService } from './email.service';

describe('EmailScheduler', () => {
  let scheduler: EmailScheduler;
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailScheduler,
        {
          provide: EmailService,
          useValue: {
            performCertificateStatusCheck: jest
              .fn()
              .mockResolvedValue({ checked: 5, alerts: 1 }),
          },
        },
      ],
    }).compile();

    scheduler = module.get<EmailScheduler>(EmailScheduler);
    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  it('should call performCertificateStatusCheck inside handleDailyCheck', async () => {
    await scheduler.handleDailyCheck();
    expect(service.performCertificateStatusCheck).toHaveBeenCalled();
  });

  it('should catch errors and log them inside handleDailyCheck', async () => {
    jest
      .spyOn(service, 'performCertificateStatusCheck')
      .mockRejectedValue(new Error('SMTP connection timed out'));
    const logSpy = jest
      .spyOn(scheduler['logger'], 'error')
      .mockImplementation(() => {});

    await scheduler.handleDailyCheck();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to run daily certificate compliance check: SMTP connection timed out',
      ),
    );
  });
});
