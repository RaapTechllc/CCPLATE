/**
 * Sentry Client Configuration
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Enable debug mode in development
    debug: process.env.NODE_ENV === 'development',
    
    // Set environment
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring - sample rate for client
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay for user experience insights (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
    
    // Before send to sanitize sensitive data
    beforeSend(event) {
      // Remove sensitive headers from request
      if (event.request?.headers) {
        const headers = event.request.headers;
        delete headers['authorization'];
        delete headers['cookie'];
        delete headers['x-api-key'];
      }
      
      // Remove sensitive query params from URL
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
  
  console.log('[Sentry Client] Initialized');
}
