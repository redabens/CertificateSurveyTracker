import { Test, TestingModule } from '@nestjs/testing';
import { ActionableService } from './actionable.service';
import { DatabaseService } from '../database/database.service';

describe('ActionableService', () => {
  let service: ActionableService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionableService, DatabaseService],
    }).compile();

    service = module.get<ActionableService>(ActionableService);
    dbService = module.get<DatabaseService>(DatabaseService);
    dbService.onModuleInit();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert and fetch recommendations for a vessel', () => {
    const actId = service.insert({
      vessel_id: 1,
      imposed_date: '2026-03-03',
      category: 'Class Recommendation',
      report_number: 'REP-101',
      due_date: '2026-09-09',
      description: 'Test recommendation description',
    });

    expect(actId).toBeDefined();

    const items = service.getByVessel(1);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].report_number).toBe('REP-101');
  });

  it('should update actionable status', () => {
    const actId = service.insert({
      vessel_id: 1,
      category: 'Test status',
      description: 'Test Status Description',
    });

    // Default status in schema is 'Pending'
    service.updateStatus(actId, 'Completed');

    const items = service.getByVessel(1);
    const updated = items.find((x) => x.id === actId);
    expect(updated).toBeDefined();
    expect(updated.status).toBe('Completed');
  });
});
