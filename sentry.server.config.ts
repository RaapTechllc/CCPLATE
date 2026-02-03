/**
 * Sentry Server Configuration
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
    
    // Performance monitoring - sample rate for server
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
    
    // Server-specific integrations
    integrations: [
      // HTTP integration for outgoing requests
      Sentry.httpIntegration(),
    ],
    
    // Before send to sanitize sensitive data
    beforeSend(event) {
      // Remove sensitive headers from request
      if (event.request?.headers) {
        const headers = event.request.headers;
        delete headers['authorization'];
        delete headers['cookie'];
        delete headers['x-api-key'];
        delete headers['x-auth-token'];
      }
      
      // Remove sensitive data from user
      if (event.user) {
        delete event.user.password;
        delete event.user.accessToken;
        delete event.user.refreshToken;
      }
      
      return event;
    },
  });
  
  console.log('[Sentry Server] Initialized');
}
