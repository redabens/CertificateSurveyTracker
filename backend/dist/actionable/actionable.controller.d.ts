import { ActionableService } from './actionable.service';
export declare class ActionableController {
    private readonly actionableService;
    constructor(actionableService: ActionableService);
    getByVessel(req: any, vesselId: string): Promise<any[]>;
    create(req: any, vesselId: string, body: any): Promise<{
        id: number;
    }>;
    updateStatus(req: any, id: string, body: any): Promise<{
        success: boolean;
    }>;
}
