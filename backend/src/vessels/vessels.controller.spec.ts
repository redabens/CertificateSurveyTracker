import { Test, TestingModule } from '@nestjs/testing';
import { VesselsController } from './vessels.controller';
import { VesselsService } from './vessels.service';
import { AlarmService } from '../alarm/alarm.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../database/prisma.service';

describe('VesselsController', () => {
  let controller: VesselsController;
  let service: VesselsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VesselsController],
      providers: [
        {
          provide: VesselsService,
          useValue: {
            getAll: jest.fn().mockReturnValue([]),
            insert: jest.fn().mockReturnValue(1),
            delete: jest.fn(),
            getByName: jest.fn(),
            getById: jest.fn().mockReturnValue({ id: 1, name: 'Vessel 1' }),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            certificate: {
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn(),
            },
            vesselEmail: {
              upsert: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn().mockResolvedValue({ email: '' }),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: AlarmService,
          useValue: {
            calculate: jest.fn().mockReturnValue('GREEN - 3 TO 6 MONTHS'),
            computeVesselStatus: jest.fn().mockReturnValue('Normal'),
            hasChanged: jest.fn().mockReturnValue(false),
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
        {
          provide: EmailService,
          useValue: {
            sendOtpEmail: jest.fn().mockResolvedValue(undefined),
            sendUserInvitationEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<VesselsController>(VesselsController);
    service = module.get<VesselsService>(VesselsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAll', () => {
    it('should delegate to vesselsService.getAll', async () => {
      const mockReq = { user: { id: 1, role: 'Admin', companyId: 1 } };
      await controller.getAll(mockReq);
      expect(service.getAll).toHaveBeenCalledWith(1, 'Admin');
    });
  });

  describe('createManual', () => {
    it('should allow Admin to create manually', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const body = {
        name: 'New Vessel',
        imo_number: '1234567',
        flag: 'Algeria',
        owner: 'CNAN',
      };
      const result = await controller.createManual(mockReq, body);
      expect(service.insert).toHaveBeenCalledWith(body);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if name is missing', async () => {
      const mockReq = { user: { role: 'Admin' } };
      await expect(
        controller.createManual(mockReq, {
          imo_number: '1234567',
          flag: 'Algeria',
          owner: 'CNAN',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if imo_number is missing', async () => {
      const mockReq = { user: { role: 'Admin' } };
      await expect(
        controller.createManual(mockReq, {
          name: 'New Vessel',
          flag: 'Algeria',
          owner: 'CNAN',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if flag is missing', async () => {
      const mockReq = { user: { role: 'Admin' } };
      await expect(
        controller.createManual(mockReq, {
          name: 'New Vessel',
          imo_number: '1234567',
          owner: 'CNAN',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if owner is missing', async () => {
      const mockReq = { user: { role: 'Admin' } };
      await expect(
        controller.createManual(mockReq, {
          name: 'New Vessel',
          imo_number: '1234567',
          flag: 'Algeria',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should allow Admin to delete', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const result = await controller.delete(mockReq, '1');
      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });
  });
});
