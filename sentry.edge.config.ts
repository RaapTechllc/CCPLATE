/**
 * Sentry Edge Runtime Configuration
 * For Next.js middleware and edge API routes
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
    
    // Performance monitoring for edge
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
    
    // Edge-specific: limit integrations for performance
    defaultIntegrations: false,
    integrations: [
      Sentry.captureConsoleIntegration(),
    ],
  });
  
  console.log('[Sentry Edge] Initialized');
}
