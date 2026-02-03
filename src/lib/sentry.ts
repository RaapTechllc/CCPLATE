/**
 * Sentry configuration for CCPLATE
 * @sentry/nextjs v10.38.0+ supports Next.js 16
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry with environment-specific configuration
 */
export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error sampling
    sampleRate: 1.0,
    
    // Debug in development
    debug: process.env.NODE_ENV === 'development',
    
    // Enable release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
    
    // Before send hook to filter sensitive data
    beforeSend(event) {
      // Sanitize sensitive headers
      if (event.request?.headers) {
        const headers = event.request.headers;
        delete headers['authorization'];
        delete headers['cookie'];
        delete headers['x-api-key'];
      }
      
      // Sanitize URL query params that might contain tokens
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          url.searchParams.delete('token');
          url.searchParams.delete('api_key');
          url.searchParams.delete('key');
          event.request.url = url.toString();
        } catch {
          // Invalid URL, leave as-is
        }
      }
      
      return event;
    },
  });

  console.log('[Sentry] Initialized successfully');
}

/**
 * Capture an error with optional context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now(),
  });
}

/**
 * Start a span for performance monitoring
 * Note: In Sentry v8+, use startSpan instead of startTransaction
 */
export function startSpan(name: string, op: string) {
  return Sentry.startSpan({ name, op }, () => {});
}

/**
 * Get the current Sentry scope (for advanced usage)
 * Note: In Sentry v8+, use getCurrentScope() instead of getCurrentHub()
 */
export function getCurrentScope() {
  return Sentry.getCurrentScope();
}
