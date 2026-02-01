/**
 * Sentry configuration stub.
 * TODO: Re-enable when @sentry/nextjs supports Next.js 16
 * @see https://github.com/getsentry/sentry-javascript/issues
 */

export function initSentry() {
  // Disabled - Sentry doesn't support Next.js 16 yet
  console.log('[Sentry] Disabled - waiting for Next.js 16 support');
}

/**
 * Capture an error (no-op when Sentry disabled)
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[Sentry stub] Error captured:', error.message, context);
}

/**
 * Set user context (no-op when Sentry disabled)
 */
export function setUser(_user: { id: string; email?: string; username?: string } | null) {
  // No-op
}

/**
 * Add breadcrumb (no-op when Sentry disabled)
 */
export function addBreadcrumb(
  _message: string,
  _category?: string,
  _level: 'info' | 'warning' | 'error' = 'info'
) {
  // No-op
}
