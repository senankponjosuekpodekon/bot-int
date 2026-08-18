import * as Sentry from '@sentry/nextjs';

type ErrorContext = Record<string, unknown>;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function reportError(error: unknown, context?: ErrorContext): void {
  if (!isProduction()) {
    console.error('[Error Reporting]', error, context);
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
  console.error('[Error Reporting]', error, context);
}

export function setErrorContext(context: ErrorContext): void {
  if (!isProduction()) return;
  Sentry.setContext('app', context);
}
