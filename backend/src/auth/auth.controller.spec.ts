import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              token: 'mock-jwt',
              user: { email: 'admin@babor.com', role: 'Admin' },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call authService login on login post request', async () => {
    const body = { email: 'admin@babor.com', password: 'password123' };
    const result = await controller.login(body);
    expect(service.login).toHaveBeenCalledWith(body.email, body.password);
    expect(result).toEqual({
      token: 'mock-jwt',
      user: { email: 'admin@babor.com', role: 'Admin' },
    });
  });
});
