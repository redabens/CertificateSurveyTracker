import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificates.service';
import { DatabaseService } from '../database/database.service';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [CertificatesService, DatabaseService],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    dbService = module.get<DatabaseService>(DatabaseService);
    dbService.onModuleInit();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should insert and fetch certificates for a vessel', () => {
    // Vessel ID 1 is seeded by default
    const certId = service.insert({
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

    const certs = service.getByVessel(1);
    expect(certs.length).toBeGreaterThanOrEqual(1);

    const cert = service.getById(certId);
    expect(cert.name).toBe('Test Class Certificate');
  });

  it('should update certificate details and PDF URL', () => {
    const certId = service.insert({
      vessel_id: 1,
      name: 'Initial Cert',
      category: 'Flag',
    });

    service.update(certId, {
      organization: 'Verital',
      issuing_date: '2026-02-02',
      expiration_date: '2028-02-02',
      due_date: '2027-02-02',
      window: '3M',
      alarm_status: 'YELLOW',
      remarks: 'Updated',
    });

    const updated = service.getById(certId);
    expect(updated.organization).toBe('Verital');
    expect(updated.alarm_status).toBe('YELLOW');

    service.updatePdfUrl(certId, '/uploads/pdf/test.pdf');
    const withPdf = service.getById(certId);
    expect(withPdf.pdf_url).toBe('/uploads/pdf/test.pdf');
  });

  it('should delete a certificate', () => {
    const certId = service.insert({
      vessel_id: 1,
      name: 'To Delete',
      category: 'Servicing',
    });

    expect(service.getById(certId)).toBeDefined();

    service.delete(certId);

    expect(service.getById(certId)).toBeUndefined();
  });
});
