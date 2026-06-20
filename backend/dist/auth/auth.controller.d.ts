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
        };
    }>;
}
