import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

function getUserCreatedAt(user: { createdAt?: number; _creationTime: number }) {
  return user.createdAt ?? user._creationTime;
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const users = await ctx.db.query("users").collect();
    const totalUsers = users.filter((user) => !user.deletedAt).length;
    const newUsersThisWeek = users.filter(
      (user) => !user.deletedAt && getUserCreatedAt(user) >= oneWeekAgo
    ).length;
    const newUsersThisMonth = users.filter(
      (user) => !user.deletedAt && getUserCreatedAt(user) >= oneMonthAgo
    ).length;
    const activeUsers = users.filter(
      (user) => !user.deletedAt && (user.lastLoginAt ?? 0) >= oneWeekAgo
    ).length;

    const files = await ctx.db.query("files").collect();
    const activeFiles = files.filter((file) => !file.deletedAt);
    const totalFiles = activeFiles.length;
    const storageUsed = activeFiles.reduce((sum, file) => sum + file.size, 0);

    return {
      totalUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsers,
      totalFiles,
      storageUsed,
    };
  },
});

export const listUsers = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal("USER"), v.literal("ADMIN"))),
    status: v.optional(v.union(v.literal("active"), v.literal("deleted"))),
    sortBy: v.optional(
      v.union(
        v.literal("createdAt"),
        v.literal("name"),
        v.literal("email"),
        v.literal("lastLoginAt")
      )
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    const page = Math.max(1, args.page ?? 1);
    const limit = Math.min(100, Math.max(1, args.limit ?? 20));
    const sortBy = args.sortBy ?? "createdAt";
    const sortOrder = args.sortOrder ?? "desc";

    let users = await ctx.db.query("users").collect();

    if (args.status === "active") {
      users = users.filter((user) => !user.deletedAt);
    } else if (args.status === "deleted") {
      users = users.filter((user) => !!user.deletedAt);
    }

    if (args.role) {
      users = users.filter((user) => user.role === args.role);
    }

    if (args.search) {
      const search = args.search.toLowerCase();
      users = users.filter((user) => {
        const name = user.name?.toLowerCase() ?? "";
        const email = user.email?.toLowerCase() ?? "";
        return name.includes(search) || email.includes(search);
      });
    }

    users.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "createdAt") {
        comparison = getUserCreatedAt(a) - getUserCreatedAt(b);
      } else if (sortBy === "lastLoginAt") {
        comparison = (a.lastLoginAt ?? 0) - (b.lastLoginAt ?? 0);
      } else if (sortBy === "name") {
        comparison = (a.name ?? "").localeCompare(b.name ?? "");
      } else if (sortBy === "email") {
        comparison = (a.email ?? "").localeCompare(b.email ?? "");
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    const total = users.length;
    const start = (page - 1) * limit;
    const pagedUsers = users.slice(start, start + limit);

    const files = await ctx.db.query("files").collect();
    const sessions = await ctx.db.query("authSessions").collect();

    const fileCounts = new Map<string, number>();
    for (const file of files) {
      const key = file.userId.toString();
      fileCounts.set(key, (fileCounts.get(key) ?? 0) + 1);
    }

    const sessionCounts = new Map<string, number>();
    for (const session of sessions) {
      const key = session.userId.toString();
      sessionCounts.set(key, (sessionCounts.get(key) ?? 0) + 1);
    }

    const usersWithCounts = pagedUsers.map((user) => ({
      ...user,
      _count: {
        files: fileCounts.get(user._id) ?? 0,
        sessions: sessionCounts.get(user._id) ?? 0,
      },
    }));

    return { users: usersWithCounts, total };
  },
});

export const getUserWithCounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    return {
      user,
      _count: {
        files: files.length,
        sessions: sessions.length,
      },
    };
  },
});
