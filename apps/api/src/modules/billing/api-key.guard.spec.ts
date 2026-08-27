import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { MemoryRateLimitStorage, RATE_LIMIT_STORAGE } from './rate-limit.storage';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let apiKeyService: Partial<ApiKeyService>;

  const mockContext = (token: string | null): Partial<ExecutionContext> => {
    const headers: Record<string, any> = token ? { authorization: 'Bearer ' + token } : {};
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }) as any,
    } as ExecutionContext;
  };

  beforeEach(async () => {
    apiKeyService = {
      validate: jest.fn().mockImplementation((token: string) => {
        if (token === 'stia_invalid') return null;
        if (!token.startsWith('stia_')) return null;
        return Promise.resolve({ id: 'key-1', tenantId: 'tenant-1', scopes: [] });
      }),
      checkApiAccess: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: ApiKeyService, useValue: apiKeyService },
        { provide: RATE_LIMIT_STORAGE, useClass: MemoryRateLimitStorage },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  it('allows a request with a valid API key', async () => {
    const ctx = mockContext('stia_valid') as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies a request without authorization', async () => {
    const ctx = mockContext(null) as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('throws for an invalid API key', async () => {
    const ctx = mockContext('stia_invalid') as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toThrow('Invalid API key');
  });

  it('throws 429 after 100 requests in the same minute', async () => {
    const ctx = mockContext('stia_valid') as ExecutionContext;
    for (let i = 0; i < 100; i++) {
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    }
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new HttpException('API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS),
    );
  });
});
