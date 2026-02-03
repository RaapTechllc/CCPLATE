/**
 * Next.js instrumentation - runs on server startup
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { initSentry } from '@/lib/sentry';

export async function register() {
  // Initialize Sentry for error tracking and performance monitoring
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    initSentry();
  }

  // Log startup in production
  if (process.env.NODE_ENV === 'production') {
    console.log('[CCPLATE] Server instrumentation initialized');
  }
}
