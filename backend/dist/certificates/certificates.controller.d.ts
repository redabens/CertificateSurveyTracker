import { CertificatesService } from './certificates.service';
export declare class CertificatesController {
    private readonly certsService;
    constructor(certsService: CertificatesService);
    getByVessel(req: any, vesselId: string): Promise<any[]>;
    create(req: any, vesselId: string, body: any): Promise<{
        id: number;
        alarm_status: string;
    }>;
    update(req: any, id: string, body: any): Promise<{
        success: boolean;
        alarm_status: string;
    }>;
    delete(req: any, id: string): Promise<{
        success: boolean;
    }>;
    uploadPdf(req: any, id: string, file: any): Promise<{
        success: boolean;
        pdf_url: string;
    }>;
}
