import { Test, TestingModule } from '@nestjs/testing';
import { AlarmService } from './alarm.service';

describe('AlarmService', () => {
  let service: AlarmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlarmService],
    }).compile();

    service = module.get<AlarmService>(AlarmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculate', () => {
    it('should return N/A if no date is provided', () => {
      const status = service.calculate('', '');
      expect(status).toBe('N/A');
    });

    it('should return OVERDUE for dates in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString().substring(0, 10);

      const status = service.calculate(pastDateStr, '');
      expect(status).toBe('OVERDUE / IMMEDIATE');
    });

    it('should return RED if target date is within 30 days', () => {
      const redDate = new Date();
      redDate.setDate(redDate.getDate() + 15);
      const redDateStr = redDate.toISOString().substring(0, 10);

      const status = service.calculate(redDateStr, '');
      expect(status).toBe('RED - <1 MONTH');
    });

    it('should return YELLOW if target date is within 90 days', () => {
      const yellowDate = new Date();
      yellowDate.setDate(yellowDate.getDate() + 60);
      const yellowDateStr = yellowDate.toISOString().substring(0, 10);

      const status = service.calculate(yellowDateStr, '');
      expect(status).toBe('YELLOW - 1 TO 3 MONTHS');
    });

    it('should return GREEN if target date is within 180 days', () => {
      const greenDate = new Date();
      greenDate.setDate(greenDate.getDate() + 120);
      const greenDateStr = greenDate.toISOString().substring(0, 10);

      const status = service.calculate(greenDateStr, '');
      expect(status).toBe('GREEN - 3 TO 6 MONTHS');
    });

    it('should return MONITOR if target date is beyond 180 days', () => {
      const monitorDate = new Date();
      monitorDate.setDate(monitorDate.getDate() + 200);
      const monitorDateStr = monitorDate.toISOString().substring(0, 10);

      const status = service.calculate(monitorDateStr, '');
      expect(status).toBe('MONITOR >6 MONTHS');
    });
  });
});
