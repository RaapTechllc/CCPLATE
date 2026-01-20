/**
 * In-memory rate limiter for API routes
 */

type RateLimitEntry = {
  count: number
  resetTime: number
}

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
}

type RateLimitOptions = {
  interval?: number
  maxRequests?: number
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval reference
let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Start automatic cleanup of expired entries
 */
function startCleanup(interval: number): void {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime <= now) {
        rateLimitStore.delete(key)
      }
    }
  }, interval)

  // Prevent cleanup interval from blocking Node.js exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

/**
 * Rate limit check for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Configuration options
 * @returns Rate limit result with success status, remaining requests, and reset time
 */
export function rateLimit(
  identifier: string,
  options?: RateLimitOptions
): RateLimitResult {
  const interval = options?.interval ?? 60000 // Default: 1 minute
  const maxRequests = options?.maxRequests ?? 10 // Default: 10 requests

  // Start cleanup process on first call
  startCleanup(interval)

  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // If no entry exists or entry has expired, create new entry
  if (!entry || entry.resetTime <= now) {
    const resetTime = now + interval
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    })

    return {
      success: true,
      remaining: maxRequests - 1,
      reset: resetTime,
    }
  }

  // Entry exists and is still valid
  const remaining = maxRequests - entry.count - 1

  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
    }
  }

  // Increment count
  entry.count += 1
  rateLimitStore.set(identifier, entry)

  return {
    success: true,
    remaining: Math.max(0, remaining),
    reset: entry.resetTime,
  }
}

// Preset configurations for common use cases

/** Rate limit config for authentication endpoints (5 requests per minute) */
export const authRateLimit = { interval: 60000, maxRequests: 5 }

/** Rate limit config for general API endpoints (30 requests per minute) */
export const apiRateLimit = { interval: 60000, maxRequests: 30 }
