import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const isTest = process.env.NODE_ENV === 'test';
    if (isTest) return; // Do not automatically seed in test environments unless explicitly run

    try {
      const userCount = await this.prisma.user.count();
      if (userCount === 0) {
        await this.seedData();
      }
    } catch (e) {
      console.error('[DatabaseService] Failed to check / seed database:', e);
    }
  }

  /**
   * Seed initial mock data using Prisma ORM
   */
  async seedData() {
    console.log('[Database] Seeding initial mock data...');

    // Clear existing tables
    await this.prisma.cleanDatabase();

    // 1. Seed Companies
    await this.prisma.company.create({
      data: { id: 1, name: 'CNAN NORD', role: 'Admin' },
    });
    await this.prisma.company.create({
      data: { id: 2, name: 'Verital Marine Services', role: 'Manager' },
    });
    await this.prisma.company.create({
      data: { id: 3, name: 'Lloyds Register Algiers', role: 'Auditor' },
    });

    // 2. Seed Vessels
    await this.prisma.vessel.create({
      data: {
        id: 1,
        companyId: 1,
        name: 'BABOR ALGERIEN',
        imoNumber: '9477189',
        flag: 'Algeria',
        assetType: 'Products Tanker',
        owner: 'CNAN',
        manager: 'Verital Marine Services',
        grossTonnage: 15000,
        deadweightTonnage: 25000,
        portOfRegistry: 'Alger',
        callSign: '7TBC',
        status: 'Normal',
      },
    });

    // Seed email settings / vessel emails
    await this.prisma.vesselEmail.create({
      data: { vesselId: 1, email: 'captain@babor.com', isVerified: 1 },
    });
    await this.prisma.vesselEmail.create({
      data: { vesselId: 1, email: 'manager@babor.com', isVerified: 1 },
    });
    await this.prisma.vesselEmail.create({
      data: { vesselId: 1, email: 'notifications@babor.com', isVerified: 1 },
    });

    // 3. Seed Users with bcrypt
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const captainHash = bcrypt.hashSync('captain123', salt);
    const managerHash = bcrypt.hashSync('partner123', salt);
    const auditorHash = bcrypt.hashSync('auditor123', salt);

    // Admin: Complete fleet manager (CNAN)
    await this.prisma.user.create({
      data: {
        email: 'admin@verital.ae',
        password: adminHash,
        fullName: 'Administrateur Verital',
        role: 'Admin',
        companyId: 1,
        mustChangePassword: 0,
      },
    });

    // Crew: Captain of vessel 1
    await this.prisma.user.create({
      data: {
        email: 'captain@babor.com',
        password: captainHash,
        fullName: 'Cdt. Babor',
        role: 'Crew',
        companyId: 1,
        vesselId: 1,
        mustChangePassword: 0,
      },
    });

    // Technical Manager: Verital Marine Services (can manage fleet of CNAN)
    await this.prisma.user.create({
      data: {
        email: 'partner@babor.com',
        password: managerHash,
        fullName: 'Verital Marine Manager',
        role: 'Manager',
        companyId: 2,
        mustChangePassword: 0,
      },
    });

    // Auditor: Lloyd's Register Algiers (Auditor)
    await this.prisma.user.create({
      data: {
        email: 'auditor@babor.com',
        password: auditorHash,
        fullName: 'Inspecteur LR',
        role: 'Auditor',
        companyId: 3,
        mustChangePassword: 0,
      },
    });

    // Sync sequences for tables with manual ID insertion or auto-increment requirements
    const tables = [
      'companies',
      'vessels',
      'users',
      'certificates',
      'actionable_items',
      'email_logs',
      'audit_logs',
      'vessel_emails',
    ];
    for (const table of tables) {
      try {
        await this.prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1)) FROM "${table}";`,
        );
      } catch (err) {
        console.warn(
          `[DatabaseService] Failed to sync sequence for table ${table}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    console.log('[Database] Seed complete.');
  }

  /**
   * Compatibility query runner using raw SQL for any third-party/legacy query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { translatedSql, translatedParams } = this.translateSql(sql, params);
    return this.prisma.$queryRawUnsafe<T[]>(translatedSql, ...translatedParams);
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    const { translatedSql, translatedParams } = this.translateSql(sql, params);
    await this.prisma.$executeRawUnsafe(translatedSql, ...translatedParams);
  }

  private translateSql(
    sql: string,
    params: any[],
  ): { translatedSql: string; translatedParams: any[] } {
    let translatedSql = sql;

    // Convert ? placeholders to $1, $2, etc. for PostgreSQL raw execute
    let paramIndex = 1;
    translatedSql = translatedSql.replace(/\?/g, () => `$${paramIndex++}`);

    return {
      translatedSql,
      translatedParams: params,
    };
  }
}
