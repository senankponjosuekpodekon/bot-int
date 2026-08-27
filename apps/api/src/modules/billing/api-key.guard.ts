import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { RateLimitStorage, RATE_LIMIT_STORAGE } from './rate-limit.storage';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly rateLimit = 100;
  private readonly windowMs = 60 * 1000;

  constructor(
    private readonly apiKeyService: ApiKeyService,
    @Inject(RATE_LIMIT_STORAGE) private readonly rateLimitStorage: RateLimitStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) return false;

    // Support: Authorization: Bearer stia_xxx
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token?.startsWith('stia_')) return false;

    const apiKey = await this.apiKeyService.validate(token);
    if (!apiKey) throw new UnauthorizedException('Invalid API key');

    const hasAccess = await this.apiKeyService.checkApiAccess(apiKey.tenantId);
    if (!hasAccess) throw new UnauthorizedException('API access requires Growth plan or higher');

    const allowed = await this.rateLimitStorage.isAllowed(apiKey.id, this.rateLimit, this.windowMs);
    if (!allowed) {
      throw new HttpException('API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Attach tenant info to request
    (request as any).user = {
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes,
    };

    return true;
  }
}
