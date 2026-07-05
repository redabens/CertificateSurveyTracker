import { Test, TestingModule } from '@nestjs/testing';
import { ActionableController } from './actionable.controller';
import { ActionableService } from './actionable.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';

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

    controller = module.get<ActionableController>(ActionableController);
    service = module.get<ActionableService>(ActionableService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getByVessel', () => {
    it('should delegate to service.getByVessel', async () => {
      const result = await controller.getByVessel('1');
      expect(service.getByVessel).toHaveBeenCalledWith(1);
      expect(result).toEqual([]);
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
  });
});
