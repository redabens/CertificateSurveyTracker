import { DatabaseService } from '../database/database.service';
export declare class ActionableService {
    private readonly db;
    constructor(db: DatabaseService);
    getByVessel(vesselId: number): Promise<any[]>;
    insert(a: any): Promise<number>;
    updateStatus(id: number, status: string): Promise<void>;
}
