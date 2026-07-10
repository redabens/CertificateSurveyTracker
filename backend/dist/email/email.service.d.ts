import { DatabaseService } from '../database/database.service';
import { AlarmService } from '../alarm/alarm.service';
import { EmailTransportService } from './email-transport.service';
import { EmailTemplateService } from './email-template.service';
export declare class EmailService {
    private readonly db;
    private readonly alarmService;
    private readonly transport;
    private readonly templates;
    private readonly logger;
    constructor(db: DatabaseService, alarmService: AlarmService, transport: EmailTransportService, templates: EmailTemplateService);
    sendCertificateAlert(vessel: any, emails: string[], cert: any, prevAlarm: string): Promise<void>;
    sendOtpEmail(email: string, otp: string): Promise<void>;
    sendUserInvitationEmail(email: string, name: string, otp: string): Promise<void>;
    performCertificateStatusCheck(): Promise<{
        checked: number;
        alerts: number;
    }>;
    private matchesAlarmFilter;
    sendManualFleetNotifications(statusFilter?: string): Promise<{
        checked: number;
        alerts: number;
    }>;
    sendManualVesselNotifications(vesselId: number, statusFilter?: string): Promise<{
        alerts: number;
    }>;
}
