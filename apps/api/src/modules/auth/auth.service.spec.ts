import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ObjectLiteral, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { TenantsService } from '../tenants/tenants.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-secret'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { SessionService } from './session.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createRepositoryMock = <T extends ObjectLiteral>(): RepositoryMock<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: RepositoryMock<User>;
  let refreshRepo: RepositoryMock<RefreshToken>;
  let tenantsService: { findByEmail: jest.Mock; create: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let sessionService: { create: jest.Mock; remove: jest.Mock };

  beforeEach(() => {
    userRepo = createRepositoryMock<User>();
    refreshRepo = createRepositoryMock<RefreshToken>();
    tenantsService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt'),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'REFRESH_TOKEN_TTL_MINUTES') return 60 * 24;
        return defaultValue;
      }),
    };
    sessionService = {
      create: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      userRepo as unknown as Repository<User>,
      refreshRepo as unknown as Repository<RefreshToken>,
      tenantsService as unknown as TenantsService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      sessionService as unknown as SessionService,
    );

    jest.clearAllMocks();
  });

  it('registers a tenant + user and issues tokens', async () => {
    tenantsService.findByEmail.mockResolvedValue(null);
    tenantsService.create.mockResolvedValue({ id: 'tenant-1', email: 'acme@corp.io' });
    userRepo.create?.mockReturnValue({ id: 'user-1', email: 'ceo@acme.io' });
    userRepo.save?.mockResolvedValue(undefined);
    refreshRepo.create?.mockImplementation((entity: RefreshToken) => entity);
    (refreshRepo.save as jest.Mock).mockResolvedValue(undefined);

    const tokenSpy = jest
      .spyOn(service as unknown as { generateRefreshToken: () => any }, 'generateRefreshToken')
      .mockReturnValue({ tokenId: 'tid', secret: 'secret', token: 'tid.secret' });

    const result = await service.register({
      companyName: 'Acme',
      name: 'Jane',
      email: 'ceo@acme.io',
      password: 'password123',
    });

    expect(result).toEqual({
      access_token: 'signed-jwt',
      refresh_token: 'tid.secret',
      userId: 'user-1',
      tenantId: 'tenant-1',
    });
    expect(tenantsService.create).toHaveBeenCalledWith({ name: 'Acme', email: 'ceo@acme.io' });
    expect(refreshRepo.save).toHaveBeenCalled();

    tokenSpy.mockRestore();
  });

  it('throws ConflictException when email already used', async () => {
    tenantsService.findByEmail.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register({ companyName: 'Acme', name: 'Jane', email: 'ceo@acme.io', password: 'password123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws UnauthorizedException when password is invalid', async () => {
    userRepo.findOne?.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1', password: 'hashed' });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({ email: 'ceo@acme.io', password: 'wrong-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens and revokes the previous refresh token', async () => {
    const activeToken: RefreshToken = {
      id: 'db-id',
      tokenId: 'tid',
      hashedToken: 'hashed-secret',
      userId: 'user-1',
      tenantId: 'tenant-1',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      isRevoked: false,
      revokedAt: null,
      user: null,
      tenant: null,
    } as unknown as RefreshToken;

    refreshRepo.findOne?.mockResolvedValue(activeToken);
    refreshRepo.create?.mockImplementation((entity: RefreshToken) => entity);
    (refreshRepo.save as jest.Mock).mockResolvedValue(undefined);

    const tokenSpy = jest
      .spyOn(service as unknown as { generateRefreshToken: () => any }, 'generateRefreshToken')
      .mockReturnValue({ tokenId: 'new-id', secret: 'new-secret', token: 'new-id.new-secret' });

    const result = await service.refresh({ refreshToken: 'tid.secret' });

    expect(result.refresh_token).toBe('new-id.new-secret');
    expect(refreshRepo.save).toHaveBeenCalledTimes(2);
    expect(refreshRepo.save?.mock.calls[0][0].isRevoked).toBe(true);

    tokenSpy.mockRestore();
  });
});
