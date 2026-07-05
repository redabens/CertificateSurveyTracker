export declare class StorageService {
    private readonly logger;
    private readonly provider;
    private readonly localPdfDir;
    private readonly minioEndpoint;
    private readonly minioPort;
    private readonly minioAccessKey;
    private readonly minioSecretKey;
    private readonly minioBucket;
    private readonly minioUseSSL;
    constructor();
    save(tempPath: string, filename: string): Promise<string>;
    delete(storedKey: string): Promise<void>;
    getUrl(storedKey: string): string;
    private saveLocal;
    private deleteLocal;
    private saveMinIO;
    private deleteMinIO;
    private getMinIOClient;
    private ensureBucket;
}
