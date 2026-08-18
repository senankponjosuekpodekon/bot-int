import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

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

    // Attach tenant info to request
    (request as any).user = {
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes,
    };

    return true;
  }
}
