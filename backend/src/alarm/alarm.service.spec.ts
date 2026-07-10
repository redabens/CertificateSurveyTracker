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

    it('should correctly select the next upcoming date from a JSON array of 5 dates', () => {
      const today = new Date();
      const datePast = new Date(today);
      datePast.setDate(today.getDate() - 10);
      const datePastStr = datePast.toISOString().substring(0, 10);

      const dateUpcoming = new Date(today);
      dateUpcoming.setDate(today.getDate() + 15);
      const dateUpcomingStr = dateUpcoming.toISOString().substring(0, 10);

      const dateFarFuture = new Date(today);
      dateFarFuture.setDate(today.getDate() + 200);
      const dateFarFutureStr = dateFarFuture.toISOString().substring(0, 10);

      const jsonDates = JSON.stringify([
        datePastStr,
        dateUpcomingStr,
        dateFarFutureStr,
      ]);

      // The next upcoming is dateUpcoming (15 days remaining -> RED)
      const status = service.calculate(jsonDates, '');
      expect(status).toBe('RED - <1 MONTH');
    });

    it('should apply the authorized window of N months to the due date', () => {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() - 10);
      const dueDateStr = dueDate.toISOString().substring(0, 10);

      // With a window of 3 months, the deadline is in approx 80 days -> YELLOW
      const status = service.calculate(dueDateStr, '', 3);
      expect(status).toBe('YELLOW - 1 TO 3 MONTHS');
    });

    it('should handle multiple structured windows as JSON and pick the closest upcoming deadline', () => {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() - 10);
      const dueDateStr = dueDate.toISOString().substring(0, 10);

      // Window 1: standard offset of 2 months -> targetDate = today - 10d + 60d = today + 50d (YELLOW)
      // Window 2: custom date range with endDate far in the future -> targetDate = today + 200d (MONITOR)
      // Since today is before Window 1, Window 1 is the next upcoming deadline (50 days -> YELLOW)
      const windowsJson = JSON.stringify([
        {
          type: 'AS window',
          mode: 'predefined',
          offsetMonths: 2,
          startDate: '',
          endDate: '',
        },
        {
          type: 'Special renewal',
          mode: 'custom',
          offsetMonths: 0,
          startDate: '',
          endDate: new Date(today.getTime() + 200 * 24 * 3600 * 1000)
            .toISOString()
            .substring(0, 10),
        },
      ]);

      const status = service.calculate(dueDateStr, '', windowsJson);
      expect(status).toBe('YELLOW - 1 TO 3 MONTHS');
    });

    it('should fallback to the last deadline if all deadlines are in the past', () => {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() - 200);
      const dueDateStr = dueDate.toISOString().substring(0, 10);

      const windowsJson = JSON.stringify([
        {
          type: 'AS window',
          mode: 'predefined',
          offsetMonths: 1,
          startDate: '',
          endDate: '',
        },
      ]);

      // Deadline: today - 200 + 30 days = today - 170 days -> OVERDUE / IMMEDIATE
      const status = service.calculate(dueDateStr, '', windowsJson);
      expect(status).toBe('OVERDUE / IMMEDIATE');
    });
  });
});
