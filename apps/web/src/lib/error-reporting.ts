type ErrorContext = Record<string, unknown>;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function reportError(error: unknown, context?: ErrorContext): void {
  if (!isProduction()) {
    console.error('[Error Reporting]', error, context);
    return;
  }

  // TODO: wire Sentry / LogRocket here
  // Example: Sentry.captureException(error, { extra: context });
  console.error('[Error Reporting]', error, context);
}

export function setErrorContext(_context: ErrorContext): void {
  // TODO: set Sentry user / tags
}
