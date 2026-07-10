"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const database_service_1 = require("../database/database.service");
const email_service_1 = require("../email/email.service");
const bcrypt = __importStar(require("bcryptjs"));
let AuthService = class AuthService {
    dbService;
    jwtService;
    emailService;
    constructor(dbService, jwtService, emailService) {
        this.dbService = dbService;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async login(email, pass) {
        const user = await this.dbService.queryOne('SELECT * FROM users WHERE email = ?', [
            email.toLowerCase().trim(),
        ]);
        if (!user) {
            throw new common_1.UnauthorizedException('Identifiants incorrects');
        }
        const isValid = bcrypt.compareSync(pass, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Identifiants incorrects');
        }
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: user.company_id,
            vessel_id: user.vessel_id,
        };
        const token = this.jwtService.sign(payload);
        return {
            token,
            user: {
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                vessel_id: user.vessel_id,
                mustChangePassword: !!user.must_change_password,
            },
        };
    }
    async getUsers() {
        return this.dbService.query('SELECT id, email, full_name, role, company_id, vessel_id, must_change_password FROM users');
    }
    async createUser(email, fullName, role, companyId, vesselId) {
        const cleanEmail = email.toLowerCase().trim();
        const existing = await this.dbService.queryOne('SELECT * FROM users WHERE email = ?', [
            cleanEmail,
        ]);
        if (existing) {
            throw new common_1.BadRequestException('Un utilisateur avec cet e-mail existe déjà');
        }
        const otp = Math.random().toString(36).substring(2, 8).toUpperCase();
        const salt = bcrypt.genSaltSync(10);
        const passHash = bcrypt.hashSync(otp, salt);
        await this.dbService.execute(`
      INSERT INTO users (email, password, full_name, role, company_id, vessel_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [cleanEmail, passHash, fullName, role, companyId, vesselId]);
        await this.emailService.sendUserInvitationEmail(cleanEmail, fullName, otp);
        return {
            email: cleanEmail,
            full_name: fullName,
            role,
            tempOtp: otp,
        };
    }
    async changePassword(userId, newPass) {
        if (!newPass || newPass.length < 6) {
            throw new common_1.BadRequestException('Le mot de passe doit faire au moins 6 caractères');
        }
        const salt = bcrypt.genSaltSync(10);
        const passHash = bcrypt.hashSync(newPass, salt);
        await this.dbService.execute('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [passHash, userId]);
        return { success: true };
    }
    async adminResetPassword(userId, newPass) {
        if (!newPass || newPass.length < 6) {
            throw new common_1.BadRequestException('Le mot de passe doit faire au moins 6 caractères');
        }
        const salt = bcrypt.genSaltSync(10);
        const passHash = bcrypt.hashSync(newPass, salt);
        await this.dbService.execute('UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?', [passHash, userId]);
        return { success: true };
    }
    async deleteUser(userId) {
        const user = await this.dbService.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            throw new common_1.BadRequestException('Utilisateur introuvable');
        }
        if (user.role === 'Admin') {
            const result = await this.dbService.queryOne("SELECT COUNT(*) as cnt FROM users WHERE role = 'Admin'");
            const adminCount = result ? parseInt(result.cnt || '0') : 0;
            if (adminCount <= 1) {
                throw new common_1.BadRequestException('Impossible de supprimer le dernier administrateur');
            }
        }
        await this.dbService.execute('DELETE FROM users WHERE id = ?', [userId]);
        return { success: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map