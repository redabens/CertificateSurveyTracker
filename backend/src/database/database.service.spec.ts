import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    // Set NODE_ENV to test to force DatabaseService to run in-memory
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    // Explicitly call lifecycle hook for testing
    service.onModuleInit();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize SQLite tables and seed data', () => {
    // Check seeded companies
    const companies = service.prepare('SELECT * FROM companies').all() as any[];
    expect(companies.length).toBeGreaterThanOrEqual(3);
    expect(companies[0].name).toBe('CNAN NORD');

    // Check seeded vessels
    const vessels = service.prepare('SELECT * FROM vessels').all() as any[];
    expect(vessels.length).toBeGreaterThanOrEqual(1);
    expect(vessels[0].name).toBe('BABOR ALGERIEN');

    // Check seeded users
    const users = service.prepare('SELECT * FROM users').all() as any[];
    expect(users.length).toBeGreaterThanOrEqual(4);
    expect(users.find((u) => u.email === 'admin@babor.com')).toBeDefined();
  });

  it('should allow executing queries via exec and prepare wrappers', () => {
    service.exec('CREATE TABLE test_table (id INTEGER, val TEXT)');
    service
      .prepare('INSERT INTO test_table (id, val) VALUES (?, ?)')
      .run(10, 'hello');

    const result = service
      .prepare('SELECT * FROM test_table WHERE id = ?')
      .get(10) as any;
    expect(result).toBeDefined();
    expect(result.val).toBe('hello');
  });
});
