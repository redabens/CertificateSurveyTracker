import { DatabaseService } from '../database/database.service';
export declare class ActionableService {
    private readonly db;
    constructor(db: DatabaseService);
    getByVessel(vesselId: number): any[];
    insert(a: any): number;
    updateStatus(id: number, status: string): void;
}
