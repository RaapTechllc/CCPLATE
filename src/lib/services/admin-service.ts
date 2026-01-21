import { prisma } from "@/lib/db";
import type { DashboardStats, UserDetails, UserListQuery } from "@/types/admin";

/**
 * Admin Service
 * Handles admin-related business logic for users and dashboard statistics
 */

/**
 * Get dashboard statistics
 * Returns user counts, file counts, and storage used
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Execute all queries in parallel for performance
  const [
    totalUsers,
    newUsersThisWeek,
    newUsersThisMonth,
    activeUsers,
    totalFiles,
    storageResult,
  ] = await Promise.all([
    // Total non-deleted users
    prisma.user.count({
      where: { deletedAt: null },
    }),

    // New users in the last 7 days
    prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { gte: oneWeekAgo },
      },
    }),

    // New users in the last 30 days
    prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { gte: oneMonthAgo },
      },
    }),

    // Users who logged in within the last 7 days
    prisma.user.count({
      where: {
        deletedAt: null,
        lastLoginAt: { gte: oneWeekAgo },
      },
    }),

    // Total non-deleted files
    prisma.file.count({
      where: { deletedAt: null },
    }),

    // Total storage used (sum of file sizes)
    prisma.file.aggregate({
      where: { deletedAt: null },
      _sum: { size: true },
    }),
  ]);

  return {
    totalUsers,
    newUsersThisWeek,
    newUsersThisMonth,
    activeUsers,
    totalFiles,
    storageUsed: storageResult._sum.size ?? 0,
  };
}

/**
 * Get paginated user list with search and filters
 */
export async function getUsers(query: UserListQuery): Promise<{
  users: UserDetails[];
  total: number;
}> {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    deletedAt?: null | { not: null };
    role?: "USER" | "ADMIN";
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }>;
  } = {};

  // Filter by status (active vs deleted)
  if (status === "active") {
    where.deletedAt = null;
  } else if (status === "deleted") {
    where.deletedAt = { not: null };
  }

  // Filter by role
  if (role) {
    where.role = role;
  }

  // Search by name or email
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Execute queries in parallel
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            files: true,
            sessions: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Transform to UserDetails format with serialized dates
  const transformedUsers: UserDetails[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    _count: user._count,
  }));

  return { users: transformedUsers, total };
}

/**
 * Get a single user by ID with file count
 */
export async function getUser(id: string): Promise<UserDetails | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          files: true,
          sessions: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    _count: user._count,
  };
}

/**
 * Update a user by ID
 */
export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: "USER" | "ADMIN";
    image?: string | null;
  }
): Promise<UserDetails> {
  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          files: true,
          sessions: true,
        },
      },
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    _count: user._count,
  };
}

/**
 * Soft delete a user by setting deletedAt timestamp
 */
export async function deleteUser(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restore a soft deleted user by clearing deletedAt
 */
export async function restoreUser(id: string): Promise<UserDetails> {
  const user = await prisma.user.update({
    where: { id },
    data: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          files: true,
          sessions: true,
        },
      },
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    _count: user._count,
  };
}

/**
 * Check if a user exists and is not deleted
 */
export async function userExists(id: string): Promise<boolean> {
  const count = await prisma.user.count({
    where: { id, deletedAt: null },
  });
  return count > 0;
}

/**
 * Check if email is already in use by another user
 */
export async function emailInUse(email: string, excludeUserId?: string): Promise<boolean> {
  const where: { email: string; id?: { not: string } } = { email };
  if (excludeUserId) {
    where.id = { not: excludeUserId };
  }
  const count = await prisma.user.count({ where });
  return count > 0;
}
