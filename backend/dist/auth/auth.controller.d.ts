import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        token: string;
        user: {
            email: any;
            full_name: any;
            role: any;
            vessel_id: any;
            mustChangePassword: boolean;
        };
    }>;
    getUsers(req: any): Promise<any[]>;
    createUser(req: any, body: any): Promise<{
        email: string;
        full_name: string;
        role: string;
        tempOtp: string;
    }>;
    changePassword(req: any, body: any): Promise<{
        success: boolean;
    }>;
    adminResetPassword(req: any, id: string, body: any): Promise<{
        success: boolean;
    }>;
    deleteUser(req: any, id: string): Promise<{
        success: boolean;
    }>;
}
