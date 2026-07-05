import { Test, TestingModule } from '@nestjs/testing';
import { CrewVesselGuard } from './crew-vessel.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('CrewVesselGuard', () => {
  let guard: CrewVesselGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrewVesselGuard],
    }).compile();

    guard = module.get<CrewVesselGuard>(CrewVesselGuard);
  });

  const createMockContext = (user: any, params: any): ExecutionContext => {
    const req = {
      user,
      params,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow Admin user to access any vessel', () => {
    const context = createMockContext({ role: 'Admin' }, { vesselId: '2' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Crew user to access their assigned vessel', () => {
    const context = createMockContext(
      { role: 'Crew', vessel_id: 1 },
      { vesselId: '1' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if Crew user accesses a different vessel', () => {
    const context = createMockContext(
      { role: 'Crew', vessel_id: 1 },
      { vesselId: '2' },
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should fall back to id param if vesselId param is missing', () => {
    const context = createMockContext(
      { role: 'Crew', vessel_id: 1 },
      { id: '1' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});
