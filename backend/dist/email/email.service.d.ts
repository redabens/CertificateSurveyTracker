import { DatabaseService } from '../database/database.service';
export declare class EmailService {
    private readonly db;
    private readonly logger;
    private transporter;
    constructor(db: DatabaseService);
    private initTransporter;
    sendCertificateAlert(vessel: any, emails: string[], cert: any, prevAlarm: string): Promise<void>;
    calculateAlarmStatus(dueDateStr: string, expirationDateStr: string): string;
    performCertificateStatusCheck(): Promise<{
        checked: number;
        alerts: number;
    }>;
}
