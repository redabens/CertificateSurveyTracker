import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getAll(limit?: string): Promise<any[]>;
}
