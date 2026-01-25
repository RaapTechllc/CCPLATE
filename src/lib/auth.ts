/**
 * Convex Auth helpers for API routes
 *
 * This module provides authentication utilities for Next.js API routes
 * using Convex Auth's server-side functions.
 *
 * For server components, use:
 *   import { auth } from "@convex-dev/auth/nextjs/server";
 *   const { userId } = await auth();
 *
 * For client components, use:
 *   import { useConvexAuth } from "convex/react";
 *   const { isAuthenticated, isLoading } = useConvexAuth();
 */

import { ConvexHttpClient } from "convex/browser";
import {
  isAuthenticatedNextjs,
  convexAuthNextjsToken,
} from "@convex-dev/auth/nextjs/server";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

// Use Convex's generated type for users table
// Exported for use by consumers who need the user type
export type ConvexUserDoc = Doc<"users">;

/**
 * Type guard to validate that a user object from Convex has the required fields.
 * Prevents runtime errors from unsafe type casts.
 */
function isValidConvexUser(user: unknown): user is ConvexUserDoc {
  if (user === null || typeof user !== "object") {
    return false;
  }

  const obj = user as Record<string, unknown>;

  // Required fields from Convex document
  if (typeof obj._id !== "string" || obj._id.length === 0) {
    return false;
  }

  if (typeof obj._creationTime !== "number") {
    return false;
  }

  // Optional fields should be undefined or correct type
  if (obj.email !== undefined && typeof obj.email !== "string") {
    return false;
  }

  if (obj.name !== undefined && typeof obj.name !== "string") {
    return false;
  }

  if (obj.image !== undefined && typeof obj.image !== "string") {
    return false;
  }

  if (obj.role !== undefined && obj.role !== "USER" && obj.role !== "ADMIN") {
    return false;
  }

  return true;
}

/**
 * Create a new Convex HTTP client for each request.
 * IMPORTANT: Do NOT reuse clients across requests - setAuth() mutates the client,
 * which would cause race conditions and potential auth token leakage between requests.
 */
function createConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

export interface AuthResult {
  authenticated: boolean;
  user: ConvexUserDoc | null;
  token?: string;
  convex?: ConvexHttpClient;
}

export interface AdminAuthResult extends AuthResult {
  isAdmin: boolean;
}

/**
 * Require authentication for an API route.
 * Returns the authenticated user or null if not authenticated.
 *
 * @example
 * export async function GET() {
 *   const { authenticated, user } = await requireAuth();
 *   if (!authenticated || !user) {
 *     return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
 *   }
 *   // Use user._id for Convex queries
 * }
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const isAuth = await isAuthenticatedNextjs();
    if (!isAuth) {
      return { authenticated: false, user: null };
    }

    const token = await convexAuthNextjsToken();
    if (!token) {
      return { authenticated: false, user: null };
    }

    // Create a new client for this request to avoid race conditions
    const client = createConvexClient();
    client.setAuth(token);
    const user = await client.query(api.users.getCurrentUser);

    // Validate user object has required fields before returning
    if (!user || !isValidConvexUser(user)) {
      if (user) {
        console.warn("[Auth] User object failed validation:", {
          hasId: "_id" in user,
          hasCreationTime: "_creationTime" in user,
        });
      }
      return { authenticated: false, user: null };
    }

    return {
      authenticated: true,
      user,
      token,
      convex: client,
    };
  } catch (error) {
    console.error("[Auth] Error checking authentication:", error);
    return { authenticated: false, user: null };
  }
}

/**
 * Require admin authentication for an API route.
 * Returns the authenticated user and admin status.
 *
 * @example
 * export async function GET() {
 *   const { authenticated, user, isAdmin } = await requireAdmin();
 *   if (!authenticated || !user) {
 *     return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
 *   }
 *   if (!isAdmin) {
 *     return errorResponse("FORBIDDEN", "Admin access required", 403);
 *   }
 *   // Proceed with admin-only operation
 * }
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const result = await requireAuth();

  if (!result.authenticated || !result.user) {
    return { ...result, isAdmin: false };
  }

  return {
    ...result,
    isAdmin: result.user.role === "ADMIN",
  };
}

/**
 * Get authenticated Convex client for making queries/mutations.
 * Use this when you need to make multiple Convex calls in one request.
 *
 * @example
 * const { client, user } = await getAuthenticatedClient();
 * if (!client) {
 *   return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
 * }
 * const data = await client.query(api.myModule.myQuery, { userId: user._id });
 */
export async function getAuthenticatedClient(): Promise<{
  client: ConvexHttpClient | null;
  user: ConvexUserDoc | null;
}> {
  const result = await requireAuth();

  if (!result.authenticated || !result.convex) {
    return { client: null, user: null };
  }

  return { client: result.convex, user: result.user };
}

// Re-export for backward compatibility with old import patterns
export const authOptions = undefined;
