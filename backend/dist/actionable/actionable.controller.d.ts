import { ActionableService } from './actionable.service';
import { AuditService } from '../audit/audit.service';
export declare class ActionableController {
    private readonly actionableService;
    private readonly auditService;
    constructor(actionableService: ActionableService, auditService: AuditService);
    getByVessel(vesselId: string): Promise<any[]>;
    create(req: any, vesselId: string, body: any): Promise<{
        id: number;
    }>;
    updateStatus(req: any, id: string, body: any): Promise<{
        success: boolean;
    }>;
}
