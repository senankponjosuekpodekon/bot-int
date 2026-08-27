import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { initSentry } from './common/sentry';

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const databaseUrl = config.get<string>('DATABASE_URL');
  const dbHost = config.get<string>('DB_HOST');
  if (!databaseUrl && !dbHost) {
    throw new Error('Missing required database environment variables: DATABASE_URL or DB_HOST');
  }
  const jwtSecret = config.get<string>('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  // Security: Helmet headers with CSP
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // Security: CORS restricted to known origins
  const origins = new Set<string>(
    (config.get<string>('CORS_ORIGINS', 'http://localhost:3000') || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );
  const siteUrl = config.get<string>('NEXT_PUBLIC_SITE_URL') || config.get<string>('SITE_URL');
  if (siteUrl) origins.add(siteUrl.replace(/\/$/, ''));
  const siteDomain = config.get<string>('NEXT_PUBLIC_SITE_DOMAIN') || config.get<string>('SITE_DOMAIN') || 'agents.stiamond.net';
  if (siteDomain) origins.add(`https://${siteDomain.replace(/\/$/, '')}`);
  const allowedOrigins = Array.from(origins);

  // Per-request CORS: widget endpoints are public, everything else uses allowed origins
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cors = require('cors');
  app.use(cors((req: any, callback: any) => {
    const isWidget = req.path?.startsWith('/api/widget') || req.path?.startsWith('/widget');
    if (isWidget) {
      callback(null, {
        origin: true,
        credentials: false,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      });
    } else {
      callback(null, {
        origin: (origin: string | undefined, cb: any) => {
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          cb(new Error(`Origin ${origin} not allowed by CORS`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      });
    }
  }));

  // Security: Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api');

  // Swagger/OpenAPI — disabled in production
  const port = process.env.PORT || 3001;
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Stiamond API')
      .setDescription('Agent conversationnel IA — API documentation')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }

  // Health check endpoint
  const healthHandler = (req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.use('/health', healthHandler);
  app.use('/api/health', healthHandler);

  await app.listen(port, '::');
  logger.log(`API running on http://localhost:${port}/api`);
  logger.log(`CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();
