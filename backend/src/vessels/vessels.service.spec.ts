import { Test, TestingModule } from '@nestjs/testing';
import { VesselsService } from './vessels.service';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../database/prisma.service';

describe('VesselsService', () => {
  let service: VesselsService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [VesselsService, DatabaseService, PrismaService],
    }).compile();

    service = module.get<VesselsService>(VesselsService);
    dbService = module.get<DatabaseService>(DatabaseService);
    await dbService.seedData();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get all vessels for Admin role', async () => {
    const list = await service.getAll(1, 'Admin');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].name).toBe('BABOR ALGERIEN');
  });

  it('should get zero vessels for Crew role if no user vessel is assigned', async () => {
    const list = await service.getAll(999, 'Crew');
    expect(list.length).toBe(0);
  });

  it('should insert and get vessel by ID and name', async () => {
    const vesselId = await service.insert({
      name: 'TEST VESSEL',
      imo_number: '1234567',
      flag: 'France',
      manager: 'Verital Marine Services',
    });

    expect(vesselId).toBeDefined();

    const byId = await service.getById(vesselId);
    expect(byId.name).toBe('TEST VESSEL');

    const byName = await service.getByName('TEST VESSEL');
    expect(byName.id).toBe(vesselId);
  });

  it('should delete a vessel', async () => {
    const vesselId = await service.insert({
      name: 'DELETE VESSEL',
      imo_number: '9999999',
    });

    expect(await service.getById(vesselId)).toBeDefined();

    await service.delete(vesselId);

    await expect(service.getById(vesselId)).rejects.toThrow();
  });
});
