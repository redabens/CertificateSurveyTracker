import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  const createMockContext = (
    authHeader?: string,
    tokenQuery?: string,
  ): ExecutionContext => {
    const req = {
      headers: {
        authorization: authHeader,
      },
      query: {
        token: tokenQuery,
      },
      user: null as any,
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

  it('should authorize request with a valid Bearer token in headers', () => {
    const context = createMockContext('Bearer valid-token');
    const mockUser = { id: 1, role: 'Admin', companyId: 1 };
    jest.spyOn(jwtService, 'verify').mockReturnValue(mockUser);

    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual(mockUser);
  });

  it('should authorize request with a valid token in query params if no auth header', () => {
    const context = createMockContext(undefined, 'query-token');
    const mockUser = { id: 2, role: 'Crew', companyId: 1 };
    jest.spyOn(jwtService, 'verify').mockReturnValue(mockUser);

    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('query-token');
  });

  it('should throw UnauthorizedException if no token is provided', () => {
    const context = createMockContext();
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token verification fails', () => {
    const context = createMockContext('Bearer invalid-token');
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw new Error('jwt expired');
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
