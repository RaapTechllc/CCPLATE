import * as Sentry from '@sentry/nextjs';

/**
 * Sentry configuration for error monitoring and performance tracking.
 * Initialize this in your app/layout.tsx or instrumentation.ts
 */

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Replay sampling
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      // Filter out common non-actionable errors
      ignoreErrors: [
        // Browser extensions
        /ResizeObserver loop limit exceeded/,
        /Non-Error promise rejection/,
        // Network errors
        /Failed to fetch/,
        /NetworkError/,
        // Common third-party errors
        /chrome-extension/,
        /moz-extension/,
      ],
      beforeSend(event) {
        // Sanitize sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
        // Filter out localhost in production
        if (process.env.NODE_ENV === 'production' && event.request?.url?.includes('localhost')) {
          return null;
        }
        return event;
      },
    });
  }
}

/**
 * Capture an error with additional context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  });
}
