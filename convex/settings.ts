import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Get all settings (optionally by category)
export const getSettings = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, { category }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Settings require admin access
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    if (category) {
      return await ctx.db
        .query("systemSettings")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    }

    return await ctx.db.query("systemSettings").collect();
  },
});

// Get setting by key
export const getSettingByKey = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    return setting;
  },
});

// Create or update setting (admin only)
export const upsertSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    type: v.optional(
      v.union(
        v.literal("STRING"),
        v.literal("NUMBER"),
        v.literal("BOOLEAN"),
        v.literal("JSON")
      )
    ),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { key, value, type, category }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    // Check if setting exists
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        value,
        ...(type && { type }),
        ...(category && { category }),
      });
      return await ctx.db.get(existing._id);
    } else {
      // Create new
      const id = await ctx.db.insert("systemSettings", {
        key,
        value,
        type: type ?? "STRING",
        category: category ?? "general",
      });
      return await ctx.db.get(id);
    }
  },
});

// Delete setting (admin only)
export const deleteSetting = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (setting) {
      await ctx.db.delete(setting._id);
    }

    return { success: true };
  },
});
