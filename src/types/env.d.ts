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

    /** Secret key for NextAuth.js session encryption (min 32 chars) */
    NEXTAUTH_SECRET: string;

    /** Base URL for NextAuth.js callbacks */
    NEXTAUTH_URL: string;

    // Optional OAuth variables - Google
    /** Google OAuth client ID */
    GOOGLE_CLIENT_ID?: string;

    /** Google OAuth client secret */
    GOOGLE_CLIENT_SECRET?: string;

    // Optional OAuth variables - GitHub
    /** GitHub OAuth client ID */
    GITHUB_CLIENT_ID?: string;

    /** GitHub OAuth client secret */
    GITHUB_CLIENT_SECRET?: string;

    // Node environment
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
