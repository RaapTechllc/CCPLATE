import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Get files for the current user
export const getFiles = query({
  args: {
    mimeType: v.optional(v.string()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { mimeType, includeDeleted }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (mimeType) {
      files = files.filter((file) => file.mimeType === mimeType);
    }

    if (!includeDeleted) {
      files = files.filter((f) => !f.deletedAt);
    }

    return files;
  },
});

// Get file by ID
export const getFileById = query({
  args: {
    fileId: v.id("files"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { fileId, includeDeleted }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const file = await ctx.db.get(fileId);
    if (!file || (!includeDeleted && file.deletedAt)) {
      return null;
    }

    // Check ownership (unless admin)
    const user = await ctx.db.get(userId);
    if (file.userId !== userId && user?.role !== "ADMIN") {
      throw new Error("Forbidden: You don't have access to this file");
    }

    return file;
  },
});

// Create file metadata
export const createFile = mutation({
  args: {
    filename: v.string(),
    originalName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    url: v.string(),
    storageType: v.optional(
      v.union(v.literal("LOCAL"), v.literal("S3"), v.literal("R2"))
    ),
  },
  handler: async (
    ctx,
    { filename, originalName, mimeType, size, url, storageType }
  ) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    const fileId = await ctx.db.insert("files", {
      filename,
      originalName,
      mimeType,
      size,
      url,
      storageType: storageType ?? "LOCAL",
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(fileId);
  },
});

// Update file metadata
export const updateFile = mutation({
  args: {
    fileId: v.id("files"),
    originalName: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { fileId, originalName, url }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const file = await ctx.db.get(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Check ownership
    if (file.userId !== userId) {
      const user = await ctx.db.get(userId);
      if (user?.role !== "ADMIN") {
        throw new Error("Forbidden: You don't have access to this file");
      }
    }

    const updates: Record<string, unknown> = {};
    if (originalName !== undefined) updates.originalName = originalName;
    if (url !== undefined) updates.url = url;
    updates.updatedAt = Date.now();

    await ctx.db.patch(fileId, updates);

    return await ctx.db.get(fileId);
  },
});

// Soft delete file
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, { fileId, hardDelete }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const file = await ctx.db.get(fileId);
    if (!file || file.deletedAt) {
      throw new Error("File not found");
    }

    // Check ownership
    if (file.userId !== userId) {
      const user = await ctx.db.get(userId);
      if (user?.role !== "ADMIN") {
        throw new Error("Forbidden: You don't have access to this file");
      }
    }

    if (hardDelete) {
      await ctx.db.delete(fileId);
      return { success: true, deleted: "hard" };
    }

    await ctx.db.patch(fileId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, deleted: "soft" };
  },
});
