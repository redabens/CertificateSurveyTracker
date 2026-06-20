import { Test, TestingModule } from '@nestjs/testing';
import { ActionableController } from './actionable.controller';
import { ActionableService } from './actionable.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';

describe('ActionableController', () => {
  let controller: ActionableController;
  let service: ActionableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionableController],
      providers: [
        {
          provide: ActionableService,
          useValue: {
            getByVessel: jest.fn().mockReturnValue([]),
            insert: jest.fn().mockReturnValue(1),
            updateStatus: jest.fn(),
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

    controller = module.get<ActionableController>(ActionableController);
    service = module.get<ActionableService>(ActionableService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getByVessel', () => {
    it('should delegate to service.getByVessel', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const result = await controller.getByVessel(mockReq, '1');
      expect(service.getByVessel).toHaveBeenCalledWith(1);
      expect(result).toEqual([]);
    });

    it('should throw ForbiddenException if Crew requests for another vessel', async () => {
      const mockReq = { user: { role: 'Crew', vessel_id: 1 } };
      await expect(controller.getByVessel(mockReq, '2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('should allow Admin to insert recommendation', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const body = { description: 'Safety recommendation' };
      const result = await controller.create(mockReq, '1', body);
      expect(service.insert).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('should throw ForbiddenException for non-admin insertions', async () => {
      const mockReq = { user: { role: 'Crew' } };
      await expect(
        controller.create(mockReq, '1', { description: 'Fail' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should allow Admin to update recommendation status', async () => {
      const mockReq = { user: { role: 'Admin' } };
      const result = await controller.updateStatus(mockReq, '1', {
        status: 'Completed',
      });
      expect(service.updateStatus).toHaveBeenCalledWith(1, 'Completed');
      expect(result).toEqual({ success: true });
    });

    it('should throw ForbiddenException if non-admin attempts update', async () => {
      const mockReq = { user: { role: 'Partner' } };
      await expect(
        controller.updateStatus(mockReq, '1', { status: 'Completed' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
