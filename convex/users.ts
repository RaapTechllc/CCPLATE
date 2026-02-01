import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Get the currently authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Don't return soft-deleted users
    if (user.deletedAt) {
      return null;
    }

    return user;
  },
});

// Get user by ID (for admin or profile views)
export const getUserById = query({
  args: {
    userId: v.id("users"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, includeDeleted }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    // Get current user to check permissions
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.deletedAt) {
      throw new Error("Unauthorized");
    }

    // Authorization: only self or admin can view user details
    if (currentUserId !== userId && currentUser.role !== "ADMIN") {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user || (!includeDeleted && user.deletedAt)) {
      return null;
    }

    return user;
  },
});

// List all users (admin only)
export const listUsers = query({
  args: {
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { includeDeleted }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    let users = await ctx.db.query("users").collect();

    if (!includeDeleted) {
      users = users.filter((user) => !user.deletedAt);
    }

    return users;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { name, email, image }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (image !== undefined) updates.image = image ?? undefined;
    updates.updatedAt = Date.now();

    await ctx.db.patch(userId, updates);

    return await ctx.db.get(userId);
  },
});

// Update user role (admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
  },
  handler: async (ctx, { userId, role }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    await ctx.db.patch(userId, { role, updatedAt: Date.now() });

    return await ctx.db.get(userId);
  },
});

// Soft delete user (admin only)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    // Don't allow deleting yourself
    if (userId === currentUserId) {
      throw new Error("Cannot delete your own account");
    }

    await ctx.db.patch(userId, { deletedAt: Date.now(), updatedAt: Date.now() });

    return { success: true };
  },
});

// Record user login
export const recordLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return;
    }

    await ctx.db.patch(userId, {
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
    role: v.optional(v.union(v.literal("USER"), v.literal("ADMIN"))),
  },
  handler: async (ctx, { userId, name, email, image, role }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.deletedAt) {
      throw new Error("Unauthorized");
    }

    const isAdmin = currentUser.role === "ADMIN";
    if (!isAdmin && currentUserId !== userId) {
      throw new Error("Forbidden: You can only update your own profile");
    }

    if (role && !isAdmin) {
      throw new Error("Forbidden: Admin access required to change roles");
    }

    if (role && isAdmin && currentUserId === userId && role !== "ADMIN") {
      throw new Error("Cannot demote your own admin role");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (image !== undefined) updates.image = image ?? undefined;
    if (role !== undefined) updates.role = role;

    await ctx.db.patch(userId, updates);

    return await ctx.db.get(userId);
  },
});

export const restoreUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    await ctx.db.patch(userId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

export const emailInUse = query({
  args: {
    email: v.string(),
    excludeUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { email, excludeUserId }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const existingUsers = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .collect();

    return existingUsers.some((user) => user._id !== excludeUserId);
  },
});
