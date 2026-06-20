import { EmailService } from './email.service';
export declare class EmailScheduler {
    private readonly emailService;
    private readonly logger;
    constructor(emailService: EmailService);
    handleDailyCheck(): Promise<void>;
}
