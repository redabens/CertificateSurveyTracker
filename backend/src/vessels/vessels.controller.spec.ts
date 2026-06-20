import { Test, TestingModule } from '@nestjs/testing';
import { VesselsController } from './vessels.controller';
import { VesselsService } from './vessels.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

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
            db: {
              prepare: jest.fn().mockReturnValue({
                all: jest.fn().mockReturnValue([]),
                get: jest.fn().mockReturnValue({ email1: '' }),
                run: jest.fn(),
              }),
            },
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
      const body = { name: 'New Vessel' };
      const result = await controller.createManual(mockReq, body);
      expect(service.insert).toHaveBeenCalledWith(body);
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if user is not Admin', async () => {
      const mockReq = { user: { role: 'Crew' } };
      await expect(
        controller.createManual(mockReq, { name: 'Fail' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if name is missing', async () => {
      const mockReq = { user: { role: 'Admin' } };
      await expect(controller.createManual(mockReq, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should allow Admin to delete', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const result = await controller.delete(mockReq, '1');
      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });

    it('should throw ForbiddenException for non-admin deletion', async () => {
      const mockReq = { user: { role: 'Partner' } };
      await expect(controller.delete(mockReq, '1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
