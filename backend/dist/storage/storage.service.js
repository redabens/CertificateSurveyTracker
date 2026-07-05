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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let StorageService = StorageService_1 = class StorageService {
    logger = new common_1.Logger(StorageService_1.name);
    provider;
    localPdfDir;
    minioEndpoint;
    minioPort;
    minioAccessKey;
    minioSecretKey;
    minioBucket;
    minioUseSSL;
    constructor() {
        this.provider =
            process.env.STORAGE_PROVIDER || 'local';
        this.localPdfDir = path.resolve(process.cwd(), 'uploads', 'pdf');
        this.minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
        this.minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
        this.minioAccessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
        this.minioSecretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
        this.minioBucket = process.env.MINIO_BUCKET || 'certificates';
        this.minioUseSSL = process.env.MINIO_USE_SSL === 'true';
        if (this.provider === 'local') {
            fs.mkdirSync(this.localPdfDir, { recursive: true });
            this.logger.log('Stockage: LOCAL filesystem');
        }
        else {
            this.logger.log(`Stockage: MinIO (${this.minioEndpoint}:${this.minioPort}, bucket: ${this.minioBucket})`);
        }
    }
    async save(tempPath, filename) {
        if (this.provider === 'local') {
            return this.saveLocal(tempPath, filename);
        }
        return this.saveMinIO(tempPath, filename);
    }
    async delete(storedKey) {
        if (this.provider === 'local') {
            this.deleteLocal(storedKey);
        }
        else {
            await this.deleteMinIO(storedKey);
        }
    }
    getUrl(storedKey) {
        if (this.provider === 'local') {
            return storedKey;
        }
        const protocol = this.minioUseSSL ? 'https' : 'http';
        return `${protocol}://${this.minioEndpoint}:${this.minioPort}/${this.minioBucket}/${storedKey}`;
    }
    saveLocal(tempPath, filename) {
        const dest = path.join(this.localPdfDir, filename);
        fs.renameSync(tempPath, dest);
        return `/uploads/pdf/${filename}`;
    }
    deleteLocal(storedKey) {
        const filePath = path.resolve(process.cwd(), storedKey.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    async saveMinIO(tempPath, filename) {
        const client = await this.getMinIOClient();
        await this.ensureBucket(client);
        await client.fPutObject(this.minioBucket, filename, tempPath, {
            'Content-Type': 'application/pdf',
        });
        if (fs.existsSync(tempPath))
            fs.unlinkSync(tempPath);
        return filename;
    }
    async deleteMinIO(objectKey) {
        const client = await this.getMinIOClient();
        await client.removeObject(this.minioBucket, objectKey);
    }
    async getMinIOClient() {
        const { Client } = await import('minio').catch(() => {
            throw new Error('SDK MinIO non installé. Exécuter: npm install minio dans le répertoire backend.');
        });
        return new Client({
            endPoint: this.minioEndpoint,
            port: this.minioPort,
            useSSL: this.minioUseSSL,
            accessKey: this.minioAccessKey,
            secretKey: this.minioSecretKey,
        });
    }
    async ensureBucket(client) {
        const exists = await client.bucketExists(this.minioBucket);
        if (!exists) {
            await client.makeBucket(this.minioBucket, 'us-east-1');
            this.logger.log(`Bucket MinIO créé: ${this.minioBucket}`);
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);
//# sourceMappingURL=storage.service.js.map