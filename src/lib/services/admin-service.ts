import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { DashboardStats, UserDetails, UserListQuery } from "@/types/admin";

/**
 * Admin Service
 * Handles admin-related business logic for users and dashboard statistics
 */

type UserDoc = Doc<"users">;
type UserCounts = { files: number; sessions: number };

function toUserDetails(user: UserDoc, counts?: UserCounts): UserDetails {
  const createdAt = user.createdAt ?? user._creationTime;
  const updatedAt = user.updatedAt ?? createdAt;

  const details: UserDetails = {
    id: user._id,
    name: user.name ?? null,
    email: user.email ?? "",
    emailVerified: user.emailVerificationTime
      ? new Date(user.emailVerificationTime).toISOString()
      : null,
    image: user.image ?? null,
    role: user.role ?? "USER",
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
    deletedAt: user.deletedAt ? new Date(user.deletedAt).toISOString() : null,
    lastLoginAt: user.lastLoginAt
      ? new Date(user.lastLoginAt).toISOString()
      : null,
  };

  if (counts) {
    details._count = counts;
  }

  return details;
}

/**
 * Get dashboard statistics
 * Returns user counts, file counts, and storage used
 */
export async function getDashboardStats(
  client: ConvexHttpClient
): Promise<DashboardStats> {
  return client.query(api.admin.getDashboardStats);
}

/**
 * Get paginated user list with search and filters
 */
export async function getUsers(
  client: ConvexHttpClient,
  query: UserListQuery
): Promise<{
  users: UserDetails[];
  total: number;
}> {
  const { users, total } = (await client.query(api.admin.listUsers, query)) as {
    users: Array<UserDoc & { _count: UserCounts }>;
    total: number;
  };
  const transformedUsers = users.map((user) =>
    toUserDetails(user, user._count)
  );

  return { users: transformedUsers, total };
}

/**
 * Get a single user by ID with file count
 */
export async function getUser(
  client: ConvexHttpClient,
  id: string
): Promise<UserDetails | null> {
  const result = await client.query(api.admin.getUserWithCounts, {
    userId: id,
  });

  if (!result) {
    return null;
  }

  return toUserDetails(result.user, result._count);
}

/**
 * Update a user by ID
 */
export async function updateUser(
  client: ConvexHttpClient,
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: "USER" | "ADMIN";
    image?: string | null;
  }
): Promise<UserDetails> {
  await client.mutation(api.users.updateUser, {
    userId: id,
    name: data.name,
    email: data.email,
    role: data.role,
    image: data.image ?? undefined,
  });

  const result = await client.query(api.admin.getUserWithCounts, {
    userId: id,
  });

  if (!result) {
    throw new Error("User not found");
  }

  return toUserDetails(result.user, result._count);
}

/**
 * Soft delete a user by setting deletedAt timestamp
 */
export async function deleteUser(
  client: ConvexHttpClient,
  id: string
): Promise<void> {
  await client.mutation(api.users.deleteUser, { userId: id });
}

/**
 * Restore a soft deleted user by clearing deletedAt
 */
export async function restoreUser(
  client: ConvexHttpClient,
  id: string
): Promise<UserDetails> {
  await client.mutation(api.users.restoreUser, { userId: id });

  const result = await client.query(api.admin.getUserWithCounts, {
    userId: id,
  });

  if (!result) {
    throw new Error("User not found");
  }

  return toUserDetails(result.user, result._count);
}

/**
 * Check if a user exists and is not deleted
 */
export async function userExists(
  client: ConvexHttpClient,
  id: string
): Promise<boolean> {
  const user = await client.query(api.users.getUserById, {
    userId: id,
    includeDeleted: false,
  });
  return !!user;
}

/**
 * Check if email is already in use by another user
 */
export async function emailInUse(
  client: ConvexHttpClient,
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  return client.query(api.users.emailInUse, {
    email,
    excludeUserId,
  });
}
