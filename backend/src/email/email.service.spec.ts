import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { AlarmService } from '../alarm/alarm.service';
import { EmailTransportService } from './email-transport.service';
import { EmailTemplateService } from './email-template.service';
import { DatabaseService } from '../database/database.service';

describe('EmailService', () => {
  let service: EmailService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        DatabaseService,
        AlarmService,
        {
          provide: EmailTransportService,
          useValue: {
            send: jest.fn().mockImplementation(async (options, logMeta) => {
              if (logMeta) {
                const toStr = Array.isArray(options.to)
                  ? options.to.join(', ')
                  : options.to;
                // Insérer dans email_logs comme le vrai transporteur
                await dbService.execute(
                  `INSERT INTO email_logs (vessel_name, certificate_name, alarm_level, sent_to, sent_at)
                   VALUES (?, ?, ?, ?, ?)`,
                  [
                    logMeta.vessel_name,
                    logMeta.certificate_name,
                    logMeta.alarm_level,
                    toStr,
                    new Date().toISOString().substring(0, 10),
                  ],
                );
              }
            }),
          },
        },
        {
          provide: EmailTemplateService,
          useValue: {
            buildCertificateAlert: jest.fn().mockReturnValue({
              subject: 'Test Subject',
              text: 'Test Text',
              html: '<h1>Test HTML</h1>',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    dbService = module.get<DatabaseService>(DatabaseService);
    await dbService.onModuleInit();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('performCertificateStatusCheck', () => {
    it('should run compliance updates and insert email logs when statuses change', async () => {
      // Clear existing certificates and add test certs
      await dbService.execute('DELETE FROM certificates');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // RED status
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      // Insert certificate with different previous status 'MONITOR'
      await dbService.execute(
        `
        INSERT INTO certificates (vessel_id, name, category, alarm_status, due_date)
        VALUES (1, 'Test Cert Alarm', 'Class', 'MONITOR >6 MONTHS', ?)
      `,
        [futureDateStr],
      );

      const result = await service.performCertificateStatusCheck();
      expect(result.checked).toBe(1);
      expect(result.alerts).toBe(1); // status changed from MONITOR to RED, alert triggered

      // Verify email logs row is inserted
      const logs = await dbService.query('SELECT * FROM email_logs');
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].certificate_name).toBe('Test Cert Alarm');
      expect(logs[0].alarm_level).toBe('RED - <1 MONTH');
    });
  });

  describe('sendManualFleetNotifications', () => {
    it('should send alerts for warning states regardless of previous state', async () => {
      await dbService.execute('DELETE FROM certificates');
      await dbService.execute('DELETE FROM email_logs');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // RED status
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      // Insert certificate with RED state already saved in DB
      await dbService.execute(
        `
        INSERT INTO certificates (vessel_id, name, category, alarm_status, due_date)
        VALUES (1, 'Manual Cert', 'Class', 'RED - <1 MONTH', ?)
      `,
        [futureDateStr],
      );

      // performCertificateStatusCheck would send 0 alerts because state did not change
      const autoResult = await service.performCertificateStatusCheck();
      expect(autoResult.alerts).toBe(0);

      // sendManualFleetNotifications should force send 1 alert
      const manualResult = await service.sendManualFleetNotifications();
      expect(manualResult.alerts).toBe(1);

      // Verify email logs row is inserted
      const logs = await dbService.query('SELECT * FROM email_logs');
      expect(logs.length).toBe(1);
    });
  });
});
