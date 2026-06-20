import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
export declare class AuthService {
    private readonly dbService;
    private readonly jwtService;
    constructor(dbService: DatabaseService, jwtService: JwtService);
    login(email: string, pass: string): Promise<{
        token: string;
        user: {
            email: any;
            full_name: any;
            role: any;
            vessel_id: any;
        };
    }>;
}
