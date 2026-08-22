import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { GdprService } from './gdpr.service';
import { AuditAction } from './audit-log.entity';

export const AUDIT_RESOURCE = 'audit_resource';
export const AuditResource = (resource: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(AUDIT_RESOURCE, resource, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(AUDIT_RESOURCE, resource, target);
    return target;
  };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly gdprService: GdprService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = (request as any).user;
    if (!user?.tenantId) {
      return next.handle();
    }

    const resource = this.reflector.getAllAndOverride<string>(AUDIT_RESOURCE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resource) {
      return next.handle();
    }

    const action = this.methodToAction(method);
    const resourceId = this.extractResourceId(request);

    const result = await next.handle().toPromise();

    this.gdprService.logAudit(
      user.tenantId,
      action,
      resource,
      resourceId,
      user.id,
      { method, path: request.path },
      request.ip,
    ).catch(() => {});

    return result;
  }

  private methodToAction(method: string): AuditAction {
    switch (method) {
      case 'POST': return AuditAction.CREATE;
      case 'PATCH':
      case 'PUT': return AuditAction.UPDATE;
      case 'DELETE': return AuditAction.DELETE;
      default: return AuditAction.UPDATE;
    }
  }

  private extractResourceId(request: Request): string | undefined {
    const params = (request as any).params;
    return params?.id || params?.agentId || params?.leadId || undefined;
  }
}
