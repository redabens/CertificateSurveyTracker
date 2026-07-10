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
    const dbName =
      process.env.DB_NAME ||
      (process.env.NODE_ENV === 'test'
        ? 'vessel_tracker_test'
        : 'vessel_tracker');

    // Build standard PostgreSQL connection URL
    let databaseUrl = process.env.DATABASE_URL;

    if (process.env.NODE_ENV === 'test') {
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
      log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error'],
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
      await this.$executeRawUnsafe(
        `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
      );
    }
  }
}
