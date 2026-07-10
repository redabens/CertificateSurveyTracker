import { VesselsService } from './vessels.service';
import { AlarmService } from '../alarm/alarm.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
export declare class VesselsController {
    private readonly vesselsService;
    private readonly emailService;
    private readonly alarmService;
    private readonly auditService;
    constructor(vesselsService: VesselsService, emailService: EmailService, alarmService: AlarmService, auditService: AuditService);
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
    getEmails(vesselId: string): Promise<any[]>;
    addEmail(req: any, vesselId: string, body: any): Promise<{
        success: boolean;
        email: any;
        devOtp: string | undefined;
    }>;
    verifyEmail(req: any, vesselId: string, body: any): Promise<{
        success: boolean;
        message: string;
    } | {
        success: boolean;
        message?: undefined;
    }>;
    removeEmail(req: any, vesselId: string, emailFromQuery: string, body: any): Promise<{
        success: boolean;
    }>;
    triggerVesselNotifications(req: any, vesselId: string, status?: string): Promise<{
        alerts: number;
        success: boolean;
    }>;
}
