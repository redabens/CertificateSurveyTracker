import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'root';
    const dbName = process.env.DB_NAME || 'vessel_tracker';

    // Build standard PostgreSQL connection URL
    let databaseUrl = process.env.DATABASE_URL;

    // Detect if we are executing tests (Jest environment)
    const isRunningTests =
      process.env.JEST_WORKER_ID !== undefined ||
      process.env.NODE_ENV === 'test';

    if (isRunningTests) {
      // Always force test database for unit/integration tests to prevent clearing dev DB
      databaseUrl = `postgresql://${user}:${password}@${host}:${port}/vessel_tracker_test`;
    } else if (!databaseUrl) {
      databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
    }

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: isRunningTests ? [] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Helper to clean database tables (useful for unit tests reset)
   */
  async cleanDatabase() {
    const tableNames = [
      'vessel_emails',
      'email_logs',
      'audit_logs',
      'actionable_items',
      'certificates',
      'users',
      'vessels',
      'companies',
    ];

    for (const tableName of tableNames) {
      if (tableName === 'vessel_emails') {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
      } else {
        await this.$executeRawUnsafe(
          `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
        );
      }
    }
  }
}
