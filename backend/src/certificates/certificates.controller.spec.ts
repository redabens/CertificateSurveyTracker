import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { AlarmService } from '../alarm/alarm.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';

describe('CertificatesController', () => {
  let controller: CertificatesController;
  let service: CertificatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificatesController],
      providers: [
        {
          provide: CertificatesService,
          useValue: {
            getByVessel: jest.fn().mockReturnValue([]),
            getById: jest.fn(),
            insert: jest.fn().mockReturnValue(1),
            update: jest.fn(),
            delete: jest.fn(),
            updatePdfUrl: jest.fn(),
            assertCrewCanAccess: jest
              .fn()
              .mockImplementation((role, category) => {
                if (role === 'Crew' && category !== 'Servicing') {
                  throw new ForbiddenException();
                }
              }),
          },
        },
        {
          provide: AlarmService,
          useValue: {
            calculate: jest.fn().mockReturnValue('GREEN - 3 TO 6 MONTHS'),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
    service = module.get<CertificatesService>(CertificatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getByVessel', () => {
    it('should allow Admin to fetch certificates', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const result = await controller.getByVessel(mockReq, '1');
      expect(service.getByVessel).toHaveBeenCalledWith(1);
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should allow Admin to create any certificate', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const body = { name: 'Safety Certificate', category: 'Class' };
      const result = await controller.create(mockReq, '1', body);
      expect(service.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if Crew creates Class category certificate', async () => {
      const mockReq = { user: { role: 'Crew', vessel_id: 1 } };
      const body = { name: 'Class Cert', category: 'Class' };
      await expect(controller.create(mockReq, '1', body)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should allow Admin to update and return status', async () => {
      const mockReq = { user: { role: 'Admin' } };
      jest
        .spyOn(service, 'getById')
        .mockReturnValue({ id: 1, category: 'Class' });

      const result = await controller.update(mockReq, '1', {
        due_date: '2026-10-10',
      });
      expect(service.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if Crew attempts to update Class certificate', async () => {
      const mockReq = { user: { role: 'Crew', vessel_id: 1 } };
      jest
        .spyOn(service, 'getById')
        .mockReturnValue({ id: 1, category: 'Class' });

      await expect(
        controller.update(mockReq, '1', { name: 'Class Edit' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should only allow Admin to delete', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const result = await controller.delete(mockReq, '1');
      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });
  });
});
