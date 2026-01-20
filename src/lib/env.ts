import { z } from 'zod';

/**
 * Environment variable validation schema using Zod.
 * This ensures type-safe access to environment variables at runtime.
 */
const envSchema = z.object({
  // Required variables
  DATABASE_URL: z
    .string()
    .url({ message: 'DATABASE_URL must be a valid URL' }),

  NEXTAUTH_SECRET: z
    .string()
    .min(32, { message: 'NEXTAUTH_SECRET must be at least 32 characters for security' }),

  NEXTAUTH_URL: z
    .string()
    .url({ message: 'NEXTAUTH_URL must be a valid URL' }),

  // Optional OAuth variables - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Optional OAuth variables - GitHub
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

/**
 * Inferred type from the environment schema.
 * Use this type when you need to reference environment variables in TypeScript.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns a typed object.
 * Only runs validation on the server side (window === undefined).
 */
function validateEnv(): Env {
  // Only validate on the server
  if (typeof window !== 'undefined') {
    throw new Error(
      'Environment variables should only be accessed on the server. ' +
        'Use NEXT_PUBLIC_ prefix for client-side variables.'
    );
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  - ${field}: ${messages?.join(', ')}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${errorMessages}\n\n` +
        'Please check your .env.local file and ensure all required variables are set.'
    );
  }

  return result.data;
}

/**
 * Validated and typed environment variables.
 * Access environment variables through this object for type safety.
 *
 * @example
 * import { env } from '@/lib/env';
 *
 * // Type-safe access
 * const dbUrl = env.DATABASE_URL;
 * const googleId = env.GOOGLE_CLIENT_ID; // string | undefined
 */
export const env = validateEnv();
