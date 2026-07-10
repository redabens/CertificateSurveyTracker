import { DatabaseService } from '../database/database.service';
export declare class VesselsService {
    private readonly db;
    constructor(db: DatabaseService);
    getAll(userId: number, role: string): Promise<any[]>;
    getById(id: number): Promise<any>;
    getByName(name: string): Promise<any>;
    getByImo(imo: string): Promise<any>;
    insert(v: any): Promise<number>;
    updateStatus(id: number, status: string): Promise<void>;
    delete(id: number): Promise<void>;
    private sanitizeUploadPath;
    runPythonScript(args: string[]): Promise<string>;
    generateExcelExport(vesselId: number, lang: string): Promise<{
        excelPath: string;
        jsonPath: string;
        fileName: string;
    }>;
}
