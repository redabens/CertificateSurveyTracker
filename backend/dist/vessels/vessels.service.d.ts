import { DatabaseService } from '../database/database.service';
export declare class VesselsService {
    private readonly db;
    constructor(db: DatabaseService);
    getAll(userId: number, role: string): any[];
    getById(id: number): any;
    getByName(name: string): any;
    getByImo(imo: string): any;
    insert(v: any): number;
    updateStatus(id: number, status: string): void;
    delete(id: number): void;
    runPythonScript(args: string[]): Promise<string>;
    generateExcelExport(vesselId: number, lang: string): Promise<{
        excelPath: string;
        jsonPath: string;
        fileName: string;
    }>;
}
