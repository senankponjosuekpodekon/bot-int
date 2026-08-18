import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });

  initialized = true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

export function captureException(error: unknown, context?: Record<string, any>): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
