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
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
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
    if (!user || user.deletedAt) {
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
    image: v.optional(v.string()),
  },
  handler: async (ctx, { name, image }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (image !== undefined) updates.image = image;

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

    await ctx.db.patch(userId, { role });

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

    await ctx.db.patch(userId, { deletedAt: Date.now() });

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

    await ctx.db.patch(userId, { lastLoginAt: Date.now() });
  },
});
