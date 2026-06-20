import { VesselsService } from './vessels.service';
export declare class VesselsController {
    private readonly vesselsService;
    constructor(vesselsService: VesselsService);
    getAll(req: any): Promise<any[]>;
    createManual(req: any, body: any): Promise<{
        id: number;
        name: any;
    }>;
    delete(req: any, id: string): Promise<{
        success: boolean;
    }>;
    importExcel(req: any, file: any): Promise<{
        success: boolean;
        vesselId: number;
        name: any;
    }>;
    exportExcel(req: any, id: string, res: any): Promise<void>;
    getSettings(vesselId: string): Promise<any>;
    updateSettings(req: any, vesselId: string, body: any): Promise<{
        success: boolean;
    }>;
}
