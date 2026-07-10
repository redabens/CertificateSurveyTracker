import { DatabaseService } from '../database/database.service';
export type AuditAction = 'IMPORT_VESSEL' | 'CREATE_VESSEL' | 'DELETE_VESSEL' | 'CREATE_CERTIFICATE' | 'UPDATE_CERTIFICATE' | 'DELETE_CERTIFICATE' | 'UPLOAD_PDF' | 'CREATE_ACTIONABLE' | 'UPDATE_ACTIONABLE_STATUS' | 'CREATE_USER' | 'DELETE_USER' | 'RESET_PASSWORD' | 'ADD_VESSEL_EMAIL' | 'REMOVE_VESSEL_EMAIL' | 'TRIGGER_MANUAL_NOTIFICATION';
export type AuditTargetType = 'vessel' | 'certificate' | 'actionable_item' | 'user' | 'email';
export interface AuditLogEntry {
    user_id: number;
    user_email: string;
    action: AuditAction;
    target_type: AuditTargetType;
    target_id?: number;
    target_name?: string;
    changes?: Record<string, {
        from: unknown;
        to: unknown;
    }>;
}
export declare class AuditService {
    private readonly db;
    constructor(db: DatabaseService);
    log(entry: AuditLogEntry): Promise<void>;
    getAll(limit?: number): Promise<any[]>;
}
