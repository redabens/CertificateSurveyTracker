import { Test, TestingModule } from '@nestjs/testing';
import { ActionableService } from './actionable.service';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../database/prisma.service';

describe('ActionableService', () => {
  let service: ActionableService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionableService, DatabaseService, PrismaService],
    }).compile();

    service = module.get<ActionableService>(ActionableService);
    dbService = module.get<DatabaseService>(DatabaseService);
    await dbService.seedData();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert and fetch recommendations for a vessel', async () => {
    const actId = await service.insert({
      vessel_id: 1,
      imposed_date: '2026-03-03',
      category: 'Class Recommendation',
      report_number: 'REP-101',
      due_date: '2026-09-09',
      description: 'Test recommendation description',
    });

    expect(actId).toBeDefined();

    const items = await service.getByVessel(1);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[items.length - 1].report_number).toBe('REP-101');
  });

  it('should update actionable status', async () => {
    const actId = await service.insert({
      vessel_id: 1,
      category: 'Test status',
      description: 'Test Status Description',
    });

    // Default status in schema is 'Pending'
    await service.updateStatus(actId, 'Completed');

    const items = await service.getByVessel(1);
    const updated = items.find((x) => x.id === actId);
    expect(updated).toBeDefined();
    expect(updated.status).toBe('Completed');
  });

  it('should update actionable details', async () => {
    const actId = await service.insert({
      vessel_id: 1,
      category: 'Old Category',
      description: 'Old Description',
    });

    await service.update(actId, {
      category: 'New Category',
      description: 'New Description',
      report_number: 'REP-NEW',
    });

    const items = await service.getByVessel(1);
    const updated = items.find((x) => x.id === actId);
    expect(updated).toBeDefined();
    expect(updated.category).toBe('New Category');
    expect(updated.description).toBe('New Description');
  });

  it('should delete actionable item', async () => {
    const actId = await service.insert({
      vessel_id: 1,
      description: 'ToDelete',
    });

    let items = await service.getByVessel(1);
    expect(items.some((x) => x.id === actId)).toBe(true);

    await service.delete(actId);

    items = await service.getByVessel(1);
    expect(items.some((x) => x.id === actId)).toBe(false);
  });
});
