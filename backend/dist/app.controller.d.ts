import { EmailService } from './email/email.service';
import { DatabaseService } from './database/database.service';
export declare class AppController {
    private readonly emailService;
    private readonly db;
    constructor(emailService: EmailService, db: DatabaseService);
    triggerNotifications(): Promise<{
        checked: number;
        alerts: number;
    }>;
    getEmailLogs(): Promise<Record<string, import("node:sqlite").SQLOutputValue>[]>;
}
