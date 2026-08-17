import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const tenantId = (req as any).user?.tenantId ?? 'anonymous';
    const userId = (req as any).user?.sub ?? 'anonymous';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const log = {
        method: req.method,
        path: req.originalUrl,
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
