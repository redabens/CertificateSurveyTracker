import { DatabaseService } from '../database/database.service';
export declare class CertificatesService {
    private readonly db;
    constructor(db: DatabaseService);
    getByVessel(vesselId: number): Promise<any[]>;
    getById(id: number): Promise<any>;
    insert(c: any): Promise<number>;
    update(id: number, c: any): Promise<void>;
    updatePdfUrl(id: number, pdfUrl: string): Promise<void>;
    delete(id: number): Promise<void>;
    assertCrewCanAccess(role: string, category: string, action: string): void;
}
