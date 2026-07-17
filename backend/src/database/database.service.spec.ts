import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { PrismaService } from './prisma.service';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let module: TestingModule;

  beforeAll(async () => {
    // Set NODE_ENV to test to force DatabaseService to run in-memory
    process.env.NODE_ENV = 'test';

    module = await Test.createTestingModule({
      providers: [DatabaseService, PrismaService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    // Explicitly call lifecycle hook for testing
    await service.seedData();
  });

  afterAll(async () => {
    delete process.env.NODE_ENV;
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize SQLite tables and seed data', async () => {
    // Check seeded companies
    const companies = await service.query('SELECT * FROM companies');
    expect(companies.length).toBeGreaterThanOrEqual(3);
    expect(companies[0].name).toBe('CNAN NORD');

    // Check seeded vessels
    const vessels = await service.query('SELECT * FROM vessels');
    expect(vessels.length).toBeGreaterThanOrEqual(1);
    expect(vessels[0].name).toBe('BABOR ALGERIEN');

    // Check seeded users
    const users = await service.query('SELECT * FROM users');
    expect(users.length).toBeGreaterThanOrEqual(4);
    expect(users.find((u) => u.email === 'admin@verital.ae')).toBeDefined();
  });

  it('should allow executing queries via exec and prepare wrappers', async () => {
    await service.execute('DROP TABLE IF EXISTS test_table');
    await service.execute('CREATE TABLE test_table (id INTEGER, val TEXT)');
    await service.execute('INSERT INTO test_table (id, val) VALUES (?, ?)', [
      10,
      'hello',
    ]);

    const result = await service.queryOne(
      'SELECT * FROM test_table WHERE id = ?',
      [10],
    );
    expect(result).toBeDefined();
    expect(result.val).toBe('hello');
    await service.execute('DROP TABLE IF EXISTS test_table');
  });
});
