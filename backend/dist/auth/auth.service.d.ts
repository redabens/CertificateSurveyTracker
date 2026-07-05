import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
export declare class AuthService {
    private readonly dbService;
    private readonly jwtService;
    private readonly emailService;
    constructor(dbService: DatabaseService, jwtService: JwtService, emailService: EmailService);
    login(email: string, pass: string): Promise<{
        token: string;
        user: {
            email: any;
            full_name: any;
            role: any;
            vessel_id: any;
            mustChangePassword: boolean;
        };
    }>;
    getUsers(): Promise<any[]>;
    createUser(email: string, fullName: string, role: string, companyId: number, vesselId: number | null): Promise<{
        email: string;
        full_name: string;
        role: string;
        tempOtp: string;
    }>;
    changePassword(userId: number, newPass: string): Promise<{
        success: boolean;
    }>;
    adminResetPassword(userId: number, newPass: string): Promise<{
        success: boolean;
    }>;
    deleteUser(userId: number): Promise<{
        success: boolean;
    }>;
}
