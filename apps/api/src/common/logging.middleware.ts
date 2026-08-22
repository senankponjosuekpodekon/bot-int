import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = [
  'password', 'token', 'access_token', 'refresh_token', 'secret', 'apiKey',
  'email', 'phone', 'mobile', 'ssn', 'credit_card', 'creditCard', 'cvv',
  'authorization', 'x-authorization', 'cookie', 'pin',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TOKEN_REGEX = /([a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,})/g;

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  private redactUrl(raw: string): string {
    try {
      const url = new URL(raw, 'http://localhost');
      for (const key of url.searchParams.keys()) {
        if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
          url.searchParams.set(key, '[REDACTED]');
        }
      }
      return `${url.pathname}${url.search}`;
    } catch {
      return raw;
    }
  }

  private sanitize(value: string): string {
    return value
      .replace(EMAIL_REGEX, '[EMAIL]')
      .replace(TOKEN_REGEX, '[TOKEN]');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const tenantId = (req as any).user?.tenantId ?? 'anonymous';
    const userId = (req as any).user?.sub ?? 'anonymous';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const log = {
        method: req.method,
        path: this.sanitize(this.redactUrl(req.originalUrl)),
        status: res.statusCode,
        duration,
        tenantId,
        userId,
        ip: req.ip,
      };

      if (res.statusCode >= 400) {
        this.logger.error(JSON.stringify(log));
      } else {
        this.logger.log(JSON.stringify(log));
      }
    });

    next();
  }
}
