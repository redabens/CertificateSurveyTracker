import { CertificatesService } from './certificates.service';
import { AlarmService } from '../alarm/alarm.service';
import { AuditService } from '../audit/audit.service';
export declare class CertificatesController {
    private readonly certsService;
    private readonly alarmService;
    private readonly auditService;
    constructor(certsService: CertificatesService, alarmService: AlarmService, auditService: AuditService);
    getByVessel(req: any, vesselId: string): Promise<any[]>;
    create(req: any, vesselId: string, body: any): Promise<{
        id: number;
        alarm_status: import("../alarm/alarm.service").AlarmLevel;
    }>;
    update(req: any, id: string, body: any): Promise<{
        success: boolean;
        alarm_status: import("../alarm/alarm.service").AlarmLevel;
    }>;
    delete(req: any, id: string): Promise<{
        success: boolean;
    }>;
    uploadPdf(req: any, id: string, file: any): Promise<{
        success: boolean;
        pdf_url: string;
    }>;
}
