import { DatabaseService } from '../database/database.service';
export declare class CertificatesService {
    private readonly db;
    constructor(db: DatabaseService);
    getByVessel(vesselId: number): any[];
    getById(id: number): any;
    insert(c: any): number;
    update(id: number, c: any): void;
    updatePdfUrl(id: number, pdfUrl: string): void;
    delete(id: number): void;
    assertCrewCanAccess(role: string, category: string, action: string): void;
}
