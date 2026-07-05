import { DatabaseService } from '../database/database.service';
export interface MailOptions {
    to: string | string[];
    subject: string;
    text: string;
    html: string;
}
export interface EmailLogMeta {
    vessel_name: string;
    certificate_name: string;
    alarm_level: string;
}
export declare class EmailTransportService {
    private readonly db;
    private readonly logger;
    private transporter;
    private readonly fromAddress;
    private readonly isMock;
    constructor(db: DatabaseService);
    private initTransporter;
    send(options: MailOptions, logMeta?: EmailLogMeta): Promise<void>;
}
