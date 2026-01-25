// Auth types for Convex Auth (OAuth only)
// Note: Password-based auth schemas removed - using OAuth providers only

// User role type
export type UserRole = "USER" | "ADMIN";

// Auth response types
export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Session user type (compatible with Convex user structure)
export interface SessionUser {
  _id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}

// Convex user document type
export interface ConvexUser {
  _id: string;
  _creationTime: number;
  name?: string;
  email?: string;
  image?: string;
  role: UserRole;
  emailVerified?: boolean;
  lastLoginAt?: number;
  deletedAt?: number | null;
}
