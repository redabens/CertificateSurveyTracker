import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificates.service';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../database/prisma.service';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let dbService: DatabaseService;
  let module: TestingModule;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    module = await Test.createTestingModule({
      providers: [CertificatesService, DatabaseService, PrismaService],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    dbService = module.get<DatabaseService>(DatabaseService);
    await dbService.seedData();
  });

  afterAll(async () => {
    delete process.env.NODE_ENV;
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert and fetch certificates for a vessel', async () => {
    // Vessel ID 1 is seeded by default
    const certId = await service.insert({
      vessel_id: 1,
      name: 'Test Class Certificate',
      category: 'Class',
      organization: 'Lloyds',
      issuing_date: '2026-01-01',
      expiration_date: '2027-01-01',
      due_date: '2026-12-01',
      window: 'N/A',
      alarm_status: 'NORMAL',
      remarks: 'No remarks',
    });

    expect(certId).toBeDefined();

    const certs = await service.getByVessel(1);
    expect(certs.length).toBeGreaterThanOrEqual(1);

    const cert = await service.getById(certId);
    expect(cert.name).toBe('Test Class Certificate');
  });

  it('should update certificate details and PDF URL', async () => {
    const certId = await service.insert({
      vessel_id: 1,
      name: 'Initial Cert',
      category: 'Flag',
    });

    await service.update(certId, {
      organization: 'Verital',
      issuing_date: '2026-02-02',
      expiration_date: '2028-02-02',
      due_date: '2027-02-02',
      window: '3M',
      alarm_status: 'YELLOW',
      remarks: 'Updated',
    });

    const updated = await service.getById(certId);
    expect(updated.organization).toBe('Verital');
    expect(updated.alarm_status).toBe('YELLOW');

    await service.updatePdfUrl(certId, '/uploads/pdf/test.pdf');
    const withPdf = await service.getById(certId);
    expect(withPdf.pdf_url).toBe('/uploads/pdf/test.pdf');
  });

  it('should delete a certificate', async () => {
    const certId = await service.insert({
      vessel_id: 1,
      name: 'To Delete',
      category: 'Servicing',
    });

    expect(await service.getById(certId)).toBeDefined();

    await service.delete(certId);

    expect(await service.getById(certId)).toBeNull();
  });
});
