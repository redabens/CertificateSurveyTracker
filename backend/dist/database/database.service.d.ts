import { OnModuleInit } from '@nestjs/common';
export declare class DatabaseService implements OnModuleInit {
    private sqlite;
    private pool;
    useSqlite: boolean;
    onModuleInit(): Promise<void>;
    private createTables;
    private isEmptyUsers;
    private seedData;
    private migrateEmailSettings;
    prepare(sql: string): {
        all(...params: any[]): any[];
        get(...params: any[]): any;
        run(...params: any[]): any;
    };
    exec(sql: string): void;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
    execute(sql: string, params?: any[]): Promise<void>;
    private translateSqlToSqlite;
    private translateSqlToPostgres;
}
