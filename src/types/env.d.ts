/**
 * Type declarations for environment variables.
 * This extends the NodeJS ProcessEnv interface to provide
 * type hints when accessing process.env directly.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // Required variables
    /** PostgreSQL connection string */
    DATABASE_URL: string;

    /** Base URL for the site */
    NEXT_PUBLIC_SITE_URL?: string;

    // Convex Auth - Google OAuth
    /** Google OAuth client ID (Convex Auth) */
    AUTH_GOOGLE_ID?: string;

    /** Google OAuth client secret (Convex Auth) */
    AUTH_GOOGLE_SECRET?: string;

    // Convex Auth - GitHub OAuth
    /** GitHub OAuth client ID (Convex Auth) */
    AUTH_GITHUB_ID?: string;

    /** GitHub OAuth client secret (Convex Auth) */
    AUTH_GITHUB_SECRET?: string;

    // Convex
    /** Convex deployment URL */
    NEXT_PUBLIC_CONVEX_URL?: string;

    // Node environment
    NODE_ENV: 'development' | 'production' | 'test';

    // Vercel Deployment
    /** Vercel API token for deployments */
    VERCEL_API_TOKEN?: string;

    /** Vercel team ID for team deployments */
    VERCEL_TEAM_ID?: string;
  }
}
