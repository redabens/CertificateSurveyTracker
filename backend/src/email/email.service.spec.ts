import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { DatabaseService } from '../database/database.service';

describe('EmailService', () => {
  let service: EmailService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService, DatabaseService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    dbService = module.get<DatabaseService>(DatabaseService);
    dbService.onModuleInit();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateAlarmStatus', () => {
    it('should return N/A if no date is provided', () => {
      const status = service.calculateAlarmStatus('', '');
      expect(status).toBe('N/A');
    });

    it('should return OVERDUE for dates in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString().substring(0, 10);

      const status = service.calculateAlarmStatus(pastDateStr, '');
      expect(status).toBe('OVERDUE / IMMEDIATE');
    });

    it('should return RED if target date is within 30 days', () => {
      const redDate = new Date();
      redDate.setDate(redDate.getDate() + 15);
      const redDateStr = redDate.toISOString().substring(0, 10);

      const status = service.calculateAlarmStatus(redDateStr, '');
      expect(status).toBe('RED - <1 MONTH');
    });

    it('should return YELLOW if target date is within 90 days', () => {
      const yellowDate = new Date();
      yellowDate.setDate(yellowDate.getDate() + 60);
      const yellowDateStr = yellowDate.toISOString().substring(0, 10);

      const status = service.calculateAlarmStatus(yellowDateStr, '');
      expect(status).toBe('YELLOW - 1 TO 3 MONTHS');
    });

    it('should return GREEN if target date is within 180 days', () => {
      const greenDate = new Date();
      greenDate.setDate(greenDate.getDate() + 120);
      const greenDateStr = greenDate.toISOString().substring(0, 10);

      const status = service.calculateAlarmStatus(greenDateStr, '');
      expect(status).toBe('GREEN - 3 TO 6 MONTHS');
    });

    it('should return MONITOR if target date is beyond 180 days', () => {
      const monitorDate = new Date();
      monitorDate.setDate(monitorDate.getDate() + 200);
      const monitorDateStr = monitorDate.toISOString().substring(0, 10);

      const status = service.calculateAlarmStatus(monitorDateStr, '');
      expect(status).toBe('MONITOR >6 MONTHS');
    });
  });

  describe('performCertificateStatusCheck', () => {
    it('should run compliance updates and insert email logs when statuses change', async () => {
      // Clear existing certificates and add test certs
      dbService.exec('DELETE FROM certificates');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // RED status
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      // Insert certificate with different previous status 'MONITOR'
      dbService
        .prepare(
          `
        INSERT INTO certificates (vessel_id, name, category, alarm_status, due_date)
        VALUES (1, 'Test Cert Alarm', 'Class', 'MONITOR >6 MONTHS', ?)
      `,
        )
        .run(futureDateStr);

      console.log(
        'VESSELS IN DB:',
        dbService.prepare('SELECT id, name FROM vessels').all(),
      );
      console.log(
        'CERTS IN DB:',
        dbService.prepare('SELECT id, name, vessel_id FROM certificates').all(),
      );

      const result = await service.performCertificateStatusCheck();
      expect(result.checked).toBe(1);
      expect(result.alerts).toBe(1); // status changed from MONITOR to RED, alert triggered

      // Verify email logs row is inserted
      const logs = dbService.prepare('SELECT * FROM email_logs').all() as any[];
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].certificate_name).toBe('Test Cert Alarm');
      expect(logs[0].alarm_level).toBe('RED - <1 MONTH');
    });
  });
});
