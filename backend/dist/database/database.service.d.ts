import { OnModuleInit } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
export declare class DatabaseService implements OnModuleInit {
    db: DatabaseSync;
    onModuleInit(): void;
    private createTables;
    private isEmptyUsers;
    private seedData;
    prepare(sql: string): import("node:sqlite").StatementSync;
    exec(sql: string): void;
}
